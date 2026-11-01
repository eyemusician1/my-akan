import {expect, it} from '@jest/globals';
import {
  analyzeBudget,
  getBudgetInsight,
  getBudgetWindow,
} from '../src/features/finance/domain/budgetAnalysis';
import {parseAmount} from '../src/features/finance/domain/money';
import {
  BudgetSettings,
  DEFAULT_BUDGET,
  ExpenseRecord,
} from '../src/features/finance/domain/types';

const monday = new Date(2026, 10, 2, 12);
const settings: BudgetSettings = {...DEFAULT_BUDGET, amount: 700};
const expense = (
  amount: number,
  createdAt = monday,
  category = 'food',
): ExpenseRecord => ({amount, createdAt, category});

it('uses local Monday–Sunday weeks, including Sunday as the final day', () => {
  expect(getBudgetWindow('weekly', monday)).toMatchObject({
    start: new Date(2026, 10, 2),
    end: new Date(2026, 10, 9),
    totalDays: 7,
    daysElapsed: 1,
    daysRemaining: 7,
  });
  expect(
    getBudgetWindow('weekly', new Date(2026, 10, 1, 23, 59)),
  ).toMatchObject({
    start: new Date(2026, 9, 26),
    end: new Date(2026, 10, 2),
    daysElapsed: 7,
    daysRemaining: 1,
  });
});

it('handles leap years, month ends, and year rollover as calendar periods', () => {
  expect(getBudgetWindow('monthly', new Date(2028, 1, 29))).toMatchObject({
    totalDays: 29,
    daysElapsed: 29,
    daysRemaining: 1,
  });
  expect(getBudgetWindow('monthly', new Date(2027, 1, 1))).toMatchObject({
    totalDays: 28,
    daysRemaining: 28,
  });
  expect(getBudgetWindow('monthly', new Date(2026, 11, 31))).toMatchObject({
    end: new Date(2027, 0, 1),
    daysRemaining: 1,
  });
  expect(
    getBudgetWindow('daily', new Date(2026, 11, 31, 23, 59)),
  ).toMatchObject({end: new Date(2027, 0, 1), totalDays: 1});
});

it('counts only current-period recorded spending, excluding previous periods and future records', () => {
  const analysis = analyzeBudget(
    [
      expense(100),
      expense(999, new Date(2026, 10, 1, 23, 59)),
      expense(500, new Date(2026, 10, 3)),
      expense(50, new Date(2026, 10, 2, 13)),
      expense(50, new Date('invalid')),
      expense(NaN),
      expense(Infinity),
    ],
    [],
    settings,
    monday,
  );
  expect(analysis.totalSpent).toBe(100);
  expect(analysis.periodExpenses).toHaveLength(1);
  expect(analysis.safeToSpend).toBe(85.71);
});

it('resets daily and monthly totals at their exact boundaries without deleting history', () => {
  const records = [
    expense(10, new Date(2026, 9, 31, 23, 59)),
    expense(20, new Date(2026, 10, 1)),
    expense(30),
  ];
  expect(
    analyzeBudget(records, [], {...settings, period: 'daily'}, monday)
      .totalSpent,
  ).toBe(30);
  expect(
    analyzeBudget(records, [], {...settings, period: 'monthly'}, monday)
      .totalSpent,
  ).toBe(50);
  expect(records).toHaveLength(3);
});

it('reserves unpaid fees only when enabled and releases the reserve when paid', () => {
  const dues = [
    {amount: 200, isPaid: false},
    {amount: 500, isPaid: true},
  ];
  const reserved = analyzeBudget(
    [expense(100)],
    dues,
    {...settings, reserveDues: true},
    monday,
  );
  expect(reserved).toMatchObject({
    totalSpent: 100,
    pendingDues: 200,
    reservedDues: 200,
    safeToSpend: 57.14,
  });
  expect(
    analyzeBudget([expense(100)], dues, settings, monday).safeToSpend,
  ).toBe(85.71);
  expect(
    analyzeBudget(
      [expense(100)],
      [{amount: 200, isPaid: true}],
      {...settings, reserveDues: true},
      monday,
    ).safeToSpend,
  ).toBe(85.71);
});

it('never shows a negative daily allowance and distinguishes overspending from fee shortfalls', () => {
  const overspent = analyzeBudget([expense(800)], [], settings, monday);
  expect(overspent).toMatchObject({safeToSpend: 0, overBudget: 100});
  expect(getBudgetInsight(overspent, settings).tone).toBe('danger');
  const reservedSettings = {...settings, reserveDues: true};
  const shortfall = analyzeBudget(
    [],
    [{amount: 800, isPaid: false}],
    reservedSettings,
    monday,
  );
  expect(shortfall).toMatchObject({
    safeToSpend: 0,
    overBudget: 0,
    reserveShortfall: 100,
  });
  expect(getBudgetInsight(shortfall, reservedSettings).text).toContain(
    'unpaid fees',
  );
});

it('computes category shares, elapsed-day averages, and projected spending from the selected period', () => {
  const analysis = analyzeBudget(
    [
      expense(150),
      expense(50, monday, 'transport'),
      expense(100, monday, 'legacy'),
    ],
    [],
    settings,
    new Date(2026, 10, 3, 12),
  );
  expect(analysis).toMatchObject({
    totalSpent: 300,
    averageDailySpend: 150,
    projectedSpending: 1050,
    daysRemaining: 6,
  });
  expect(analysis.categoryTotals).toEqual([
    expect.objectContaining({id: 'food', amount: 150, share: 0.5}),
    expect.objectContaining({id: 'others', amount: 100, share: 1 / 3}),
    expect.objectContaining({id: 'transport', amount: 50, share: 1 / 6}),
  ]);
  expect(getBudgetInsight(analysis, settings).text).toContain('At this pace');
});

it('uses cents for totals and rounds down the daily allowance', () => {
  const analysis = analyzeBudget(
    [expense(0.1), expense(0.2)],
    [],
    {...settings, amount: 1},
    monday,
  );
  expect(analysis.totalSpent).toBe(0.3);
  expect(analysis.remainingBudget).toBe(0.7);
  expect(analysis.safeToSpend).toBe(0.1);
  expect(
    analyzeBudget([], [], {...settings, amount: 100}, monday).safeToSpend,
  ).toBe(14.28);
});

it.each([
  '',
  '.',
  '0',
  '-10',
  '1.2.3',
  '1.999',
  'Infinity',
  'NaN',
  '1e3',
  '1000000000',
])('rejects invalid monetary input %s', value => {
  expect(parseAmount(value)).toBeNull();
});

it.each([
  ['1500', 1500],
  ['1.25', 1.25],
  ['.50', 0.5],
  [' 99.90 ', 99.9],
])('accepts monetary input %s', (value, amount) => {
  expect(parseAmount(value)).toBe(amount);
});
