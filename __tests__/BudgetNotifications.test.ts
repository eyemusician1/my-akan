import {beforeEach, expect, it, jest} from '@jest/globals';
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BudgetNotifications} from '../src/core/notifications/BudgetNotifications';
import {analyzeBudget} from '../src/features/finance/domain/budgetAnalysis';
import {
  DEFAULT_BUDGET,
  BudgetSettings,
} from '../src/features/finance/domain/types';
import {notificationPreferences} from '../src/core/notifications/preferences';

jest.mock('../src/core/database', () => ({database: {}}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    displayNotification: jest.fn(async () => 'budget'),
    getNotificationSettings: jest.fn(async () => ({authorizationStatus: 1})),
    getDisplayedNotifications: jest.fn(async () => []),
    cancelAllNotifications: jest.fn(),
  },
  AndroidImportance: {DEFAULT: 3},
  AndroidStyle: {BIGTEXT: 1},
  AuthorizationStatus: {AUTHORIZED: 1},
}));
const now = new Date(2026, 10, 3, 12);
const settings = {...DEFAULT_BUDGET, amount: 1000};
const analysis = (
  amount: number,
  date = now,
  budget: BudgetSettings = settings,
) =>
  analyzeBudget(
    [{amount, category: 'food', createdAt: date}],
    [],
    budget,
    date,
  );
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

it('warns only once at 80% and once at 100%, including concurrent refreshes', async () => {
  await BudgetNotifications.check(analysis(799.99), settings);
  expect(notifee.displayNotification).not.toHaveBeenCalled();
  await Promise.all([
    BudgetNotifications.check(analysis(800), settings),
    BudgetNotifications.check(analysis(800), settings),
  ]);
  expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
  expect(notifee.displayNotification).toHaveBeenLastCalledWith(
    expect.objectContaining({
      title: 'Weekly budget running low',
      body: '₱200.00 left · 80% used.',
      data: {target: 'payments'},
    }),
  );
  await BudgetNotifications.check(analysis(1000), settings);
  await BudgetNotifications.check(analysis(1200), settings);
  expect(notifee.displayNotification).toHaveBeenCalledTimes(2);
});
it('resets for the next calendar period and preserves the weekly threshold when switching periods', async () => {
  await BudgetNotifications.check(analysis(800), settings);
  const daily: BudgetSettings = {...settings, period: 'daily'};
  await BudgetNotifications.check(analysis(800, now, daily), daily);
  await BudgetNotifications.check(analysis(900), settings);
  expect(notifee.displayNotification).toHaveBeenCalledTimes(2);
  await BudgetNotifications.check(
    analysis(800, new Date(2026, 10, 9, 12)),
    settings,
  );
  expect(notifee.displayNotification).toHaveBeenCalledTimes(3);
});
it('respects opt-out and denied permission without recording delivery', async () => {
  await notificationPreferences.save({classes: true, budgets: false});
  await BudgetNotifications.check(analysis(800), settings);
  await notificationPreferences.save({classes: true, budgets: true});
  jest
    .mocked(notifee.getNotificationSettings)
    .mockResolvedValueOnce({authorizationStatus: 0} as never);
  await BudgetNotifications.check(analysis(800), settings);
  expect(notifee.displayNotification).not.toHaveBeenCalled();
  await BudgetNotifications.check(analysis(800), settings);
  expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
});
it('allows retry after notification delivery fails and never cancels class alerts', async () => {
  jest
    .mocked(notifee.displayNotification)
    .mockRejectedValueOnce(new Error('Native failure'));
  await expect(
    BudgetNotifications.check(analysis(800), settings),
  ).rejects.toThrow('Native failure');
  jest
    .mocked(notifee.getDisplayedNotifications)
    .mockResolvedValueOnce([
      {notification: {id: 'class-csc-Mon'}},
      {notification: {id: 'budget-old'}},
    ] as never);
  await BudgetNotifications.check(analysis(800), settings);
  expect(notifee.cancelAllNotifications).toHaveBeenCalledWith(['budget-old']);
  expect(notifee.displayNotification).toHaveBeenCalledTimes(2);
});
it('does not treat fee reserves or old/future spending as budget use', async () => {
  const reserveSettings = {...settings, reserveDues: true};
  const value = analyzeBudget(
    [
      {amount: 900, category: 'food', createdAt: new Date(2026, 9, 1)},
      {amount: 900, category: 'food', createdAt: new Date(2026, 10, 4)},
    ],
    [{amount: 950, isPaid: false}],
    reserveSettings,
    now,
  );
  await BudgetNotifications.check(value, reserveSettings);
  expect(notifee.displayNotification).not.toHaveBeenCalled();
});
