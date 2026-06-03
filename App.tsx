import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import your screens and navigator
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { NamePromptScreen } from './src/screens/NamePromptScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { palette } from './src/tokens/colors';

// Database Provider (if you initialized WatermelonDB earlier)
// import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
// import { database } from './src/core/database';

type AppState = 'WELCOME' | 'NAME_PROMPT' | 'MAIN_APP';

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>('WELCOME');
  const [userName, setUserName] = useState<string | null>(null);

  // In the future, you can add a useEffect here to check WatermelonDB or AsyncStorage
  // on app launch to see if the user already has a saved name. If they do,
  // you can instantly setAppState('MAIN_APP').

  const handleGetStarted = () => {
    setAppState('NAME_PROMPT');
  };

  const handleNameSubmit = (name: string) => {
    setUserName(name);
    // Here is where you will eventually save the name to your offline database
    setAppState('MAIN_APP');
  };

  return (
    <SafeAreaProvider>
      {/* Adjust status bar dynamically based on the dark Welcome screen */}
      <StatusBar
        barStyle={appState === 'WELCOME' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {appState === 'WELCOME' && (
        <WelcomeScreen onGetStarted={handleGetStarted} />
      )}

      {appState === 'NAME_PROMPT' && (
        <NamePromptScreen onComplete={handleNameSubmit} />
      )}

      {appState === 'MAIN_APP' && (
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      )}

    </SafeAreaProvider>
  );
}

export default App;