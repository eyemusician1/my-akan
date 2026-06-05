import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palette } from '../tokens';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { NamePromptScreen } from '../screens/NamePromptScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ManualEntryScreen } from '../screens/ManualEntryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ScannerScreen } from '../screens/ScannerScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  // Controls the fade-out animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Run the storage check AND a minimum 1.5-second timer simultaneously.
        // This guarantees the beautiful splash screen is seen by the user before vanishing.
        const [storedName] = await Promise.all([
          AsyncStorage.getItem('@user_name'),
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);

        if (storedName) {
          setInitialRoute('Home');
        } else {
          setInitialRoute('Welcome');
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
      {/* Renders silently in the background while the splash screen is visible */}
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
                onComplete={() => props.navigation.replace('Home')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ManualEntry" component={ManualEntryScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Scanner" component={ScannerScreen} />

        </Stack.Navigator>
      )}

      {/* --- Animated Splash Screen Overlay --- */}
      {isSplashVisible && (
        <Animated.View style={[styles.splashScreen, { opacity: fadeAnim }]}>
          <View style={styles.splashCenter}>
            <Image
              source={require('../../assets/images/msuLogo.png')}
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
    ...StyleSheet.absoluteFillObject, // Covers the entire screen
    backgroundColor: palette.bg,      // Matches your app's warm theme
    zIndex: 999,                      // Forces it to sit on top of the Navigator
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  splashCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
  splashBottom: {
    paddingBottom: 24,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.muted, // A soft, subtle color just like Google Drive
    letterSpacing: 0.5,
  }
});