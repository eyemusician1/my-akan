export type BudgetPeriod = 'daily' | 'weekly' | 'monthly';

export interface BudgetSettings {
  version: 1;
  amount: number;
  period: BudgetPeriod;
  reserveDues: boolean;
}

export interface ExpenseRecord {
  amount: number;
  category: string;
  createdAt: Date;
}

export interface DueRecord {
  amount: number;
  isPaid: boolean;
}

export const BUDGET_PERIODS: {
  value: BudgetPeriod;
  label: string;
  noun: string;
}[] = [
  {value: 'daily', label: 'Daily', noun: 'day'},
  {value: 'weekly', label: 'Weekly', noun: 'week'},
  {value: 'monthly', label: 'Monthly', noun: 'month'},
];

export const EXPENSE_CATEGORIES = [
  {id: 'food', name: 'Food', icon: 'lunch-dining'},
  {id: 'transport', name: 'Transport', icon: 'directions-transit'},
  {id: 'academic', name: 'Academic', icon: 'menu-book'},
  {id: 'others', name: 'Others', icon: 'category'},
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const DEFAULT_BUDGET: BudgetSettings = {
  version: 1,
  amount: 1500,
  period: 'weekly',
  reserveDues: false,
};
