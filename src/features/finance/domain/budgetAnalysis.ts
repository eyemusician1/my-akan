import {formatMoney, isValidAmount, toCents} from './money';
import {
  BudgetPeriod,
  BudgetSettings,
  DueRecord,
  ExpenseRecord,
  EXPENSE_CATEGORIES,
} from './types';

// Calendar ordinals keep day counts correct across daylight-saving changes.
function calendarDay(date: Date): number {
  return (
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
}

export function getBudgetWindow(period: BudgetPeriod, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'weekly')
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === 'monthly') start.setDate(1);
  const end = new Date(start);
  if (period === 'monthly') end.setMonth(end.getMonth() + 1);
  else end.setDate(end.getDate() + (period === 'weekly' ? 7 : 1));

  return {
    start,
    end,
    totalDays: calendarDay(end) - calendarDay(start),
    daysElapsed: calendarDay(now) - calendarDay(start) + 1,
    daysRemaining: calendarDay(end) - calendarDay(now),
  };
}

export function formatBudgetRange(start: Date, end: Date): string {
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  const format = (date: Date) =>
    date.toLocaleDateString('en-PH', {month: 'short', day: 'numeric'});
  return start.getTime() === last.getTime()
    ? format(start)
    : `${format(start)} – ${format(last)}`;
}

export function analyzeBudget<T extends ExpenseRecord>(
  expenses: readonly T[],
  dues: readonly DueRecord[],
  settings: BudgetSettings,
  now: Date,
) {
  const window = getBudgetWindow(settings.period, now);
  const periodExpenses = expenses.filter(expense => {
    const timestamp = expense.createdAt.getTime();
    return (
      isValidAmount(expense.amount) &&
      timestamp >= window.start.getTime() &&
      timestamp < window.end.getTime() &&
      timestamp <= now.getTime()
    );
  });
  const spentCents = periodExpenses.reduce(
    (sum, expense) => sum + toCents(expense.amount),
    0,
  );
  const budgetCents = toCents(settings.amount);
  const pendingDues = dues.filter(
    due => !due.isPaid && isValidAmount(due.amount),
  );
  const pendingCents = pendingDues.reduce(
    (sum, due) => sum + toCents(due.amount),
    0,
  );
  const reservedCents = settings.reserveDues ? pendingCents : 0;
  const remainingCents = budgetCents - spentCents;
  const availableCents = remainingCents - reservedCents;
  const spendableBudgetCents = Math.max(0, budgetCents - reservedCents);
  const safeCents = Math.max(
    0,
    Math.floor(availableCents / window.daysRemaining),
  );
  const projectedCents = Math.round(
    (spentCents / window.daysElapsed) * window.totalDays,
  );

  const categoryTotals = EXPENSE_CATEGORIES.map(category => {
    const cents = periodExpenses.reduce((sum, expense) => {
      const known = EXPENSE_CATEGORIES.some(
        item => item.id === expense.category,
      );
      return expense.category === category.id ||
        (!known && category.id === 'others')
        ? sum + toCents(expense.amount)
        : sum;
    }, 0);
    return {
      ...category,
      amount: cents / 100,
      share: spentCents ? cents / spentCents : 0,
    };
  })
    .filter(category => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    ...window,
    periodExpenses,
    totalSpent: spentCents / 100,
    remainingBudget: remainingCents / 100,
    pendingDues: pendingCents / 100,
    pendingDueCount: pendingDues.length,
    reservedDues: reservedCents / 100,
    availableToSpend: availableCents / 100,
    safeToSpend: safeCents / 100,
    averageDailySpend: Math.round(spentCents / window.daysElapsed) / 100,
    projectedSpending: projectedCents / 100,
    overBudget: Math.max(0, -remainingCents) / 100,
    reserveShortfall: Math.max(0, -availableCents) / 100,
    spendingBudget: spendableBudgetCents / 100,
    budgetUsed: spentCents / budgetCents,
    categoryTotals,
  };
}

export type BudgetAnalysis = ReturnType<typeof analyzeBudget>;

export function getBudgetInsight(
  analysis: BudgetAnalysis,
  settings: BudgetSettings,
) {
  const period =
    settings.period === 'daily'
      ? 'today'
      : settings.period === 'weekly'
      ? 'this week'
      : 'this month';
  if (analysis.overBudget > 0) {
    return {
      tone: 'danger' as const,
      icon: 'error-outline',
      text: `Over budget by ${formatMoney(analysis.overBudget)}.`,
    };
  }
  if (settings.reserveDues && analysis.reserveShortfall > 0) {
    return {
      tone: 'warning' as const,
      icon: 'account-balance-wallet',
      text: 'Not enough left for unpaid fees.',
    };
  }
  if (analysis.safeToSpend === 0) {
    return {
      tone: 'warning' as const,
      icon: 'warning-amber',
      text: 'No daily allowance left.',
    };
  }
  if (analysis.periodExpenses.length === 0) {
    return {
      tone: 'neutral' as const,
      icon: 'info-outline',
      text: 'No spending yet.',
    };
  }
  if (
    analysis.totalDays > 1 &&
    analysis.projectedSpending > analysis.spendingBudget
  ) {
    return {
      tone: 'warning' as const,
      icon: 'trending-up',
      text: `At this pace: ${formatMoney(
        analysis.projectedSpending,
      )} ${period}.`,
    };
  }
  return {
    tone: 'neutral' as const,
    icon: 'check-circle-outline',
    text: 'On track.',
  };
}
