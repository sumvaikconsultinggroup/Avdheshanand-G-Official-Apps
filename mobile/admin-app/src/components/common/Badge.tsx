import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { borderRadius, colors } from '../../theme';

type BadgeVariant = 'soft' | 'solid' | 'outline';

interface BadgeProps {
  label: string;
  /** base colour — background/text derive from it */
  tone?: string;
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: React.ComponentProps<typeof Icon>['name'];
  style?: StyleProp<ViewStyle>;
}

/**
 * Self-sizing pill badge. Replaces react-native-paper <Chip compact>, which
 * clips its text vertically at small fixed heights. Never sets a fixed height —
 * padding + line height define the size, so text is always fully visible.
 */
export function Badge({
  label,
  tone = colors.primary.maroon,
  variant = 'soft',
  dot,
  icon,
  style,
}: BadgeProps) {
  const solid = variant === 'solid';
  const outline = variant === 'outline';
  const fg = solid ? colors.text.white : tone;
  const bg = outline ? 'transparent' : solid ? tone : `${tone}1A`;
  const border = outline ? tone : solid ? tone : `${tone}55`;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      {icon ? <Icon name={icon} size={12} color={fg} style={styles.icon} /> : null}
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default Badge;
