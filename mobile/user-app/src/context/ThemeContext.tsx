import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ColorPalette } from '../theme';

export type ThemeMode = 'light' | 'dark' | 'system';
type Scheme = 'light' | 'dark';

const STORAGE_KEY = 'app_theme_mode';

interface ThemeContextValue {
  /** Active palette to use in styles. */
  colors: ColorPalette;
  /** The user's preference: light | dark | system. */
  mode: ThemeMode;
  /** The resolved scheme actually applied (system resolves to light/dark). */
  scheme: Scheme;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<Scheme>(
    (Appearance.getColorScheme() as Scheme) || 'light'
  );
  const [isReady, setIsReady] = useState(false);

  // Load the saved preference once.
  useEffect(() => {
    (async () => {
      try {
        const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemeMode | null;
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {
        // ignore — fall back to system
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  // Track OS appearance changes (only matters when mode === 'system').
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme((colorScheme as Scheme) || 'light');
    });
    return () => sub.remove();
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const scheme: Scheme = mode === 'system' ? systemScheme : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      mode,
      scheme,
      isDark: scheme === 'dark',
      setMode,
      isReady,
    }),
    [scheme, mode, isReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
