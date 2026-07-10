import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  icon?: React.ComponentProps<typeof Icon>['name'];
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  icon,
}: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          {icon ? <Icon name={icon} size={18} color={colors.primary.saffron} style={styles.icon} /> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} activeOpacity={0.8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.primary.maroon,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  action: {
    ...typography.button,
    color: colors.primary.saffron,
  },
});
