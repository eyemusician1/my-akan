/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, { EventType } from '@notifee/react-native';

notifee.onBackgroundEvent(async (event) => {
  if (!event) return;
  const { type, detail } = event;

  if (type === EventType.ACTION_PRESS && detail?.pressAction?.id) {
    console.log('User tapped a schedule alert in background');
  }
});
AppRegistry.registerComponent(appName, () => App);
