import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({
  message,
  onRetry,
}: ErrorViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const resolvedMessage = message || t('common.somethingWentWrong');

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🙏</Text>
      <Text style={styles.message}>{resolvedMessage}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>{t('common.tryAgain')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.parchment,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary.saffron,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.text.white,
    fontWeight: '600',
  },
});
