import {beforeEach, expect, it, jest} from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {budgetStore} from '../src/features/finance/data/budgetStore';
import {DEFAULT_BUDGET} from '../src/features/finance/domain/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

it('loads the legacy allowance as a weekly budget without deleting it', async () => {
  await AsyncStorage.setItem('@budget', '2250.50');
  expect(await budgetStore.load()).toEqual({...DEFAULT_BUDGET, amount: 2250.5});
  expect(await AsyncStorage.getItem('@budget')).toBe('2250.50');
});

it('persists period, amount and fee reserve together and prefers these over legacy settings', async () => {
  await AsyncStorage.setItem('@budget', '1500');
  const settings = {
    ...DEFAULT_BUDGET,
    period: 'monthly' as const,
    amount: 6000,
    reserveDues: true,
  };
  await budgetStore.save(settings);
  expect(await budgetStore.load()).toEqual(settings);
});

it.each([
  'not json',
  '{"version":1,"period":"weekly","amount":0,"reserveDues":false}',
  '{"version":1,"period":"yearly","amount":100,"reserveDues":false}',
])('recovers invalid settings from the legacy allowance: %s', async value => {
  await AsyncStorage.setItem('@budget_settings', value);
  await AsyncStorage.setItem('@budget', '900');
  expect(await budgetStore.load()).toEqual({...DEFAULT_BUDGET, amount: 900});
});

it('rejects failed writes so the UI can retain the existing budget', async () => {
  const write = jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('Storage full'));
  await expect(
    budgetStore.save({...DEFAULT_BUDGET, amount: 900}),
  ).rejects.toThrow('Storage full');
  write.mockRestore();
});
