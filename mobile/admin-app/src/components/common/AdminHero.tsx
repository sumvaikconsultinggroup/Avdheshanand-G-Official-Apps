import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, colors, gradients, shadows, spacing, typography } from '../../theme';

interface HeroAction {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Icon>['name'];
}

interface AdminHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  style?: StyleProp<ViewStyle>;
  actions?: HeroAction[];
}

export function AdminHero({ eyebrow, title, subtitle, badge, style, actions }: AdminHeroProps) {
  return (
    <View style={[styles.shadowWrap, style]}>
      <LinearGradient
        colors={gradients.hero as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* decorative rings */}
        <View style={[styles.ring, styles.ringOne]} />
        <View style={[styles.ring, styles.ringTwo]} />

        <View style={styles.topRow}>
          <View style={styles.copyBlock}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {actions?.length ? (
          <View style={styles.actionRow}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionChip}
                onPress={action.onPress}
                activeOpacity={0.85}
              >
                {action.icon ? (
                  <Icon name={action.icon} size={16} color={colors.primary.maroon} style={styles.actionIcon} />
                ) : null}
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: borderRadius.xl,
    ...shadows.maroonGlow,
  },
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,213,79,0.14)',
  },
  ringOne: {
    width: 180,
    height: 180,
    top: -70,
    right: -50,
  },
  ringTwo: {
    width: 110,
    height: 110,
    bottom: -50,
    right: 40,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copyBlock: {
    flex: 1,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.gold.light,
    letterSpacing: 1.1,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.hero,
    color: colors.text.white,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.82)',
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,213,79,0.16)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,213,79,0.3)',
  },
  badgeText: {
    ...typography.micro,
    color: colors.gold.light,
    letterSpacing: 0.8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold.light,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.soft,
  },
  actionIcon: {
    marginRight: spacing.xs,
  },
  actionText: {
    ...typography.label,
    color: colors.primary.maroon,
    fontWeight: '700',
  },
});
