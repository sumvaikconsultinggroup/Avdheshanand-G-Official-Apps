import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { borderRadius, shadows, spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Icon>['name'];
  compact?: boolean;
  rightActionIcon?: React.ComponentProps<typeof Icon>['name'];
  onRightActionPress?: () => void;
  rightActionLabel?: string;
  /** When provided, the top-left seal becomes a back button and the header
   *  clears the status bar (for pushed screens without a native header). */
  onBackPress?: () => void;
  /** Tighter side margin so the card + content below can sit wider. */
  wide?: boolean;
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  icon = 'brightness-5',
  compact = false,
  rightActionIcon,
  onRightActionPress,
  rightActionLabel,
  onBackPress,
  wide = false,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <LinearGradient
      colors={[colors.primary.saffron, colors.primary.maroon]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.wrap,
        compact && styles.compact,
        wide && { marginHorizontal: spacing.md },
        onBackPress ? { marginTop: insets.top + spacing.sm } : null,
      ]}
    >
      <View style={styles.topRow}>
        {onBackPress ? (
          <TouchableOpacity
            style={styles.iconSeal}
            onPress={onBackPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="arrow-left" size={compact ? 20 : 24} color={colors.gold.light} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconSeal}>
            <Icon name={icon} size={compact ? 20 : 24} color={colors.gold.light} />
          </View>
        )}
        {rightActionIcon && onRightActionPress ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onRightActionPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={rightActionLabel}
          >
            <Icon name={rightActionIcon} size={18} color={colors.text.white} />
          </TouchableOpacity>
        ) : null}
      </View>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    ...shadows.temple,
  },
  compact: {
    borderRadius: borderRadius.xl,
    // Align inner text with the list content's inset (cards sit at lg + md),
    // and keep the header from feeling oversized vs the cards below it.
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  iconSeal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    ...typography.label,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text.white,
  },
  compactTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.88)',
    marginTop: spacing.sm,
  },
});
