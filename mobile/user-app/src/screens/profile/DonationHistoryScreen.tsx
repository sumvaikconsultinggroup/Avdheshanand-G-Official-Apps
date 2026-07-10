import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type DonationItem = {
  id: string;
  amount: number;
  currency: string;
  donatedAt: string;
  paymentStatus: string;
  paymentMethod: string | null;
  donationType: 'one_time' | 'subscription';
  campaignTitle: string;
  campaignImage: string | null;
  receiptNumber: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
  taxBenefitOptIn: boolean;
  panNumber: string | null;
  isAnonymous: boolean;
  dedicationType: string;
  dedicatedTo: string | null;
  dedicationMessage: string | null;
};

type DonationHistoryResponse = {
  totals: {
    donationsCount: number;
    totalAmount: number;
    subscriptionCount: number;
  };
  donations: DonationItem[];
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function DonationHistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<DonationHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localeByLanguage: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    bn: 'bn-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    or: 'or-IN',
    as: 'as-IN',
  };
  const dateLocale = localeByLanguage[i18n.language] || 'en-IN';

  const fetchHistory = useCallback(async () => {
    try {
      const response = await api.get(`/my-donations?lang=${encodeURIComponent(i18n.language || 'en')}`);
      setData(response.data);
      setError(null);
    } catch (historyError) {
      console.error('Failed to load donation history:', historyError);
      setError(t('donate.history.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [i18n.language, t]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, [fetchHistory]);

  const openReceipt = async (url: string | null) => {
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary.saffron]}
          tintColor={colors.primary.saffron}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('donate.history.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('donate.history.subtitle')}</Text>
      </View>

      {data && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(data.totals.totalAmount)}</Text>
            <Text style={styles.statLabel}>{t('donate.history.totalGiven')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.totals.donationsCount}</Text>
            <Text style={styles.statLabel}>{t('donate.history.totalDonations')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.totals.subscriptionCount}</Text>
            <Text style={styles.statLabel}>{t('donate.history.monthlyCount')}</Text>
          </View>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!data?.donations?.length ? (
        <View style={styles.emptyState}>
          <Icon name="hand-heart-outline" size={40} color={colors.gold.main} />
          <Text style={styles.emptyTitle}>{t('donate.history.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('donate.history.emptySubtitle')}</Text>
        </View>
      ) : (
        <View style={styles.listSection}>
          {data.donations.map((item) => (
            <View key={item.id} style={styles.donationCard}>
              <View style={styles.donationHeader}>
                <View style={styles.iconWrap}>
                  <Icon
                    name={item.donationType === 'subscription' ? 'repeat' : 'heart'}
                    size={18}
                    color={colors.primary.saffron}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.donationTitle}>{item.campaignTitle}</Text>
                  <Text style={styles.donationDate}>
                    {new Date(item.donatedAt).toLocaleDateString(dateLocale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {item.donationType === 'subscription'
                    ? t('donate.history.monthlyLabel')
                    : t('donate.history.oneTimeLabel')}
                </Text>
                <Text style={styles.metaText}>
                  {item.isAnonymous ? t('donate.anonymous') : t('donate.history.namedDonation')}
                </Text>
              </View>

              {item.receiptNumber ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptText}>
                    {t('donate.history.receiptNumber', { number: item.receiptNumber })}
                  </Text>
                  {item.receiptUrl && (
                    <TouchableOpacity onPress={() => openReceipt(item.receiptUrl)}>
                      <Text style={styles.receiptAction}>{t('donate.history.downloadReceipt')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.parchment,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.text.secondary,
  },
  statsCard: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    paddingVertical: spacing.md,
    ...shadows.warm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border.gold as string,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorText: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    color: colors.status.error,
  },
  emptyState: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    alignItems: 'center',
    ...shadows.warm,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  listSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  donationCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    padding: spacing.md,
    ...shadows.warm,
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.sandstone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  donationDate: {
    marginTop: 2,
    fontSize: 12,
    color: colors.text.secondary,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.gold.dark,
  },
  metaRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  receiptRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  receiptText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.primary,
  },
  receiptAction: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.saffron,
  },
});
