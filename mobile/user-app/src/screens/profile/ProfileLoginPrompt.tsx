import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { borderRadius, spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { AppButton, ScreenHeader, SurfaceCard } from '../../components/common';

export function ProfileLoginPrompt({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const benefits = [
    { icon: 'bookmark-check-outline' as const, label: t('profileLogin.benefits.savedTeachings') },
    { icon: 'calendar-check-outline' as const, label: t('profileLogin.benefits.registerEvents') },
    { icon: 'hand-heart-outline' as const, label: t('profileLogin.benefits.trackContributions') },
    { icon: 'bell-ring-outline' as const, label: t('profileLogin.benefits.personalizedNotifications') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ScreenHeader
          eyebrow={t('profile.title')}
          title={t('profileLogin.title')}
          subtitle={t('profileLogin.subtitle')}
          icon="account-circle-outline"
        />

        <View style={styles.section}>
          <SurfaceCard style={styles.contentCard}>
            {benefits.map((benefit) => (
              <View key={benefit.label} style={styles.benefitRow}>
                <View style={styles.iconWrap}>
                  <Icon name={benefit.icon} size={18} color={colors.primary.saffron} />
                </View>
                <Text style={styles.benefitText}>{benefit.label}</Text>
              </View>
            ))}
          </SurfaceCard>

          <View style={styles.actions}>
            <AppButton label={t('auth.signIn')} onPress={() => navigation.navigate('Login')} icon="login" />
            <AppButton
              label={t('auth.createAccount')}
              onPress={() => navigation.navigate('Register')}
              variant="secondary"
              icon="account-plus"
              style={styles.secondaryButton}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.quote}>{t('profileLogin.quote')}</Text>
          <Text style={styles.quoteAuthor}>{t('profileLogin.quoteAuthor')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  contentCard: {
    gap: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.cream,
    borderRadius: borderRadius.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background.warmWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  benefitText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  secondaryButton: {
    marginTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  quote: {
    ...typography.bodySm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  quoteAuthor: {
    ...typography.caption,
    color: colors.gold.dark,
    marginTop: spacing.xs,
  },
});
