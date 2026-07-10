import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { spacing, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary.saffron} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.parchment,
  },
  message: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 14,
  },
});
