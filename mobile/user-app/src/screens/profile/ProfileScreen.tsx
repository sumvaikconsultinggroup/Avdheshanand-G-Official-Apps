import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppShell } from '../../context/AppShellContext';
import { borderRadius, spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import LanguageDrawer from '../../components/LanguageDrawer';
import { AppButton, ScreenHeader, SurfaceCard } from '../../components/common';
import api from '../../services/api';

interface MenuItem {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  comingSoon?: boolean;
}

type DonationSummary = {
  totals: {
    donationsCount: number;
    totalAmount: number;
    subscriptionCount: number;
  };
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useAppShell();
  const [languageDrawerVisible, setLanguageDrawerVisible] = useState(false);
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get(`/my-donations?lang=${encodeURIComponent(i18n.language || 'en')}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load profile summary:', error);
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
    ]);
  };

  const handleMenuPress = (item: string) => {
    Alert.alert(t('common.comingSoon'), t('profile.featureComingSoon', { item }));
  };

  const currentLanguageLabel = useMemo(() => {
    const code = (i18n.language || 'en').split('-')[0];
    const map: Record<string, string> = {
      en: 'English',
      hi: 'हिन्दी',
      bn: 'বাংলা',
      ta: 'தமிழ்',
      te: 'తెలుగు',
      mr: 'मराठी',
      gu: 'ગુજરાતી',
      kn: 'ಕನ್ನಡ',
      ml: 'മലയാളം',
      pa: 'ਪੰਜਾਬੀ',
      or: 'ଓଡ଼ିଆ',
      as: 'অসমীয়া',
    };
    return map[code] || 'English';
  }, [i18n.language]);

  const menuItems: MenuItem[] = [
    {
      icon: 'account-edit-outline',
      title: t('profile.editProfile'),
      subtitle: user?.email || undefined,
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'hand-heart',
      title: t('profile.menu.donations.title'),
      subtitle: t('profile.menu.donations.subtitle'),
      onPress: () => navigation.navigate('DonationHistory'),
    },
    {
      icon: 'translate',
      title: t('profile.language'),
      subtitle: currentLanguageLabel,
      onPress: () => setLanguageDrawerVisible(true),
    },
    {
      icon: 'calendar-check',
      title: t('profile.menu.registrations.title'),
      subtitle: t('profile.menu.registrations.subtitle'),
      onPress: () => navigation.navigate('MyRegistrations'),
    },
    {
      icon: 'lock-reset',
      title: t('auth.forgotPassword'),
      onPress: () => navigation.navigate('ForgotPassword'),
    },
    {
      icon: 'cog-outline',
      title: t('profile.settings'),
      subtitle: t('profile.menu.settings.subtitle'),
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow={t('profile.title')}
        title={user?.name || t('profile.devoteeFallback')}
        subtitle={user?.email || t('profile.appTagline')}
        icon="account-circle-outline"
        rightActionIcon="menu"
        onRightActionPress={openDrawer}
        rightActionLabel={t('appDrawer.openMenu')}
      />

      <View style={styles.identityStrip}>
        {user?.phone ? (
          <View style={styles.identityPill}>
            <Icon name="phone-outline" size={16} color={colors.primary.maroon} />
            <Text style={styles.identityPillText}>{user.phone}</Text>
          </View>
        ) : null}
        <View style={styles.identityPill}>
          <Icon name="translate" size={16} color={colors.primary.maroon} />
          <Text style={styles.identityPillText}>{currentLanguageLabel}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('DonationHistory')}>
          <SurfaceCard compact style={styles.donationSummary}>
            <View style={styles.summaryIcon}>
              <Icon name="hand-heart" size={20} color={colors.primary.saffron} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>{t('donate.history.totalGiven')}</Text>
              {loadingSummary ? (
                <ActivityIndicator color={colors.primary.saffron} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              ) : (
                <Text style={styles.summaryValue}>
                  {summary ? formatCurrency(summary.totals.totalAmount) : '₹0'}
                  <Text style={styles.summaryMeta}>
                    {'   ·   '}{summary?.totals.donationsCount ?? 0} {t('donate.history.totalDonations')}
                  </Text>
                </Text>
              )}
            </View>
            <Icon name="chevron-right" size={20} color={colors.gold.dark} />
          </SurfaceCard>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              onPress={item.onPress}
              style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemDivider]}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Icon name={item.icon} size={19} color={colors.primary.maroon} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.menuSubtitle}>{item.subtitle}</Text> : null}
              </View>
              {item.comingSoon ? (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>{t('common.comingSoon')}</Text>
                </View>
              ) : (
                <Icon name="chevron-right" size={20} color={colors.gold.dark} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppButton
          label={t('profile.logout')}
          onPress={handleLogout}
          variant="secondary"
          icon="logout"
          style={styles.logoutButton}
        />
        <Text style={styles.appVersion}>Swami Avdheshanand G • v1.0.0</Text>
      </View>

      <View style={{ height: spacing.xxl }} />

      <LanguageDrawer visible={languageDrawerVisible} onClose={() => setLanguageDrawerVisible(false)} />
    </ScrollView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  identityStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  identityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  identityPillText: {
    ...typography.bodySm,
    color: colors.primary.maroon,
    marginLeft: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  donationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.cream,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.label,
    color: colors.gold.dark,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.primary.maroon,
    marginTop: 2,
  },
  summaryMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,160,23,0.16)',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.cream,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  menuSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  comingSoonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.sandstone,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.3)',
  },
  comingSoonText: {
    ...typography.caption,
    color: colors.gold.dark,
    fontWeight: '700',
  },
  logoutButton: {
    marginBottom: spacing.md,
  },
  appVersion: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
