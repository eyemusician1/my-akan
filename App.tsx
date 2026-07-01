import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* We hand over all control to AppNavigator which has our smart bypass logic */}
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>

    </SafeAreaProvider>
  );
}

export default App;