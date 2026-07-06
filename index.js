/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {registerWidgetTaskHandler} from 'react-native-android-widget';
import App from './App';
import {name as appName} from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import {widgetTaskHandler} from './src/widgets/WidgetTaskHandler';

// --- 1. Notifee Background Notification Handler ---
notifee.onBackgroundEvent(async (event) => {
  if (!event) return;
  const { type, detail } = event;

  if (type === EventType.ACTION_PRESS && detail?.pressAction?.id) {
    console.log('User tapped a schedule alert in background');
  }
});

// --- 2. Main React Native App Registration ---
AppRegistry.registerComponent(appName, () => App);

// --- 3. CRITICAL FIX: Android Home Screen Widget Background Handler ---
registerWidgetTaskHandler(widgetTaskHandler);