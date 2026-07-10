import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type ColorPalette } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export function PlaceholderScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🙏 {t('common.comingSoon')}</Text>
      <Text style={styles.subtitle}>{t('home.welcome')}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.parchment,
  },
  text: {
    fontSize: 20,
    color: colors.primary.maroon,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
  },
});
