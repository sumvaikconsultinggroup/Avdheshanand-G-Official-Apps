import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { borderRadius, shadows, spacing, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function SurfaceCard({ children, style, compact = false }: SurfaceCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={[styles.card, compact && styles.compact, style]}>{children}</View>;
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    padding: spacing.lg,
    ...shadows.warm,
  },
  compact: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
});
