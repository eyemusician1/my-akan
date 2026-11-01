import {beforeEach, expect, it} from '@jest/globals';
import {Database} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import {schema} from '../src/core/database/schema';
import Schedule from '../src/core/database/models/Schedule';
import Subject from '../src/core/database/models/Subject';
import Expense from '../src/core/database/models/Expense';
import Due from '../src/core/database/models/Due';
import {FinanceRepository} from '../src/features/finance/data/FinanceRepository';
import {EXPENSE_CATEGORIES} from '../src/features/finance/domain/types';

let database: Database;
let repository: FinanceRepository;
beforeEach(() => {
  database = new Database({
    adapter: new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
      extraLokiOptions: {autosave: false},
    }),
    modelClasses: [Schedule, Subject, Expense, Due],
  });
  repository = new FinanceRepository(database);
});

it('creates categorized expenses with timestamps and rejects partial-cent amounts', async () => {
  const expense = await repository.addExpense(
    ' Lunch ',
    125.5,
    EXPENSE_CATEGORIES[0],
  );
  expect(expense.title).toBe('Lunch');
  expect(expense.category).toBe('food');
  expect(expense.amount).toBe(125.5);
  expect(expense.createdAt.getTime()).toBeGreaterThan(0);
  await expect(
    repository.addExpense('Invalid', 1.234, EXPENSE_CATEGORIES[0]),
  ).rejects.toThrow('two decimal places');
  expect(await database.get<Expense>('expenses').query().fetchCount()).toBe(1);
});

it('updates the fee checklist without manufacturing a duplicate expense', async () => {
  const due = await repository.addDue('Lab fee', 500);
  expect(due.isPaid).toBe(false);
  await repository.toggleDue(due.id);
  expect(due.isPaid).toBe(true);
  expect(await database.get<Expense>('expenses').query().fetchCount()).toBe(0);
  await repository.toggleDue(due.id);
  expect(due.isPaid).toBe(false);
  await repository.deleteDue(due.id);
  expect(await database.get<Due>('dues').query().fetchCount()).toBe(0);
});

it('deletes an expense so it no longer contributes to observed spending', async () => {
  const expense = await repository.addExpense('', 20, EXPENSE_CATEGORIES[1]);
  expect(expense.title).toBe('Transport');
  await repository.deleteExpense(expense.id);
  expect(await database.get<Expense>('expenses').query().fetchCount()).toBe(0);
});
