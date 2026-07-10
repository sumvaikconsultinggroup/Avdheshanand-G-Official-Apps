import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { borderRadius, spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { EmptyStateCard, SurfaceCard } from '../../components/common';

interface RequestedSchedule {
  eventDate?: string;
  eventLocation?: string;
  eventTime?: string;
}

interface Registration {
  _id: string;
  name?: string;
  purpose?: string;
  preferedTime?: string;
  status?: string;
  createdAt?: string;
  requestedSchedule?: RequestedSchedule;
}

function statusStyle(status: string | undefined, colors: ColorPalette): { bg: string; color: string } {
  const s = (status || 'pending').toLowerCase();
  if (s.includes('approv') || s.includes('confirm') || s.includes('complete')) {
    return { bg: 'rgba(76,175,80,0.12)', color: '#2E7D32' };
  }
  if (s.includes('reject') || s.includes('cancel') || s.includes('declin')) {
    return { bg: 'rgba(244,67,54,0.12)', color: '#C62828' };
  }
  return { bg: 'rgba(212,160,23,0.15)', color: colors.gold.dark };
}

export function MyRegistrationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    if (!user?._id) {
      setRegistrations([]);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/scheduleRegistration?userId=${encodeURIComponent(user._id)}`);
      setRegistrations(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load registrations:', error);
      setRegistrations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRegistrations();
  }, [fetchRegistrations]);

  const formatDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const locale = (i18n.language || 'en').startsWith('en') ? 'en-IN' : `${i18n.language}-IN`;
    return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.primary.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.menu.registrations.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.saffron} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.saffron]}
              tintColor={colors.primary.saffron}
            />
          }
        >
          {registrations.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyStateCard
                icon="calendar-blank-outline"
                title={t('profile.menu.registrations.title')}
                subtitle={t('explore.checkBackLater')}
              />
            </View>
          ) : (
            registrations.map((item) => {
              const badge = statusStyle(item.status, colors);
              const date = formatDate(item.requestedSchedule?.eventDate);
              return (
                <SurfaceCard key={item._id} compact style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.purpose || t('profile.menu.registrations.title')}
                    </Text>
                    {item.status ? (
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.color }]}>{item.status}</Text>
                      </View>
                    ) : null}
                  </View>
                  {date ? (
                    <View style={styles.metaRow}>
                      <Icon name="calendar" size={15} color={colors.gold.dark} />
                      <Text style={styles.metaText}>
                        {date}
                        {item.requestedSchedule?.eventTime ? ` · ${item.requestedSchedule.eventTime}` : ''}
                      </Text>
                    </View>
                  ) : null}
                  {item.requestedSchedule?.eventLocation ? (
                    <View style={styles.metaRow}>
                      <Icon name="map-marker-outline" size={15} color={colors.gold.dark} />
                      <Text style={styles.metaText} numberOfLines={2}>
                        {item.requestedSchedule.eventLocation}
                      </Text>
                    </View>
                  ) : null}
                </SurfaceCard>
              );
            })
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold as string,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.sandstone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  emptyWrap: {
    marginTop: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.title,
    color: colors.primary.maroon,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    flex: 1,
  },
});
