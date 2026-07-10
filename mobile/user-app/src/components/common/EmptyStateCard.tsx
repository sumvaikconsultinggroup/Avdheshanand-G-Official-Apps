import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { SurfaceCard } from './SurfaceCard';

interface EmptyStateCardProps {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  subtitle?: string;
}

export function EmptyStateCard({ icon, title, subtitle }: EmptyStateCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={26} color={colors.gold.dark} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </SurfaceCard>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.primary.maroon,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
