import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { borderRadius, spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  icon?: React.ComponentProps<typeof Icon>['name'];
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: AppButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary.maroon : colors.text.white} />
      ) : (
        <>
          {icon ? (
            <Icon
              name={icon}
              size={18}
              color={variant === 'secondary' ? colors.primary.maroon : colors.text.white}
              style={styles.icon}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              variant === 'secondary' && styles.secondaryLabel,
              variant === 'ghost' && styles.ghostLabel,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled || loading} style={style}>
        <LinearGradient
          colors={disabled ? ['#D8B274', '#C89B4B'] : [colors.primary.saffron, colors.primary.maroon]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.buttonBase, styles.primaryButton, disabled && styles.disabled]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.buttonBase,
        variant === 'secondary' ? styles.secondaryButton : styles.ghostButton,
        disabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  buttonBase: {
    minHeight: 52,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    shadowColor: colors.primary.maroon,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  label: {
    ...typography.button,
    color: colors.text.white,
  },
  secondaryLabel: {
    color: colors.primary.maroon,
  },
  ghostLabel: {
    color: colors.primary.saffron,
  },
  icon: {
    marginRight: spacing.sm,
  },
  disabled: {
    opacity: 0.75,
  },
});
