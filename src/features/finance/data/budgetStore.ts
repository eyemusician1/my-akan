import AsyncStorage from '@react-native-async-storage/async-storage';
import {isValidAmount, parseAmount} from '../domain/money';
import {BUDGET_PERIODS, BudgetSettings, DEFAULT_BUDGET} from '../domain/types';

const SETTINGS_KEY = '@budget_settings';

function isBudgetSettings(value: unknown): value is BudgetSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<BudgetSettings>;
  return (
    settings.version === 1 &&
    isValidAmount(settings.amount) &&
    BUDGET_PERIODS.some(period => period.value === settings.period) &&
    typeof settings.reserveDues === 'boolean'
  );
}

export const budgetStore = {
  async load(): Promise<BudgetSettings> {
    const values = await AsyncStorage.multiGet([SETTINGS_KEY, '@budget']);
    const stored = values[0][1];
    if (stored) {
      try {
        const settings: unknown = JSON.parse(stored);
        if (isBudgetSettings(settings)) return settings;
      } catch {
        // Recover the legacy weekly allowance if the new value is malformed.
      }
    }
    const legacy = values[1][1];
    return {
      ...DEFAULT_BUDGET,
      amount: legacy
        ? parseAmount(legacy) ?? DEFAULT_BUDGET.amount
        : DEFAULT_BUDGET.amount,
    };
  },
  async save(settings: BudgetSettings): Promise<void> {
    if (!isBudgetSettings(settings))
      throw new Error('Enter valid budget settings.');
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
};
