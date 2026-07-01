import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

import { palette } from '../tokens';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { NamePromptScreen } from '../screens/NamePromptScreen';
import { YearPromptScreen } from '../screens/YearPromptScreen'; // <-- NEW IMPORT
import { HomeScreen } from '../screens/HomeScreen';
import { ManualEntryScreen } from '../screens/ManualEntryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { RecentSchedulesScreen } from '../screens/RecentSchedulesScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  // Controls the fade-out animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Run the storage checks AND a minimum 1.5-second timer simultaneously.
        const [storedName, storedYear] = await Promise.all([
          AsyncStorage.getItem('@user_name'),
          AsyncStorage.getItem('@user_year'), // <-- CHECK FOR YEAR TOO
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);

        // SMART ROUTING:
        if (storedName && storedYear) {
          setInitialRoute('Home'); // Fully onboarded
        } else if (storedName && !storedYear) {
          setInitialRoute('YearPrompt'); // Recovers if they quit halfway through setup!
        } else {
          setInitialRoute('Welcome'); // Completely new user
        }

        // Trigger the smooth Google-style fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          // Completely unmount the splash screen after the animation finishes
          setIsSplashVisible(false);
        });

      } catch (e) {
        setInitialRoute('Welcome');
        setIsSplashVisible(false);
      }
    };

    prepareApp();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>

      {/* --- Main App Navigator --- */}
      {initialRoute !== null && (
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>

          <Stack.Screen name="Welcome">
            {(props) => (
              <WelcomeScreen
                {...props}
                onGetStarted={() => props.navigation.navigate('NamePrompt')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="NamePrompt">
            {(props) => (
              <NamePromptScreen
                {...props}
                // CHANGED: Now navigates to YearPrompt instead of Home
                onComplete={() => props.navigation.navigate('YearPrompt')}
              />
            )}
          </Stack.Screen>

          {/* --- NEW YEAR PROMPT SCREEN ROUTE --- */}
          <Stack.Screen name="YearPrompt">
            {(props) => (
              <YearPromptScreen
                {...props}
                // FIX: Completely reset the stack so the user cannot press 'Back' to return to onboarding
                onComplete={() =>
                  props.navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Home' }],
                    })
                  )
                }
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ManualEntry" component={ManualEntryScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name="RecentSchedules" component={RecentSchedulesScreen} />
          <Stack.Screen name="Finance" component={PaymentsScreen} />

        </Stack.Navigator>
      )}

      {/* --- Animated Splash Screen Overlay --- */}
      {isSplashVisible && (
        <Animated.View style={[styles.splashScreen, { opacity: fadeAnim }]}>
          <View style={styles.splashCenter}>
            <Image
              source={require('../../assets/images/TraknLogo2.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.splashBottom}>
            <Text style={styles.brandText}>Trakn Workspace</Text>
          </View>
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg
  },
  splashScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.white,
    zIndex: 999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 72,
  },
  splashCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 168,
    height: 168,
  },
  splashBottom: {
    paddingBottom: 24,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.primary,
    letterSpacing: 0.5,
  }
});