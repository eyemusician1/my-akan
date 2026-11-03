import {useEffect} from 'react';
import {Linking} from 'react-native';
import {StackActions} from '@react-navigation/native';
import {notificationNavigation as navigation} from '../notifications/notificationNavigation';
import {ADD_SCHEDULE_URI, SCHEDULE_URI} from '../../widgets/scheduleData';

let pending: 'add' | 'schedule' | null = null;

export function queueWidgetOpen(url: string | null) {
  if (url === ADD_SCHEDULE_URI) pending = 'add';
  else if (url === SCHEDULE_URI || url === 'trakn://home') pending = 'schedule';
}

export function flushWidgetOpen() {
  if (!pending || !navigation.isReady()) return;
  const route = navigation.getCurrentRoute();
  if (!route) return;
  const target = pending;
  pending = null;
  // A widget must not bypass first-time profile setup.
  if (['Welcome', 'NamePrompt', 'YearPrompt'].includes(route.name)) return;
  if (target === 'schedule') {
    navigation.navigate('Home', {tab: 'Schedules'});
  } else {
    // Keep an already-open blank/manual draft; don't reuse an edit/scan screen.
    if (route.name === 'ManualEntry' && !route.params) return;
    navigation.dispatch(StackActions.push('ManualEntry'));
  }
}

export function useWidgetNavigation() {
  useEffect(() => {
    let active = true,
      receivedLink = false;
    const subscription = Linking.addEventListener('url', ({url}) => {
      receivedLink = true;
      queueWidgetOpen(url);
      flushWidgetOpen();
    });
    Linking.getInitialURL()
      .then(url => {
        if (!active || receivedLink) return;
        queueWidgetOpen(url);
        flushWidgetOpen();
      })
      .catch(error => console.warn('Widget link unavailable', error));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}
