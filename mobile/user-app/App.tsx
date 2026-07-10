import './src/i18n';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { refreshPushTokenIfEnabled } from './src/services/notifications';

function ThemedApp() {
  const { colors, isDark } = useTheme();

  // If the user previously enabled notifications, silently refresh the Expo
  // token (it can rotate between launches) and re-sync it to the backend so the
  // device stays reachable by dashboard broadcasts. Never prompts.
  useEffect(() => {
    refreshPushTokenIfEnabled();
  }, []);

  const paperTheme = {
    ...(isDark ? MD3DarkTheme : MD3LightTheme),
    colors: {
      ...(isDark ? MD3DarkTheme : MD3LightTheme).colors,
      primary: colors.primary.saffron,
      secondary: colors.primary.maroon,
      tertiary: colors.gold.main,
      surface: colors.background.warmWhite,
      background: colors.background.parchment,
      onSurface: colors.text.primary,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <OnboardingProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AppNavigator />
        </OnboardingProvider>
      </AuthProvider>
    </PaperProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
