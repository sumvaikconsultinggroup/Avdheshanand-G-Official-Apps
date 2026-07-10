import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme';

interface AvatarProps {
  name?: string;
  size?: number;
  /** override gradient stops */
  colorsOverride?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}

/** Gradient initial-avatar. Falls back to "?" when no name is available. */
export function Avatar({ name, size = 52, colorsOverride, style }: AvatarProps) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?';
  return (
    <LinearGradient
      colors={(colorsOverride || gradients.hero) as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 } as TextStyle]}>{initial}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold.main,
  },
  text: {
    color: colors.text.white,
    fontWeight: '800',
  },
});

export default Avatar;
