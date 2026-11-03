import AsyncStorage from '@react-native-async-storage/async-storage';
import {createNavigationContainerRef} from '@react-navigation/native';
import type {Notification} from '@notifee/react-native';
import type {RootStackParamList} from '../../navigation/types';

export const notificationNavigation =
  createNavigationContainerRef<RootStackParamList>();
const PENDING_KEY = '@pending_notification_target';
const OPENED_KEY = '@last_notification_open';
function recentlyOpened(raw: string | null, id?: string) {
  if (!raw || !id) return false;
  try {
    const last = JSON.parse(raw);
    const elapsed = Date.now() - last.time;
    return last.id === id && elapsed >= 0 && elapsed < 10000;
  } catch {
    return false;
  }
}
let queue: Promise<void> = Promise.resolve();
export async function queueNotificationOpen(notification?: Notification) {
  const target = notification?.data?.target;
  if (target !== 'payments' && target !== 'schedule') return;
  if (recentlyOpened(await AsyncStorage.getItem(OPENED_KEY), notification?.id))
    return;
  await AsyncStorage.setItem(
    PENDING_KEY,
    JSON.stringify({target, id: notification?.id}),
  );
}
export function flushNotificationOpen() {
  const open = async () => {
    if (!notificationNavigation.isReady()) return;
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return;
    let pending: {target?: string; id?: string};
    try {
      pending = JSON.parse(raw);
    } catch {
      pending = {target: raw};
    }
    if (!pending || typeof pending !== 'object') {
      await AsyncStorage.removeItem(PENDING_KEY);
      return;
    }
    const {target, id} = pending;
    if (recentlyOpened(await AsyncStorage.getItem(OPENED_KEY), id)) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return;
    }
    const route = notificationNavigation.getCurrentRoute()?.name;
    // Notification taps must not bypass onboarding.
    if (!route || ['Welcome', 'NamePrompt', 'YearPrompt'].includes(route)) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return;
    }
    await AsyncStorage.removeItem(PENDING_KEY);
    if (target !== 'payments' && target !== 'schedule') return;
    if (id)
      await AsyncStorage.setItem(
        OPENED_KEY,
        JSON.stringify({id, time: Date.now()}),
      );
    if (target === 'payments') notificationNavigation.navigate('Finance');
    else if (target === 'schedule')
      notificationNavigation.navigate('Home', {tab: 'Schedules'});
  };
  const result = queue.then(open, open);
  queue = result.catch(() => {});
  return result;
}
