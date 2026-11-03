import {useEffect} from 'react';
import {AppState, Platform} from 'react-native';
import notifee, {EventType} from '@notifee/react-native';
import {BudgetNotifications} from './BudgetNotifications';
import {
  flushNotificationOpen,
  queueNotificationOpen,
} from './notificationNavigation';

export function useNotificationLifecycle() {
  useEffect(() => {
    const refresh = () => {
      if (AppState.currentState && AppState.currentState !== 'active') return;
      BudgetNotifications.refresh().catch(error =>
        console.warn('Budget alerts unavailable', error),
      );
      flushNotificationOpen().catch(error =>
        console.warn('Notification could not open', error),
      );
    };
    const unsubscribe = notifee.onForegroundEvent(async ({type, detail}) => {
      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        try {
          await queueNotificationOpen(detail.notification);
          await flushNotificationOpen();
        } catch (error) {
          console.warn('Notification could not open', error);
        }
      }
    });
    if (Platform.OS === 'android')
      notifee
        .getInitialNotification()
        .then(async initial => {
          if (initial) {
            await queueNotificationOpen(initial.notification);
            await flushNotificationOpen();
          }
        })
        .catch(error => console.warn('Notification launch unavailable', error));
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    refresh();
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);
}
