import notifee, {
  AndroidImportance,
  AndroidStyle,
  AuthorizationStatus,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Q} from '@nozbe/watermelondb';
import {database} from '../database';
import type Expense from '../database/models/Expense';
import {
  analyzeBudget,
  BudgetAnalysis,
  getBudgetWindow,
} from '../../features/finance/domain/budgetAnalysis';
import {budgetWarning} from '../../features/finance/domain/budgetWarning';
import {budgetStore} from '../../features/finance/data/budgetStore';
import type {
  BudgetPeriod,
  BudgetSettings,
} from '../../features/finance/domain/types';
import {notificationPreferences} from './preferences';
import {notificationLines} from './notificationText';
import {
  BUDGET_CHANNEL,
  NOTIFICATION_COLOR,
  NOTIFICATION_ICON,
} from './NotificationService';

const STATE_KEY = '@budget_notification_state';
type DeliveryState = Partial<
  Record<BudgetPeriod, {start: number; level: number}>
>;
let queue: Promise<void> = Promise.resolve();
function serialize(action: () => Promise<void>) {
  const result = queue.then(action, action);
  queue = result.catch(() => {});
  return result;
}
async function clearDisplayedBudgets(except?: string) {
  const ids = (await notifee.getDisplayedNotifications())
    .map(item => item.notification.id ?? '')
    .filter(id => id.startsWith('budget-') && id !== except);
  if (ids.length) await notifee.cancelAllNotifications(ids);
}
export const BudgetNotifications = {
  check(analysis: BudgetAnalysis, settings: BudgetSettings): Promise<void> {
    const deliver = async () => {
      if (!(await notificationPreferences.load()).budgets) return;
      const warning = budgetWarning(analysis, settings);
      if (!warning) {
        await clearDisplayedBudgets();
        return;
      }
      let state: DeliveryState = {};
      const raw = await AsyncStorage.getItem(STATE_KEY);
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
          state = parsed;
      } catch {
        /* Repair malformed delivery metadata. */
      }
      const previous = state[settings.period];
      if (
        previous?.start === warning.start &&
        [1, 2].includes(previous.level) &&
        previous.level >= warning.level
      )
        return;
      if (
        (await notifee.getNotificationSettings()).authorizationStatus <
        AuthorizationStatus.AUTHORIZED
      )
        return;
      await notifee.createChannel({
        id: BUDGET_CHANNEL,
        name: 'Budget alerts',
        description: 'At 80% and 100% of your budget.',
        importance: AndroidImportance.DEFAULT,
      });
      await notifee.displayNotification({
        id: warning.id,
        title: warning.title,
        body: warning.body,
        data: {target: 'payments'},
        android: {
          channelId: BUDGET_CHANNEL,
          smallIcon: NOTIFICATION_ICON,
          color: NOTIFICATION_COLOR,
          autoCancel: true,
          onlyAlertOnce: true,
          timeoutAfter: Math.max(1000, analysis.end.getTime() - Date.now()),
          pressAction: {id: 'default'},
          style: {
            type: AndroidStyle.BIGTEXT,
            text: notificationLines([
              warning.body,
              ...warning.detail.split('\n'),
            ]),
          },
        },
        ios: {
          threadId: 'budget',
          foregroundPresentationOptions: {
            banner: true,
            list: true,
            sound: false,
            badge: false,
          },
        },
      });
      state[settings.period] = {start: warning.start, level: warning.level};
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
      await clearDisplayedBudgets(warning.id);
    };
    return serialize(deliver);
  },
  async refresh() {
    const settings = await budgetStore.load();
    const now = new Date(),
      {start, end} = getBudgetWindow(settings.period, now);
    const expenses = await database
      .get<Expense>('expenses')
      .query(
        Q.where('created_at', Q.gte(start.getTime())),
        Q.where('created_at', Q.lt(end.getTime())),
      )
      .fetch();
    await BudgetNotifications.check(
      analyzeBudget(expenses, [], settings, now),
      settings,
    );
  },
  clear() {
    return serialize(() => clearDisplayedBudgets());
  },
};
