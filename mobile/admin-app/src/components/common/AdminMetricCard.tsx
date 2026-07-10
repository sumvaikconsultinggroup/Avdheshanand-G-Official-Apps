import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

interface AdminMetricCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Icon>['name'];
  tone?: string;
  meta?: string;
  onPress?: () => void;
}

export function AdminMetricCard({
  label,
  value,
  icon,
  tone = colors.primary.maroon,
  meta,
  onPress,
}: AdminMetricCardProps) {
  const content = (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: tone }]} />
      <View style={[styles.iconWrap, { backgroundColor: `${tone}14`, borderColor: `${tone}2A` }]}>
        <Icon name={icon} size={20} color={tone} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.touch}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touch}>{content}</View>;
}

const styles = StyleSheet.create({
  touch: {
    width: '48%',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    paddingTop: spacing.lg,
    minHeight: 132,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    overflow: 'hidden',
    ...shadows.soft,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.9,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    ...typography.hero,
    color: colors.primary.maroon,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  meta: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
});
