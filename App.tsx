import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import {useNotificationLifecycle} from './src/core/notifications/useNotificationLifecycle';
import {notificationNavigation, flushNotificationOpen} from './src/core/notifications/notificationNavigation';
import {useWidgetNavigation, flushWidgetOpen} from './src/core/widgets/widgetNavigation';

function App(): React.JSX.Element {
  useNotificationLifecycle();
  useWidgetNavigation();
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* We hand over all control to AppNavigator which has our smart bypass logic */}
      <NavigationContainer ref={notificationNavigation} onReady={() => {flushNotificationOpen().catch(console.warn); flushWidgetOpen();}}>
        <AppNavigator />
      </NavigationContainer>

    </SafeAreaProvider>
  );
}

export default App;
