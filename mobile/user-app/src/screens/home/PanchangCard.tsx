import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getPanchangToday } from '../../services/panchangApi';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface PanchangSummary {
  tithi?: { name?: string; paksha?: string };
  nakshatra?: { name?: string };
  sunrise?: string;
  dayQuality?: { score?: number; label?: string; color?: string };
  festival?: string | null;
  festivals?: string[];
  dayNameHindi?: string;
  dayName?: string;
  hinduMonth?: string;
  moonRashi?: { name?: string };
}

interface PanchangCardProps {
  onPress?: () => void;
}

function unwrapPayload<T = unknown>(payload: unknown, maxDepth = 3): T | null {
  let current: unknown = payload;
  for (let i = 0; i < maxDepth; i++) {
    if (current && typeof current === 'object' && 'success' in (current as Record<string, unknown>) && 'data' in (current as Record<string, unknown>)) {
      current = (current as { data?: unknown }).data;
      continue;
    }
    break;
  }
  return (current as T) ?? null;
}

export default function PanchangCard({ onPress }: PanchangCardProps) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<PanchangSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPanchang();
  }, []);

  const fetchPanchang = async () => {
    try {
      const response = await getPanchangToday({ lat: 29.9457, lng: 78.1642, city: 'Haridwar' });
      const parsed = unwrapPayload<PanchangSummary>(response);
      if (parsed?.tithi?.name) setData(parsed);
    } catch {} finally {
      setLoading(false);
    }
  };

  const primaryFestival = data?.festival || (data?.festivals && data.festivals[0]) || null;
  const dayQuality = data?.dayQuality;
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    navigation.navigate('Panchang');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Gold top accent */}
      <View style={styles.topAccent} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.labelHindi}>{t('panchang.todayTitle')}</Text>
          <Text style={styles.labelEn}>{t('panchang.todaySubtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('NotificationPreferences')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="bell-outline" size={20} color={colors.gold.dark} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary.saffron} />
        </View>
      ) : !data ? (
        <View style={styles.loadingBox}>
          <Icon name="calendar-blank-outline" size={24} color={colors.text.secondary} />
          <Text style={styles.emptyText}>{t('panchang.tapToView')}</Text>
        </View>
      ) : (
        <>
          {/* Day Quality */}
          {dayQuality && dayQuality.score && (
            <View style={styles.dayQualityRow}>
              <View style={styles.dayQualityDots}>
                {Array.from({ length: 10 }, (_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: i < (dayQuality.score || 0) ? (dayQuality.color || '#CA8A04') : '#E5E7EB' }]} />
                ))}
              </View>
              <Text style={[styles.dayQualityText, { color: dayQuality.color || '#CA8A04' }]}>
                {dayQuality.label} ({dayQuality.score}/10)
              </Text>
            </View>
          )}

          {/* Main Info */}
          <View style={styles.mainRow}>
            <View style={styles.mainItem}>
              <Icon name="star-four-points" size={16} color={colors.gold.main} />
              <Text style={styles.mainLabel}>{t('panchang.tithi')}</Text>
              <Text style={styles.mainValue} numberOfLines={1}>
                {data.tithi?.name || t('panchang.notAvailable')}
              </Text>
              {data.tithi?.paksha && (
                <Text style={styles.mainSub}>{data.tithi.paksha}</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.mainItem}>
              <Icon name="calendar-star" size={16} color={colors.gold.main} />
              <Text style={styles.mainLabel}>{t('panchang.nakshatra')}</Text>
              <Text style={styles.mainValue} numberOfLines={1}>
                {data.nakshatra?.name || t('panchang.notAvailable')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.mainItem}>
              <Icon name="weather-sunset-up" size={16} color={colors.gold.main} />
              <Text style={styles.mainLabel}>{t('panchang.sunrise')}</Text>
              <Text style={styles.mainValue}>
                {data.sunrise || t('panchang.timeUnavailable')}
              </Text>
            </View>
          </View>

          {/* Festival */}
          {primaryFestival && (
            <View style={styles.festivalRow}>
              <Icon name="party-popper" size={14} color={colors.primary.maroon} />
              <Text style={styles.festivalText} numberOfLines={1}>
                {primaryFestival}
              </Text>
            </View>
          )}

          {/* Moon Rashi chip */}
          {data.moonRashi?.name && (
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Icon name="moon-waxing-crescent" size={12} color="#60A5FA" />
                <Text style={styles.chipText}>{t('panchang.moonLabel', { value: data.moonRashi.name })}</Text>
              </View>
              {data.hinduMonth && (
                <View style={styles.chip}>
                  <Icon name="calendar-text" size={12} color={colors.gold.dark} />
                  <Text style={styles.chipText}>{data.hinduMonth}</Text>
                </View>
              )}
            </View>
          )}

          {/* CTA */}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{t('panchang.viewFullCalendar')}</Text>
            <Icon name="arrow-right" size={16} color={colors.primary.saffron} />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    overflow: 'hidden',
    ...shadows.warm,
  },
  topAccent: {
    height: 3,
    backgroundColor: colors.gold.main,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerLeft: {},
  labelHindi: { fontSize: 15, fontWeight: '700', color: colors.primary.maroon },
  labelEn: { fontSize: 11, color: colors.text.secondary },
  bellButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(212,160,23,0.08)',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: { fontSize: 13, color: colors.text.secondary },
  dayQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  dayQualityDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dayQualityText: { fontSize: 12, fontWeight: '600' },
  mainRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  mainItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: colors.border.gold as string },
  mainLabel: { fontSize: 11, color: colors.text.secondary, marginTop: 4 },
  mainValue: { fontSize: 14, fontWeight: '700', color: colors.text.primary, marginTop: 2, textAlign: 'center' },
  mainSub: { fontSize: 10, color: colors.gold.dark, fontWeight: '500' },
  festivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(212,160,23,0.1)',
    borderRadius: borderRadius.sm,
  },
  festivalText: { fontSize: 13, fontWeight: '600', color: colors.primary.maroon, flex: 1 },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background.parchment,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  chipText: { fontSize: 11, fontWeight: '500', color: colors.text.primary },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
    gap: spacing.xs,
  },
  ctaText: { fontSize: 13, fontWeight: '600', color: colors.primary.saffron },
});
