import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

interface AdminPillProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function AdminPill({ label, selected = false, onPress }: AdminPillProps) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  pillSelected: {
    backgroundColor: colors.primary.maroon,
    borderColor: colors.primary.maroon,
  },
  text: {
    ...typography.label,
    color: colors.text.secondary,
  },
  textSelected: {
    color: colors.text.white,
    fontWeight: '700',
  },
});
