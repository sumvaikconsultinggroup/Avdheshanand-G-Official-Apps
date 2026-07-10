import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, SurfaceCard } from '../../components/common';
import { spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function TermsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const sections = [
    { title: t('legal.terms.sections.use.title'), body: t('legal.terms.sections.use.body') },
    { title: t('legal.terms.sections.content.title'), body: t('legal.terms.sections.content.body') },
    { title: t('legal.terms.sections.donations.title'), body: t('legal.terms.sections.donations.body') },
    { title: t('legal.terms.sections.liability.title'), body: t('legal.terms.sections.liability.body') },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow={t('legal.policyEyebrow')}
        title={t('legal.terms.title')}
        subtitle={t('legal.terms.subtitle')}
        icon="scale-balance"
      />

      <View style={styles.section}>
        <Text style={styles.updatedLabel}>{t('legal.effectiveDate')}</Text>
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
