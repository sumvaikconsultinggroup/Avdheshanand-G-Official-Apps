import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getPanchangMonth, getPanchangToday } from '../../services/panchangApi';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_SIZE = Math.floor((SCREEN_WIDTH - spacing.lg * 2 - 6) / 7);
interface DayData {
  date: number;
  dateIso?: string;
  tithi?: string;
  tithiEndTime?: string;
  nakshatra?: string;
  nakshatraDeity?: string;
  festival?: string | null;
  isPurnima?: boolean;
  isAmavasya?: boolean;
  yoga?: string;
  karana?: string;
  hinduMonth?: string;
  vikramSamvat?: string | number;
  moonrise?: string;
  moonset?: string;
  sunrise?: string;
  sunset?: string;
  rahuKaal?: string;
  yamaghanda?: string;
  gulikaKaal?: string;
  brahmaMuhurta?: string;
  abhijitMuhurta?: string;
  paksha?: string;
}

interface MonthData {
  days: DayData[];
}

function unwrapPayload<T = unknown>(payload: unknown, maxDepth = 3): T | null {
  let current: unknown = payload;
  for (let i = 0; i < maxDepth; i += 1) {
    if (
      current &&
      typeof current === 'object' &&
      'success' in (current as Record<string, unknown>) &&
      'data' in (current as Record<string, unknown>)
    ) {
      current = (current as { data?: unknown }).data;
      continue;
    }
    break;
  }
  return (current as T) ?? null;
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function mapDayFromPayload(item: any): DayData | null {
  const normalized = unwrapPayload<any>(item) ?? item;
  if (!normalized || typeof normalized !== 'object') return null;

  const iso = typeof normalized?.date === 'string' ? normalized.date : '';
  const dayNum = iso ? parseInt(iso.split('-')[2], 10) : NaN;
  const rahuStart = normalized?.rahuKaal?.start || normalized?.muhurta?.rahuKaal?.start;
  const rahuEnd = normalized?.rahuKaal?.end || normalized?.muhurta?.rahuKaal?.end;
  const yamaStart = normalized?.yamaghanda?.start || normalized?.muhurta?.yamaghanda?.start;
  const yamaEnd = normalized?.yamaghanda?.end || normalized?.muhurta?.yamaghanda?.end;
  const gulikaStart = normalized?.gulikaKaal?.start || normalized?.muhurta?.gulikaKaal?.start;
  const gulikaEnd = normalized?.gulikaKaal?.end || normalized?.muhurta?.gulikaKaal?.end;
  const brahmaStart = normalized?.brahmaMuhurta?.start || normalized?.muhurta?.brahmaMuhurta?.start;
  const brahmaEnd = normalized?.brahmaMuhurta?.end || normalized?.muhurta?.brahmaMuhurta?.end;
  const abhijitStart = normalized?.abhijitMuhurta?.start || normalized?.muhurta?.abhijitMuhurta?.start;
  const abhijitEnd = normalized?.abhijitMuhurta?.end || normalized?.muhurta?.abhijitMuhurta?.end;

  const dateNumber = Number.isFinite(dayNum)
    ? dayNum
    : Number.isFinite(normalized?.date)
      ? Number(normalized.date)
      : 0;
  if (dateNumber <= 0) return null;

  return {
    date: dateNumber,
    dateIso: iso || undefined,
    tithi: normalized?.tithi?.name || normalized?.tithi,
    tithiEndTime: normalized?.tithi?.endTime,
    nakshatra: normalized?.nakshatra?.name || normalized?.nakshatra,
    nakshatraDeity: normalized?.nakshatra?.deity,
    festival: normalized?.festival || (Array.isArray(normalized?.festivals) ? normalized.festivals[0] : null),
    isPurnima: !!normalized?.isPurnima,
    isAmavasya: !!normalized?.isAmavasya,
    yoga: normalized?.yoga?.name || normalized?.yoga,
    karana: normalized?.karana?.name || normalized?.karana?.first || normalized?.karana?.second || normalized?.karana,
    hinduMonth: normalized?.hinduMonth,
    vikramSamvat: normalized?.vikramSamvat,
    sunrise: normalized?.sunrise,
    sunset: normalized?.sunset,
    moonrise: normalized?.moonrise,
    moonset: normalized?.moonset,
    rahuKaal: rahuStart && rahuEnd ? `${rahuStart} - ${rahuEnd}` : undefined,
    yamaghanda: yamaStart && yamaEnd ? `${yamaStart} - ${yamaEnd}` : undefined,
    gulikaKaal: gulikaStart && gulikaEnd ? `${gulikaStart} - ${gulikaEnd}` : undefined,
    brahmaMuhurta: brahmaStart && brahmaEnd ? `${brahmaStart} - ${brahmaEnd}` : undefined,
    abhijitMuhurta: abhijitStart && abhijitEnd ? `${abhijitStart} - ${abhijitEnd}` : undefined,
    paksha: normalized?.paksha || normalized?.tithi?.paksha,
  };
}

export default function PanchangCalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const lat = route.params?.lat ?? 29.9457;
  const lng = route.params?.lng ?? 78.1642;
  const cityName = route.params?.cityName ?? 'Haridwar';
  const timezone = route.params?.timezone ?? 'Asia/Kolkata';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const weekdays = [
    t('panchang.calendar.weekdays.sun'),
    t('panchang.calendar.weekdays.mon'),
    t('panchang.calendar.weekdays.tue'),
    t('panchang.calendar.weekdays.wed'),
    t('panchang.calendar.weekdays.thu'),
    t('panchang.calendar.weekdays.fri'),
    t('panchang.calendar.weekdays.sat'),
  ];

  useEffect(() => {
    fetchMonthData();
  }, [year, month]);

  const fetchMonthData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await getPanchangMonth({
        month,
        year,
        lat,
        lng,
        city: cityName,
        timezone,
      });
      const payload = unwrapPayload<any[] | MonthData>(response) ?? response;

      if (Array.isArray(payload)) {
        const days: DayData[] = payload
          .map((item: any) => mapDayFromPayload(item))
          .filter((d): d is DayData => Boolean(d && d.date > 0));

        setMonthData({ days });
      } else if (payload && typeof payload === 'object' && Array.isArray((payload as MonthData).days)) {
        const days = ((payload as MonthData).days || [])
          .map((item: any) => mapDayFromPayload(item))
          .filter((d: DayData | null): d is DayData => Boolean(d && d.date > 0));
        setMonthData({ days });
      } else {
        setMonthData({ days: [] });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn('Panchang month API unavailable:', error.message);
      }
      setMonthData({ days: [] });
      setFetchError(t('panchang.calendar.errors.monthLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString(i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`, { month: 'long' });

  // Calculate the starting day of the month
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const handleDayPress = async (day: DayData) => {
    setSelectedDay(day);
    setDetailVisible(true);
    setDayDetailLoading(true);

    try {
      const date = day.dateIso || formatIsoDate(year, month, day.date);
      const response = await getPanchangToday({
        lat,
        lng,
        city: cityName,
        timezone,
        date,
      });
      const payload = unwrapPayload<any>(response) ?? response;
      const mapped = mapDayFromPayload(payload);
      if (mapped) {
        setSelectedDay({ ...mapped, dateIso: mapped.dateIso || date });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn('Panchang day detail fetch failed:', error.message);
      }
    } finally {
      setDayDetailLoading(false);
    }
  };

  // Build the calendar grid
  const calendarCells: (DayData | null)[] = [];
  // Fill empty cells before month start
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  // Fill in each day
  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = monthData?.days?.find((dd) => dd.date === d) || { date: d };
    calendarCells.push(dayData);
  }

  // Determine which festivals exist in this month for the legend
  const festivalsInMonth = (monthData?.days || [])
    .filter((d) => d.festival)
    .map((d) => ({ date: d.date, name: d.festival! }));

  const isToday = (date: number) =>
    year === now.getFullYear() && month === now.getMonth() + 1 && date === now.getDate();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.primary.maroon} />
        </TouchableOpacity>
          <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('panchang.calendar.title')}</Text>
          <Text style={styles.headerSubtitle}>{cityName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navArrow}>
          <Icon name="chevron-left" size={28} color={colors.primary.saffron} />
        </TouchableOpacity>
        <View style={styles.monthLabel}>
          <Text style={styles.monthName}>{monthName}</Text>
          <Text style={styles.yearText}>{year}</Text>
        </View>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navArrow}>
          <Icon name="chevron-right" size={28} color={colors.primary.saffron} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.saffron} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {!!fetchError && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle-outline" size={16} color={colors.primary.vermillion} />
              <Text style={styles.errorBannerText}>{fetchError}</Text>
            </View>
          )}

          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {weekdays.map((day, weekdayIndex) => (
              <View key={day} style={styles.weekdayCell}>
                <Text
                  style={[styles.weekdayText, weekdayIndex === 0 && styles.sundayText]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarCells.map((cell, index) => {
              if (!cell) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              const today = isToday(cell.date);
              const hasFestival = !!cell.festival;
              return (
                <TouchableOpacity
                  key={`day-${cell.date}`}
                  style={[
                    styles.dayCell,
                    today && styles.todayCell,
                  ]}
                  onPress={() => handleDayPress(cell)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      today && styles.todayNumber,
                      index % 7 === 0 && styles.sundayNumber,
                    ]}
                  >
                    {cell.date}
                  </Text>

                  {/* Tithi indicator */}
                  {cell.tithi && (
                    <Text style={styles.tithiIndicator} numberOfLines={1}>
                      {cell.tithi}
                    </Text>
                  )}

                  {/* Bottom row: festival dot + moon icon */}
                  <View style={styles.dayCellBottom}>
                    {hasFestival && <View style={styles.festivalDotSmall} />}
                    {cell.isPurnima && (
                      <Icon name="moon-full" size={10} color={colors.gold.main} />
                    )}
                    {cell.isAmavasya && (
                      <Icon name="moon-new" size={10} color={colors.primary.maroon} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Festival Legend */}
          {festivalsInMonth.length > 0 && (
            <View style={styles.legendSection}>
              <Text style={styles.legendTitle}>{t('panchang.calendar.festivalsThisMonth')}</Text>
              {festivalsInMonth.map((f, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={styles.festivalDotLegend} />
                  <Text style={styles.legendDate}>
                    {f.date} {monthName.substring(0, 3)}
                  </Text>
                  <Text style={styles.legendName}>{f.name}</Text>
                </View>
              ))}
            </View>
          )}

          {!fetchError && (!monthData?.days || monthData.days.length === 0) && (
            <View style={styles.emptyState}>
              <Icon name="calendar-blank-outline" size={40} color={colors.text.secondary} />
              <Text style={styles.emptyStateTitle}>{t('panchang.calendar.emptyTitle')}</Text>
              <Text style={styles.emptyStateSubtitle}>{t('panchang.calendar.emptySubtitle')}</Text>
            </View>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* Day Detail Modal */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'ios' ? spacing.lg : spacing.xl }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDay?.date} {monthName} {year}
            </Text>
            <TouchableOpacity onPress={() => setDetailVisible(false)}>
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {dayDetailLoading ? (
            <View style={styles.dayDetailLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.saffron} />
              <Text style={styles.dayDetailLoadingText}>{t('panchang.calendar.loadingFull')}</Text>
            </View>
          ) : selectedDay ? (
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
              {/* Tithi */}
              <DetailRow label={t('panchang.tithi')} value={selectedDay.tithi || t('panchang.notAvailable')} />
              {selectedDay.tithiEndTime && (
                <DetailRow label={t('panchang.endsLabel')} value={selectedDay.tithiEndTime} />
              )}
              {selectedDay.paksha && (
                <DetailRow label={t('panchang.paksha')} value={selectedDay.paksha} />
              )}
              <DetailRow label={t('panchang.nakshatra')} value={selectedDay.nakshatra || t('panchang.notAvailable')} />
              {selectedDay.nakshatraDeity && (
                <DetailRow label={t('panchang.deity')} value={selectedDay.nakshatraDeity} />
              )}
              <DetailRow label={t('panchang.yoga')} value={selectedDay.yoga || t('panchang.notAvailable')} />
              <DetailRow label={t('panchang.karana')} value={selectedDay.karana || t('panchang.notAvailable')} />

              {selectedDay.hinduMonth && (
                <DetailRow label={t('panchang.hinduMonth')} value={selectedDay.hinduMonth} />
              )}
              {selectedDay.vikramSamvat && (
                <DetailRow label={t('panchang.vikramSamvat')} value={String(selectedDay.vikramSamvat)} />
              )}

              {selectedDay.sunrise && (
                <DetailRow label={t('panchang.sunrise')} value={selectedDay.sunrise} />
              )}
              {selectedDay.sunset && (
                <DetailRow label={t('panchang.sunset')} value={selectedDay.sunset} />
              )}
              {selectedDay.moonrise && (
                <DetailRow label={t('panchang.moonrise')} value={selectedDay.moonrise} />
              )}
              {selectedDay.moonset && (
                <DetailRow label={t('panchang.moonset')} value={selectedDay.moonset} />
              )}
              {selectedDay.brahmaMuhurta && (
                <DetailRow label={t('panchang.brahmaMuhurta')} value={selectedDay.brahmaMuhurta} />
              )}
              {selectedDay.abhijitMuhurta && (
                <DetailRow label={t('panchang.abhijitMuhurta')} value={selectedDay.abhijitMuhurta} />
              )}
              {selectedDay.rahuKaal && (
                <DetailRow
                  label={t('panchang.rahuKaal')}
                  value={selectedDay.rahuKaal}
                  variant="warning"
                />
              )}
              {selectedDay.yamaghanda && (
                <DetailRow label={t('panchang.yamaghanda')} value={selectedDay.yamaghanda} variant="warning" />
              )}
              {selectedDay.gulikaKaal && (
                <DetailRow label={t('panchang.gulikaKaal')} value={selectedDay.gulikaKaal} variant="warning" />
              )}

              {selectedDay.festival && (
                <View style={styles.modalFestival}>
                  <Icon name="party-popper" size={18} color={colors.primary.maroon} />
                  <Text style={styles.modalFestivalText}>{selectedDay.festival}</Text>
                </View>
              )}

              {selectedDay.isPurnima && (
                <View style={styles.moonBanner}>
                  <Icon name="moon-full" size={18} color={colors.gold.main} />
                  <Text style={styles.moonBannerText}>{t('panchang.purnima')}</Text>
                </View>
              )}
              {selectedDay.isAmavasya && (
                <View style={[styles.moonBanner, styles.moonBannerDark]}>
                  <Icon name="moon-new" size={18} color={colors.primary.maroon} />
                  <Text style={[styles.moonBannerText, { color: colors.primary.maroon }]}>
                    {t('panchang.amavasya')}
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: 'warning';
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View
      style={[
        styles.detailRow,
        variant === 'warning' && styles.detailRowWarning,
      ]}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          variant === 'warning' && styles.detailValueWarning,
        ]}
      >
        {value}
      </Text>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.warmWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold as string,
  },
  backButton: {
    padding: spacing.xs,
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navArrow: {
    padding: spacing.xs,
  },
  monthLabel: {
    alignItems: 'center',
  },
  monthName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  yearText: {
    fontSize: 14,
    color: colors.gold.dark,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Weekday headers
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  weekdayCell: {
    width: DAY_SIZE,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(227, 66, 52, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(227, 66, 52, 0.25)',
    gap: spacing.xs,
  },
  errorBannerText: {
    flex: 1,
    color: colors.primary.vermillion,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  emptyStateTitle: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptyStateSubtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 13,
    color: colors.text.secondary,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  sundayText: {
    color: colors.primary.vermillion,
  },

  // Calendar grid
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: 1,
  },
  todayCell: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.primary.saffron,
    borderRadius: borderRadius.sm,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  todayNumber: {
    color: colors.primary.saffron,
    fontWeight: '700',
  },
  sundayNumber: {
    color: colors.primary.vermillion,
  },
  tithiIndicator: {
    fontSize: 8,
    color: colors.text.secondary,
    marginTop: 1,
    maxWidth: DAY_SIZE - 4,
    textAlign: 'center',
  },
  dayCellBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  festivalDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.gold.main,
  },

  // Legend
  legendSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  festivalDotLegend: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold.main,
    marginRight: spacing.sm,
  },
  legendDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    width: 56,
  },
  legendName: {
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold as string,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dayDetailLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  dayDetailLoadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold as string,
  },
  detailRowWarning: {
    backgroundColor: 'rgba(198, 40, 40, 0.06)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'right',
    flex: 1,
  },
  detailValueWarning: {
    color: colors.status.error,
  },
  modalFestival: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
    borderRadius: borderRadius.md,
  },
  modalFestivalText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginLeft: spacing.sm,
  },
  moonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 213, 79, 0.2)',
    borderRadius: borderRadius.md,
  },
  moonBannerDark: {
    backgroundColor: 'rgba(128, 0, 32, 0.08)',
  },
  moonBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold.dark,
    marginLeft: spacing.sm,
  },
});
