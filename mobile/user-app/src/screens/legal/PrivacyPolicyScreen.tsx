import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, SurfaceCard } from '../../components/common';
import { spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const sections = [
    { title: t('legal.privacy.sections.collect.title'), body: t('legal.privacy.sections.collect.body') },
    { title: t('legal.privacy.sections.use.title'), body: t('legal.privacy.sections.use.body') },
    { title: t('legal.privacy.sections.share.title'), body: t('legal.privacy.sections.share.body') },
    { title: t('legal.privacy.sections.choices.title'), body: t('legal.privacy.sections.choices.body') },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow={t('legal.policyEyebrow')}
        title={t('legal.privacy.title')}
        subtitle={t('legal.privacy.subtitle')}
        icon="shield-check-outline"
      />

      <View style={styles.section}>
        <Text style={styles.updatedLabel}>{t('legal.lastUpdated')}</Text>
        {sections.map((section) => (
          <SurfaceCard key={section.title} style={styles.card}>
            <Text style={styles.title}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </SurfaceCard>
        ))}
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  updatedLabel: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
