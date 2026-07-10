import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { registerAndSyncPushToken } from '../../services/notifications';
import { useOnboarding } from '../../context/OnboardingContext';
import { spacing, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const LOGO_SOURCE = require('../../../assets/images/avdheshanandg-mission-logo.png');

const BENEFITS: {
  icon: React.ComponentProps<typeof Icon>['name'];
  key: 'panchang' | 'schedule' | 'satsang';
}[] = [
  { icon: 'calendar-star', key: 'panchang' },
  { icon: 'calendar-clock', key: 'schedule' },
  { icon: 'account-voice', key: 'satsang' },
];

export function OnboardingNotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { updateState } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);

  const handleEnable = async () => {
    setSubmitting(true);
    try {
      const token = await registerAndSyncPushToken();
      await updateState({
        notificationsPrompted: true,
        notificationsEnabled: !!token,
      });
    } finally {
      setSubmitting(false);
      navigation.navigate('OnboardingLocation');
    }
  };

  const handleLater = async () => {
    await updateState({
      notificationsPrompted: true,
      notificationsEnabled: false,
    });
    navigation.navigate('OnboardingLocation');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Image source={LOGO_SOURCE} style={styles.brandLogo} />
          <Text style={styles.brandText}>{t('onboarding.brand')}</Text>
        </View>

        <Text style={styles.eyebrow}>{t('onboarding.permissionsEyebrow')}</Text>
        <Text style={styles.title}>{t('onboarding.notificationsTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.notificationsSubtitle')}</Text>

        <View style={styles.illustrationWrap}>
          <View style={styles.bellCircle}>
            <Icon name="bell-ring-outline" size={88} color={colors.primary.brand} />
          </View>
          <View style={[styles.ring, styles.ringLeft]} />
          <View style={[styles.ring, styles.ringRight]} />
        </View>

        <View style={styles.benefitsCard}>
          {BENEFITS.map((benefit, index) => (
            <View
              key={benefit.key}
              style={[styles.bulletRow, index > 0 && styles.bulletRowDivider]}
            >
              <View style={styles.bulletIconWrap}>
                <Icon name={benefit.icon} size={20} color={colors.primary.brand} />
              </View>
              <Text style={styles.bulletText}>
                {t(`onboarding.notificationsBenefits.${benefit.key}`)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleEnable}
          activeOpacity={0.9}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.text.white} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('onboarding.enableNotifications')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLater}
          activeOpacity={0.8}
          disabled={submitting}
        >
          <Text style={styles.secondaryButtonText}>{t('onboarding.maybeLater')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  eyebrow: {
    marginTop: spacing.xl,
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold.dark,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: spacing.sm,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.primary.maroon,
  },
  subtitle: {
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 25,
    color: '#685646',
  },
  illustrationWrap: {
    marginTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  bellCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFF2D9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0D6A2',
    ...shadows.warm,
  },
  ring: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#F5C56B',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringLeft: {
    left: 46,
    top: 24,
    transform: [{ rotate: '-32deg' }],
  },
  ringRight: {
    right: 46,
    top: 24,
    transform: [{ rotate: '58deg' }],
  },
  benefitsCard: {
    marginTop: spacing.xl,
    backgroundColor: '#FFF9EF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1DEC0',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  bulletRowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1E2C8',
  },
  bulletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FBEBD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background.parchment,
    borderTopWidth: 1,
    borderTopColor: 'rgba(157,31,28,0.08)',
  },
  primaryButton: {
    backgroundColor: colors.primary.brand,
    borderRadius: 18,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.warm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.white,
  },
  secondaryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
});
