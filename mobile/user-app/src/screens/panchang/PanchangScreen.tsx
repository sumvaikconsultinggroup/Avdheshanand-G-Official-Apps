import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { getPanchangFestivals, getPanchangToday } from '../../services/panchangApi';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import CityPickerModal, { City } from './CityPickerModal';

const STORAGE_KEY_CITY = '@panchang_selected_city';
const DEFAULT_CITY: City = {
  _id: 'default',
  name: 'Haridwar',
  state: 'Uttarakhand',
  country: 'India',
  lat: 29.9457,
  lng: 78.1642,
  timezone: 'Asia/Kolkata',
};

// ─── Full Enhanced PanchangData Interface ─────────────────────────────
interface RashiInfo {
  name?: string;
  nameHindi?: string;
  number?: number;
  lord?: string;
  degree?: number;
}

interface HoraInfo {
  planet?: string;
  planetHindi?: string;
  number?: number;
  isDay?: boolean;
  nature?: string;
  suitableFor?: string;
}

interface DishaShoolInfo {
  direction?: string;
  directionHindi?: string;
  avoidTravel?: string;
  remedy?: string;
}

interface DayQualityInfo {
  score?: number;
  label?: string;
  labelHindi?: string;
  color?: string;
}

interface AuspiciousActivity {
  activity?: string;
  activityHindi?: string;
  suitable?: boolean;
  reason?: string;
}

interface TimePeriod {
  start?: string;
  end?: string;
}

interface PanchangData {
  date?: string;
  tithi?: { name?: string; paksha?: string; number?: number; startTime?: string; endTime?: string };
  nakshatra?: { name?: string; deity?: string; planet?: string; pada?: number; endTime?: string };
  yoga?: { name?: string; nature?: string; number?: number };
  karana?: { name?: string; first?: string; second?: string; currentHalf?: string };
  hinduMonth?: string;
  vikramSamvat?: number | string;
  samvatName?: string;
  shakaSamvat?: number;
  ritu?: string;
  ayana?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  dayName?: string;
  dayNameHindi?: string;
  dayOfWeek?: number;
  festival?: string | null;
  festivals?: string[];
  brahmaMuhurta?: TimePeriod;
  abhijitMuhurta?: TimePeriod;
  rahuKaal?: TimePeriod;
  yamaghanda?: TimePeriod;
  gulikaKaal?: TimePeriod;
  muhurta?: {
    brahmaMuhurta?: TimePeriod;
    abhijitMuhurta?: TimePeriod;
    rahuKaal?: TimePeriod;
    yamaghanda?: TimePeriod;
    gulikaKaal?: TimePeriod;
  };
  // Enhanced fields
  moonRashi?: RashiInfo;
  sunRashi?: RashiInfo;
  hora?: HoraInfo;
  dishaShool?: DishaShoolInfo;
  dayQuality?: DayQualityInfo;
  durMuhurta?: Array<{ start?: string; end?: string; warning?: string }>;
  varjyam?: TimePeriod | null;
  auspiciousActivities?: AuspiciousActivity[];
  choghadiya?: {
    day?: Array<{ name?: string; start?: string; end?: string; nature?: string }>;
    night?: Array<{ name?: string; start?: string; end?: string; nature?: string }>;
  };
  ekadashi?: { name?: string; significance?: string };
  isPurnima?: boolean;
  isAmavasya?: boolean;
  vratDays?: string[];
  paksha?: string;
}

interface Festival {
  _id?: string;
  name: string;
  date: string;
  daysUntil?: number;
  description?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function unwrapPayload<T = unknown>(payload: unknown, maxDepth = 3): T | null {
  let current: unknown = payload;
  for (let i = 0; i < maxDepth; i += 1) {
    if (current && typeof current === 'object' && 'success' in (current as Record<string, unknown>) && 'data' in (current as Record<string, unknown>)) {
      current = (current as { data?: unknown }).data;
      continue;
    }
    break;
  }
  return (current as T) ?? null;
}

function hasMeaningfulPanchangData(payload: Partial<PanchangData>): boolean {
  return Boolean(payload.tithi?.name || payload.nakshatra?.name || payload.yoga?.name || payload.sunrise);
}

function normalizePanchang(payload: unknown): PanchangData | null {
  const data = unwrapPayload<PanchangData>(payload);
  if (!data || typeof data !== 'object' || !hasMeaningfulPanchangData(data)) return null;

  const festivals = Array.isArray(data.festivals) ? data.festivals : [];
  const muhurta = data.muhurta || {
    brahmaMuhurta: data.brahmaMuhurta,
    abhijitMuhurta: data.abhijitMuhurta,
    rahuKaal: data.rahuKaal,
    yamaghanda: data.yamaghanda,
    gulikaKaal: data.gulikaKaal,
  };

  return {
    ...data,
    karana: data.karana ? { ...data.karana, name: data.karana.name || data.karana.first || data.karana.second } : undefined,
    festivals,
    festival: data.festival || festivals[0] || null,
    muhurta,
  };
}

function formatTime(time?: string): string {
  if (!time || time === 'N/A') return '--:--';
  return time;
}

function formatPeriod(p?: TimePeriod): string {
  if (!p?.start || !p?.end) return '--:-- - --:--';
  return `${p.start} - ${p.end}`;
}

function formatDisplayDate(date?: string, locale = 'en-IN'): string {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Sub-Components ──────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof Icon>['name']; title: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={18} color={colors.primary.saffron} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function TimeBox({ icon, label, time }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; time: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.timeBox}>
      <Icon name={icon} size={20} color={colors.gold.dark} />
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{time}</Text>
    </View>
  );
}

function MuhurtaRow({ label, start, end, variant, note }: {
  label: string; start?: string; end?: string;
  variant: 'auspicious' | 'inauspicious'; note?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isAuspicious = variant === 'auspicious';
  return (
    <View style={[styles.muhurtaRow, isAuspicious ? styles.muhurtaAuspicious : styles.muhurtaInauspicious]}>
      <View style={styles.muhurtaInfo}>
        <Text style={styles.muhurtaLabel}>{label}</Text>
        {note && (
          <View style={styles.muhurtaNote}>
            <Icon name="meditation" size={12} color={colors.status.success} />
            <Text style={styles.muhurtaNoteText}>{note}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.muhurtaTime, isAuspicious ? styles.muhurtaTimeGreen : styles.muhurtaTimeRed]}>
        {start && end ? `${start} - ${end}` : t('panchang.periodUnavailable')}
      </Text>
    </View>
  );
}

function DayQualityBadge({ quality, showHindiMeta }: { quality?: DayQualityInfo; showHindiMeta: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!quality?.score) return null;
  const dots = Array.from({ length: 10 }, (_, i) => i < (quality.score || 0));
  return (
    <View style={styles.dayQualityContainer}>
      <View style={styles.dayQualityDots}>
        {dots.map((filled, i) => (
          <View key={i} style={[styles.dayQualityDot, { backgroundColor: filled ? (quality.color || '#CA8A04') : '#E5E7EB' }]} />
        ))}
      </View>
      <Text style={[styles.dayQualityScore, { color: quality.color || '#CA8A04' }]}>{quality.score}/10</Text>
      <Text style={styles.dayQualityLabel}>{quality.label}</Text>
      {showHindiMeta && quality.labelHindi && <Text style={styles.dayQualityLabelHindi}>({quality.labelHindi})</Text>}
    </View>
  );
}

function InfoChip({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.infoChip}>
      <Text style={styles.infoChipLabel}>{label}</Text>
      <Text style={[styles.infoChipValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

export default function PanchangScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const resolvedLanguage = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const showHindiMeta = resolvedLanguage === 'hi';

  const [selectedCity, setSelectedCity] = useState<City>(DEFAULT_CITY);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => { loadSavedCity(); }, []);
  useEffect(() => { fetchPanchangData(); }, [selectedCity]);

  const loadSavedCity = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_CITY);
      if (stored) setSelectedCity(JSON.parse(stored) as City);
    } catch {}
  };

  const saveCity = async (city: City) => {
    try { await AsyncStorage.setItem(STORAGE_KEY_CITY, JSON.stringify(city)); } catch {}
  };

  const fetchPanchangData = async () => {
    if (!refreshing) setLoading(true);
    setFetchError(null);
    const [panchangResult, festivalsResult] = await Promise.allSettled([
      getPanchangToday({
        lat: selectedCity.lat,
        lng: selectedCity.lng,
        city: selectedCity.name,
        timezone: selectedCity.timezone,
      }),
      getPanchangFestivals({ upcoming: true, limit: 5 }),
    ]);

    if (panchangResult.status === 'fulfilled') {
      const normalized = normalizePanchang(panchangResult.value);
      if (normalized) {
        setPanchang(normalized);
      } else {
        setPanchang(null);
        setFetchError(t('panchang.errors.incompleteData'));
      }
    } else {
      if (panchangResult.reason instanceof Error) {
        console.warn('Panchang data fetch failed:', panchangResult.reason.message);
      }
      setPanchang(null);
      setFetchError(t('panchang.errors.loadFailed'));
    }

    if (festivalsResult.status === 'fulfilled') {
      const rawFestivalData = unwrapPayload<any[]>(festivalsResult.value) || [];
      const festivalData = Array.isArray(rawFestivalData) ? rawFestivalData : [];
      setFestivals(
        festivalData.map((f: any) => {
          const festDate = new Date(f.date);
          const now = new Date();
          const daysUntil = Math.max(0, Math.ceil((festDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          return { ...f, daysUntil };
        }),
      );
    } else {
      if (festivalsResult.reason instanceof Error) {
        console.warn('Panchang festival list unavailable:', festivalsResult.reason.message);
      }
      setFestivals([]);
    }

    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPanchangData();
    setRefreshing(false);
  }, [selectedCity]);

  const handleSelectCity = (city: City) => { setSelectedCity(city); saveCity(city); };
  const handleGPSLocation = (lat: number, lng: number, cityName?: string, timezone?: string) => {
    const gpsCity: City = {
      _id: 'gps',
      name: cityName || 'Current Location',
      country: '',
      lat,
      lng,
      timezone,
    };
    setSelectedCity(gpsCity); saveCity(gpsCity);
  };

  const isEkadashi = (panchang?.tithi?.number === 11 || panchang?.tithi?.number === 26);
  const primaryFestival = panchang?.festival || panchang?.festivals?.[0];
  const displayDate = formatDisplayDate(panchang?.date, resolvedLanguage === 'en' ? 'en-IN' : `${resolvedLanguage}-IN`);
  const displayDay = showHindiMeta ? (panchang?.dayNameHindi || panchang?.dayName || '') : (panchang?.dayName || panchang?.dayNameHindi || '');
  const displayLocation = [selectedCity.name, selectedCity.timezone].filter(Boolean).join(' • ');

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
        <Text style={styles.loadingText}>{t('panchang.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* City Selector Bar */}
      <View style={styles.cityBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7} accessibilityRole="button">
          <Icon name="arrow-left" size={22} color={colors.primary.maroon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.citySelector} onPress={() => setCityPickerVisible(true)} activeOpacity={0.7}>
          <Icon name="map-marker" size={18} color={colors.primary.saffron} />
          <Text style={styles.cityName} numberOfLines={1}>{selectedCity.name}</Text>
          <Icon name="chevron-down" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.gpsButton} onPress={() => setCityPickerVisible(true)} activeOpacity={0.7}>
          <Icon name="crosshairs-gps" size={20} color={colors.primary.saffron} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellButton} onPress={() => navigation.navigate('NotificationPreferences')} activeOpacity={0.7}>
          <Icon name="bell-outline" size={20} color={colors.gold.dark} />
        </TouchableOpacity>
      </View>

      {!!fetchError && (
        <TouchableOpacity style={styles.errorBanner} onPress={onRefresh} activeOpacity={0.8}>
          <Icon name="alert-circle-outline" size={16} color={colors.primary.vermillion} />
          <Text style={styles.errorText}>{fetchError} - {t('panchang.tapToRetry')}</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.saffron]} tintColor={colors.primary.saffron} />}
      >
        {!panchang ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-blank-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyStateText}>{t('panchang.emptyTitle')}</Text>
            <Text style={styles.emptyStateSubText}>{t('panchang.emptySubtitle')}</Text>
          </View>
        ) : (
          <>
            {/* ═══ DAY QUALITY BANNER ═══ */}
            {panchang.dayQuality && (
              <View style={styles.dayQualityBanner}>
                <DayQualityBadge quality={panchang.dayQuality} showHindiMeta={showHindiMeta} />
                <Text style={styles.dayInfoText}>
                  {showHindiMeta ? (panchang.dayNameHindi || panchang.dayName || '') : (panchang.dayName || panchang.dayNameHindi || '')} {panchang.hinduMonth ? `\u00B7 ${panchang.hinduMonth}` : ''}
                  {panchang.samvatName ? ` \u00B7 ${panchang.samvatName}` : ''}
                </Text>
              </View>
            )}

            {/* ═══ HERO PANCHANG CARD ═══ */}
            <View style={[styles.heroCard, isEkadashi && styles.ekadashiCard]}>
              {isEkadashi && (
                <LinearGradient colors={['rgba(212,160,23,0.15)', 'rgba(212,160,23,0.05)']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              )}
              <Text style={styles.heroLabel}>{t('panchang.title')}</Text>
              <Text style={styles.heroSubLabel}>{t('panchang.heroSubtitle')}</Text>
              {(displayDay || displayDate) && (
                <View style={styles.heroMetaWrap}>
                  <View style={styles.heroDateBadge}>
                    <Icon name="calendar-month-outline" size={16} color={colors.primary.maroon} />
                    <Text style={styles.heroDateText}>
                      {[displayDay, displayDate].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                  {!!displayLocation && (
                    <View style={styles.heroLocationBadge}>
                      <Icon name="map-marker-radius-outline" size={15} color={colors.gold.dark} />
                      <Text style={styles.heroLocationText}>{displayLocation}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Tithi */}
              <View style={styles.tithiRow}>
                <View style={styles.tithiMain}>
                  <Text style={styles.tithiLabel}>{t('panchang.tithi')}</Text>
                  <Text style={styles.tithiName}>{panchang.tithi?.name || t('panchang.notAvailable')}</Text>
                  {panchang.tithi?.endTime && <Text style={styles.tithiEndTime}>{t('panchang.endsLabel')}: {formatTime(panchang.tithi.endTime)}</Text>}
                </View>
                {panchang.tithi?.paksha && (
                  <View style={[styles.pakshaBadge, panchang.tithi.paksha.toLowerCase().includes('shukla') ? styles.shukla : styles.krishna]}>
                    <Text style={styles.pakshaText}>{panchang.tithi.paksha}</Text>
                  </View>
                )}
              </View>

              {isEkadashi && (
                <View style={styles.ekadashiBanner}>
                  <Icon name="star-four-points" size={14} color={colors.gold.dark} />
                  <Text style={styles.ekadashiText}>{t('panchang.ekadashiBanner')}</Text>
                  <Icon name="star-four-points" size={14} color={colors.gold.dark} />
                </View>
              )}

              {/* Nakshatra */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('panchang.nakshatra')}</Text>
                <Text style={styles.infoValue}>
                  {panchang.nakshatra?.name || t('panchang.notAvailable')}
                  {panchang.nakshatra?.deity ? ` (${panchang.nakshatra.deity})` : ''}
                </Text>
                {panchang.nakshatra?.pada && <Text style={styles.infoSubValue}>{t('panchang.pada')} {panchang.nakshatra.pada} {panchang.nakshatra.planet ? `\u00B7 ${panchang.nakshatra.planet}` : ''}</Text>}
              </View>

              {/* Yoga & Karana Grid */}
              <View style={styles.gridRow}>
                <View style={styles.gridCell}>
                  <Text style={styles.gridLabel}>{t('panchang.yoga')}</Text>
                  <Text style={styles.gridValue}>{panchang.yoga?.name || t('panchang.notAvailable')}</Text>
                  {panchang.yoga?.nature && (
                    <View style={[styles.natureBadge, panchang.yoga.nature === 'shubh' ? styles.natureBadgeGood : panchang.yoga.nature === 'ashubh' ? styles.natureBadgeBad : styles.natureBadgeNeutral]}>
                      <Text style={[styles.natureBadgeText, panchang.yoga.nature === 'shubh' ? styles.natureBadgeTextGood : panchang.yoga.nature === 'ashubh' ? styles.natureBadgeTextBad : styles.natureBadgeTextNeutral]}>
                        {panchang.yoga.nature}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.gridDivider} />
                <View style={styles.gridCell}>
                  <Text style={styles.gridLabel}>{t('panchang.karana')}</Text>
                  <Text style={styles.gridValue}>{panchang.karana?.name || t('panchang.notAvailable')}</Text>
                </View>
              </View>

              {/* Samvat Row */}
              <View style={styles.samvatRow}>
                {panchang.vikramSamvat && <Text style={styles.samvatText}>{t('panchang.vikramSamvat')} {panchang.vikramSamvat}</Text>}
                {panchang.shakaSamvat && <Text style={styles.samvatText}>{t('panchang.shakaSamvat')} {panchang.shakaSamvat}</Text>}
              </View>
            </View>

            {/* ═══ RASHI & HORA (NEW) ═══ */}
            {(panchang.moonRashi || panchang.sunRashi || panchang.hora) && (
              <View style={styles.section}>
                <SectionHeader icon="zodiac-aries" title={t('panchang.sections.rashiHora')} />
                <View style={styles.rashiGrid}>
                  {/* Moon Rashi */}
                  {panchang.moonRashi && (
                    <View style={styles.rashiCard}>
                      <Icon name="moon-waxing-crescent" size={22} color="#60A5FA" />
                      <Text style={styles.rashiCardLabel}>{t('panchang.moonRashi')}</Text>
                      <Text style={styles.rashiCardValue}>{panchang.moonRashi.name || '--'}</Text>
                      {showHindiMeta && panchang.moonRashi.nameHindi && <Text style={styles.rashiCardHindi}>{panchang.moonRashi.nameHindi}</Text>}
                      {panchang.moonRashi.lord && <Text style={styles.rashiCardSub}>{t('panchang.lordLabel')}: {panchang.moonRashi.lord}</Text>}
                      {panchang.moonRashi.degree !== undefined && <Text style={styles.rashiCardDegree}>{panchang.moonRashi.degree}°</Text>}
                    </View>
                  )}
                  {/* Sun Rashi */}
                  {panchang.sunRashi && (
                    <View style={styles.rashiCard}>
                      <Icon name="white-balance-sunny" size={22} color="#FB923C" />
                      <Text style={styles.rashiCardLabel}>{t('panchang.sunRashi')}</Text>
                      <Text style={styles.rashiCardValue}>{panchang.sunRashi.name || '--'}</Text>
                      {showHindiMeta && panchang.sunRashi.nameHindi && <Text style={styles.rashiCardHindi}>{panchang.sunRashi.nameHindi}</Text>}
                      {panchang.sunRashi.lord && <Text style={styles.rashiCardSub}>{t('panchang.lordLabel')}: {panchang.sunRashi.lord}</Text>}
                    </View>
                  )}
                </View>

                {/* Hora */}
                {panchang.hora && (
                  <View style={[styles.horaCard, panchang.hora.nature === 'shubh' ? styles.horaCardGood : panchang.hora.nature === 'ashubh' ? styles.horaCardBad : styles.horaCardNeutral]}>
                    <View style={styles.horaHeader}>
                      <Icon name="clock-outline" size={20} color={panchang.hora.nature === 'shubh' ? '#16A34A' : panchang.hora.nature === 'ashubh' ? '#DC2626' : '#CA8A04'} />
                      <Text style={styles.horaTitle}>{t('panchang.currentHora')}</Text>
                      <View style={[styles.horaNatureBadge, panchang.hora.nature === 'shubh' ? styles.horaGood : panchang.hora.nature === 'ashubh' ? styles.horaBad : styles.horaNeutral]}>
                        <Text style={[styles.horaNatureText, panchang.hora.nature === 'shubh' ? { color: '#16A34A' } : panchang.hora.nature === 'ashubh' ? { color: '#DC2626' } : { color: '#CA8A04' }]}>{panchang.hora.nature}</Text>
                      </View>
                    </View>
                    <Text style={styles.horaPlanet}>{panchang.hora.planet}{showHindiMeta && panchang.hora.planetHindi ? ` (${panchang.hora.planetHindi})` : ''}</Text>
                    {panchang.hora.suitableFor && <Text style={styles.horaSuitable}>{panchang.hora.suitableFor}</Text>}
                  </View>
                )}
              </View>
            )}

            {/* ═══ SUN & MOON TIMES ═══ */}
            <View style={styles.timesRow}>
              <TimeBox icon="weather-sunset-up" label={t('panchang.sunrise')} time={formatTime(panchang.sunrise)} />
              <TimeBox icon="weather-sunset-down" label={t('panchang.sunset')} time={formatTime(panchang.sunset)} />
              <TimeBox icon="moon-waxing-crescent" label={t('panchang.moonrise')} time={formatTime(panchang.moonrise)} />
              <TimeBox icon="moon-waning-crescent" label={t('panchang.moonset')} time={formatTime(panchang.moonset)} />
            </View>

            {/* ═══ FESTIVAL BANNER ═══ */}
            {primaryFestival && (
              <View style={styles.festivalBanner}>
                <LinearGradient colors={[colors.gold.light, colors.gold.main]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.festivalGradient}>
                  <Icon name="party-popper" size={22} color={colors.primary.maroon} />
                  <Text style={styles.festivalText}>{primaryFestival}</Text>
                  <Icon name="party-popper" size={22} color={colors.primary.maroon} />
                </LinearGradient>
              </View>
            )}

            {/* ═══ MUHURTA TIMINGS ═══ */}
            <View style={styles.section}>
              <SectionHeader icon="clock-time-four-outline" title={t('panchang.sections.muhurta')} />
              <Text style={styles.muhurtaGroupLabel}>{t('panchang.auspiciousGroup')}</Text>
              <MuhurtaRow label={t('panchang.brahmaMuhurta')} start={panchang.muhurta?.brahmaMuhurta?.start} end={panchang.muhurta?.brahmaMuhurta?.end} variant="auspicious" note={t('panchang.bestForMeditation')} />
              <MuhurtaRow label={t('panchang.abhijitMuhurta')} start={panchang.muhurta?.abhijitMuhurta?.start} end={panchang.muhurta?.abhijitMuhurta?.end} variant="auspicious" />

              <Text style={[styles.muhurtaGroupLabel, { marginTop: spacing.md }]}>{t('panchang.inauspiciousGroup')}</Text>
              <MuhurtaRow label={t('panchang.rahuKaal')} start={panchang.muhurta?.rahuKaal?.start} end={panchang.muhurta?.rahuKaal?.end} variant="inauspicious" />
              <MuhurtaRow label={t('panchang.yamaghanda')} start={panchang.muhurta?.yamaghanda?.start} end={panchang.muhurta?.yamaghanda?.end} variant="inauspicious" />
              <MuhurtaRow label={t('panchang.gulikaKaal')} start={panchang.muhurta?.gulikaKaal?.start} end={panchang.muhurta?.gulikaKaal?.end} variant="inauspicious" />

              {/* Dur Muhurta */}
              {panchang.durMuhurta && panchang.durMuhurta.length > 0 && panchang.durMuhurta.map((dm, i) => (
                <MuhurtaRow key={`dur-${i}`} label={`${t('panchang.durMuhurta')}${panchang.durMuhurta!.length > 1 ? ` ${i + 1}` : ''}`} start={dm.start} end={dm.end} variant="inauspicious" />
              ))}

              {/* Varjyam */}
              {panchang.varjyam && (
                <MuhurtaRow label={t('panchang.varjyam')} start={panchang.varjyam.start} end={panchang.varjyam.end} variant="inauspicious" />
              )}
            </View>

            {/* ═══ DISHA SHOOL (NEW) ═══ */}
            {panchang.dishaShool && (
              <View style={styles.section}>
                <SectionHeader icon="compass-outline" title={t('panchang.sections.dishaShool')} />
                <View style={styles.dishaShoolCard}>
                  <View style={styles.dishaShoolHeader}>
                    <Icon name="compass" size={28} color={colors.status.warning} />
                    <View style={styles.dishaShoolInfo}>
                      <Text style={styles.dishaShoolDirection}>
                        {panchang.dishaShool.direction}
                        {showHindiMeta && panchang.dishaShool.directionHindi ? ` (${panchang.dishaShool.directionHindi})` : ''}
                      </Text>
                      <Text style={styles.dishaShoolWarning}>{panchang.dishaShool.avoidTravel}</Text>
                    </View>
                  </View>
                  {panchang.dishaShool.remedy && (
                    <View style={styles.dishaShoolRemedy}>
                      <Icon name="shield-check-outline" size={16} color={colors.status.success} />
                      <Text style={styles.dishaShoolRemedyText}>{t('panchang.remedyLabel')}: {panchang.dishaShool.remedy}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ═══ AUSPICIOUS ACTIVITIES (NEW) ═══ */}
            {panchang.auspiciousActivities && panchang.auspiciousActivities.length > 0 && (
              <View style={styles.section}>
                <SectionHeader icon="check-decagram-outline" title={t('panchang.sections.auspiciousActivities')} />
                {panchang.auspiciousActivities.map((act, i) => (
                  <View key={i} style={[styles.activityRow, act.suitable ? styles.activityRowGood : styles.activityRowBad]}>
                    <Icon name={act.suitable ? 'check-circle' : 'close-circle'} size={20} color={act.suitable ? '#16A34A' : '#DC2626'} />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>
                        {act.activity}{showHindiMeta && act.activityHindi ? ` (${act.activityHindi})` : ''}
                      </Text>
                      <Text style={styles.activityReason}>{act.reason}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ═══ CHOGHADIYA ═══ */}
            {panchang.choghadiya && (
              <View style={styles.section}>
                <SectionHeader icon="view-grid-outline" title={t('panchang.sections.choghadiya')} />
                {/* Day Choghadiya */}
                <Text style={styles.choghadiyaSubLabel}>{t('panchang.day')}</Text>
                {panchang.choghadiya.day?.map((p, i) => (
                  <View key={`day-${i}`} style={[styles.choghadiyaRow, { backgroundColor: p.nature === 'shubh' || p.nature === 'amrit' || p.nature === 'labh' ? 'rgba(22,163,74,0.06)' : p.nature === 'rog' || p.nature === 'kaal' ? 'rgba(220,38,38,0.06)' : 'rgba(202,138,4,0.06)' }]}>
                    <Text style={styles.choghadiyaName}>{p.name}</Text>
                    <View style={[styles.choghadiyaNature, { backgroundColor: p.nature === 'shubh' || p.nature === 'amrit' || p.nature === 'labh' ? '#DCFCE7' : p.nature === 'rog' || p.nature === 'kaal' ? '#FEE2E2' : '#FEF9C3' }]}>
                      <Text style={[styles.choghadiyaNatureText, { color: p.nature === 'shubh' || p.nature === 'amrit' || p.nature === 'labh' ? '#16A34A' : p.nature === 'rog' || p.nature === 'kaal' ? '#DC2626' : '#CA8A04' }]}>{p.nature}</Text>
                    </View>
                    <Text style={styles.choghadiyaTime}>{formatTime(p.start)} - {formatTime(p.end)}</Text>
                  </View>
                ))}
                {/* Night Choghadiya */}
                <Text style={[styles.choghadiyaSubLabel, { marginTop: spacing.md }]}>{t('panchang.night')}</Text>
                {panchang.choghadiya.night?.map((p, i) => (
                  <View key={`night-${i}`} style={[styles.choghadiyaRow, { backgroundColor: p.nature === 'shubh' || p.nature === 'amrit' || p.nature === 'labh' ? 'rgba(22,163,74,0.06)' : p.nature === 'rog' || p.nature === 'kaal' ? 'rgba(220,38,38,0.06)' : 'rgba(202,138,4,0.06)' }]}>
                    <Text style={styles.choghadiyaName}>{p.name}</Text>
                    <View style={[styles.choghadiyaNature, { backgroundColor: p.nature === 'shubh' || p.nature === 'amrit' || p.nature === 'labh' ? '#DCFCE7' : p.nature === 'rog' || p.nature === 'kaal' ? '#FEE2E2' : '#FEF9C3' }]}>
                      <Text style={[styles.choghadiyaNatureText, { color: p.nature === 'shubh' || p.nature === 'amrit' || p.nature === 'labh' ? '#16A34A' : p.nature === 'rog' || p.nature === 'kaal' ? '#DC2626' : '#CA8A04' }]}>{p.nature}</Text>
                    </View>
                    <Text style={styles.choghadiyaTime}>{formatTime(p.start)} - {formatTime(p.end)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ═══ HINDU CALENDAR INFO ═══ */}
            <View style={styles.section}>
              <SectionHeader icon="calendar-text" title={t('panchang.sections.hinduCalendar')} />
              <View style={styles.calendarInfoGrid}>
                {panchang.hinduMonth && <InfoChip label={t('panchang.month')} value={panchang.hinduMonth} />}
                {panchang.ritu && <InfoChip label={t('panchang.ritu')} value={panchang.ritu} />}
                {panchang.ayana && <InfoChip label={t('panchang.ayana')} value={panchang.ayana} />}
                {panchang.samvatName && <InfoChip label={t('panchang.samvat')} value={panchang.samvatName} />}
              </View>
            </View>

            {/* ═══ VRAT DAYS ═══ */}
            {panchang.vratDays && panchang.vratDays.length > 0 && (
              <View style={styles.section}>
                <SectionHeader icon="food-off" title={t('panchang.sections.vratDays')} />
                <View style={styles.vratContainer}>
                  {panchang.vratDays.map((v, i) => (
                    <View key={i} style={styles.vratBadge}>
                      <Icon name="star-four-points-outline" size={14} color={colors.gold.dark} />
                      <Text style={styles.vratText}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ═══ UPCOMING FESTIVALS ═══ */}
            {festivals.length > 0 && (
              <View style={styles.section}>
                <SectionHeader icon="party-popper" title={t('panchang.sections.upcomingFestivals')} />
                {festivals.map((fest, idx) => (
                  <View key={fest._id || idx} style={styles.festivalRow}>
                    <View style={styles.festivalDot} />
                    <View style={styles.festivalInfo}>
                      <Text style={styles.festivalName}>{fest.name}</Text>
                      <Text style={styles.festivalDate}>
                        {new Date(fest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.daysUntilBadge}>
                      <Text style={styles.daysUntilText}>
                        {fest.daysUntil === 0 ? t('panchang.today') : fest.daysUntil === 1 ? t('panchang.tomorrow') : t('panchang.daysCount', { count: fest.daysUntil })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ═══ VIEW FULL CALENDAR ═══ */}
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => navigation.navigate('PanchangCalendar', { lat: selectedCity.lat, lng: selectedCity.lng, cityName: selectedCity.name, timezone: selectedCity.timezone })}
              activeOpacity={0.7}
            >
              <LinearGradient colors={[colors.primary.saffron, colors.primary.maroon]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.calendarButtonGradient}>
                <Icon name="calendar-month" size={20} color={colors.text.white} />
                <Text style={styles.calendarButtonText}>{t('panchang.viewFullCalendar')}</Text>
                <Icon name="arrow-right" size={18} color={colors.text.white} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: spacing.xxl }} />
          </>
        )}
      </ScrollView>

      <CityPickerModal visible={cityPickerVisible} onClose={() => setCityPickerVisible(false)} onSelectCity={handleSelectCity} onUseGPS={handleGPSLocation} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.parchment },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.parchment },
  loadingText: { marginTop: spacing.md, fontSize: 14, color: colors.text.secondary },

  // Empty state
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginTop: spacing.md },
  emptyStateSubText: { fontSize: 13, color: colors.text.secondary, marginTop: spacing.xs },

  // City Bar
  cityBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.background.warmWhite, borderBottomWidth: 1, borderBottomColor: colors.border.gold as string },
  backButton: { padding: spacing.xs, marginRight: spacing.xs },
  citySelector: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  cityName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text.primary, marginHorizontal: spacing.sm },
  gpsButton: { padding: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.background.parchment, marginLeft: spacing.xs },
  bellButton: { padding: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(212,160,23,0.08)', marginLeft: spacing.xs },
  errorBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: 'rgba(227, 66, 52, 0.08)', borderWidth: 1, borderColor: 'rgba(227, 66, 52, 0.25)', gap: spacing.xs },
  errorText: { color: colors.primary.vermillion, fontSize: 13, fontWeight: '600' },

  // Day Quality Banner
  dayQualityBanner: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.background.warmWhite, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.gold as string, alignItems: 'center', ...shadows.warm },
  dayQualityContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  dayQualityDots: { flexDirection: 'row', gap: 3 },
  dayQualityDot: { width: 8, height: 8, borderRadius: 4 },
  dayQualityScore: { fontSize: 16, fontWeight: '700', marginLeft: spacing.sm },
  dayQualityLabel: { fontSize: 13, color: colors.text.primary, fontWeight: '500' },
  dayQualityLabelHindi: { fontSize: 11, color: colors.text.secondary },
  dayInfoText: { fontSize: 12, color: colors.gold.dark, marginTop: spacing.xs, fontWeight: '500' },

  // Hero Card
  heroCard: { margin: spacing.lg, marginTop: spacing.sm, padding: spacing.xl, backgroundColor: colors.background.warmWhite, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border.gold as string, overflow: 'hidden', ...shadows.warm },
  ekadashiCard: { borderColor: colors.gold.main, borderWidth: 2 },
  heroLabel: { fontSize: 27, fontWeight: '800', color: colors.primary.maroon, textAlign: 'center', letterSpacing: 0.2 },
  heroSubLabel: { fontSize: 11, color: colors.gold.dark, textAlign: 'center', marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1.6, fontWeight: '700' },
  heroMetaWrap: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.xs },
  heroDateBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: spacing.xs, backgroundColor: 'rgba(128, 0, 32, 0.06)', borderWidth: 1, borderColor: 'rgba(128, 0, 32, 0.12)', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  heroDateText: { fontSize: 12, fontWeight: '600', color: colors.primary.maroon, textAlign: 'center' },
  heroLocationBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(212,160,23,0.08)', borderWidth: 1, borderColor: 'rgba(212,160,23,0.18)', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  heroLocationText: { fontSize: 11, fontWeight: '500', color: colors.gold.dark, textAlign: 'center' },
  tithiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xs, paddingBottom: spacing.lg },
  tithiMain: { alignItems: 'center' },
  tithiLabel: { fontSize: 11, color: colors.gold.dark, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  tithiName: { fontSize: 30, fontWeight: '800', color: colors.primary.saffron, letterSpacing: 0.2 },
  tithiEndTime: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  pakshaBadge: { marginLeft: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  shukla: { backgroundColor: 'rgba(255, 213, 79, 0.3)' },
  krishna: { backgroundColor: 'rgba(128, 0, 32, 0.15)' },
  pakshaText: { fontSize: 13, fontWeight: '600', color: colors.primary.maroon },
  ekadashiBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,160,23,0.15)', paddingVertical: spacing.xs, borderRadius: borderRadius.sm, marginBottom: spacing.md },
  ekadashiText: { fontSize: 13, fontWeight: '600', color: colors.gold.dark, marginHorizontal: spacing.sm },
  infoRow: { alignItems: 'center', paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(212,160,23,0.18)' },
  infoLabel: { fontSize: 11, color: colors.gold.dark, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  infoValue: { fontSize: 20, fontWeight: '700', color: colors.primary.maroon, textAlign: 'center' },
  infoSubValue: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  gridRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(212,160,23,0.18)', paddingTop: spacing.lg, paddingBottom: spacing.xs },
  gridCell: { flex: 1, alignItems: 'center' },
  gridDivider: { width: 1, backgroundColor: 'rgba(212,160,23,0.18)' },
  gridLabel: { fontSize: 11, fontWeight: '700', color: colors.gold.dark, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  gridLabelEn: { fontSize: 11, color: colors.text.secondary, marginBottom: spacing.xs },
  gridValue: { fontSize: 19, fontWeight: '700', color: colors.primary.maroon },
  natureBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  natureBadgeGood: { backgroundColor: 'rgba(22,163,74,0.1)' },
  natureBadgeBad: { backgroundColor: 'rgba(220,38,38,0.1)' },
  natureBadgeNeutral: { backgroundColor: 'rgba(202,138,4,0.1)' },
  natureBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  natureBadgeTextGood: { color: colors.status.success },
  natureBadgeTextBad: { color: colors.status.error },
  natureBadgeTextNeutral: { color: colors.gold.dark },
  samvatRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(212,160,23,0.18)', gap: spacing.lg },
  samvatText: { fontSize: 12, color: colors.gold.dark, fontWeight: '600', letterSpacing: 0.3 },

  // Rashi Section
  rashiGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  rashiCard: { flex: 1, backgroundColor: colors.background.warmWhite, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border.gold as string },
  rashiCardLabel: { fontSize: 10, color: colors.text.secondary, marginTop: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  rashiCardValue: { fontSize: 14, fontWeight: '700', color: colors.text.primary, marginTop: 2, textAlign: 'center' },
  rashiCardHindi: { fontSize: 15, color: colors.primary.saffron, fontWeight: '600' },
  rashiCardSub: { fontSize: 10, color: colors.text.secondary, marginTop: 2 },
  rashiCardDegree: { fontSize: 10, color: colors.gold.dark, fontWeight: '600' },

  // Hora Section
  horaCard: { borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, marginTop: spacing.xs },
  horaCardGood: { backgroundColor: 'rgba(22,163,74,0.05)', borderColor: 'rgba(22,163,74,0.2)' },
  horaCardBad: { backgroundColor: 'rgba(220,38,38,0.05)', borderColor: 'rgba(220,38,38,0.2)' },
  horaCardNeutral: { backgroundColor: 'rgba(202,138,4,0.05)', borderColor: 'rgba(202,138,4,0.2)' },
  horaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  horaTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary, flex: 1 },
  horaNatureBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  horaGood: { backgroundColor: 'rgba(22,163,74,0.1)' },
  horaBad: { backgroundColor: 'rgba(220,38,38,0.1)' },
  horaNeutral: { backgroundColor: 'rgba(202,138,4,0.1)' },
  horaNatureText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  horaPlanet: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginTop: spacing.sm },
  horaSuitable: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.xs, lineHeight: 18 },

  // Sun/Moon Times
  timesRow: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  timeBox: { flex: 1, alignItems: 'center', backgroundColor: colors.background.warmWhite, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border.gold as string },
  timeLabel: { fontSize: 10, color: colors.text.secondary, marginTop: spacing.xs },
  timeValue: { fontSize: 12, fontWeight: '600', color: colors.text.primary, marginTop: 2 },

  // Festival Banner
  festivalBanner: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.warm },
  festivalGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  festivalText: { fontSize: 16, fontWeight: '700', color: colors.primary.maroon, marginHorizontal: spacing.sm, textAlign: 'center' },

  // Section
  section: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary.maroon },
  sectionTitleHindi: { fontSize: 13, color: colors.gold.dark, fontWeight: '500' },

  // Muhurta
  muhurtaGroupLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.sm },
  muhurtaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  muhurtaAuspicious: { backgroundColor: 'rgba(46, 125, 50, 0.08)', borderLeftWidth: 3, borderLeftColor: '#2E7D32' },
  muhurtaInauspicious: { backgroundColor: 'rgba(198, 40, 40, 0.08)', borderLeftWidth: 3, borderLeftColor: '#C62828' },
  muhurtaInfo: { flex: 1 },
  muhurtaLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  muhurtaLabelEn: { fontSize: 12, color: colors.text.secondary },
  muhurtaNote: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  muhurtaNoteText: { fontSize: 11, color: colors.status.success, fontWeight: '500', marginLeft: 4 },
  muhurtaTime: { fontSize: 13, fontWeight: '600' },
  muhurtaTimeGreen: { color: colors.status.success },
  muhurtaTimeRed: { color: colors.status.error },

  // Disha Shool
  dishaShoolCard: { backgroundColor: 'rgba(217,119,6,0.06)', borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(217,119,6,0.2)' },
  dishaShoolHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dishaShoolInfo: { flex: 1 },
  dishaShoolDirection: { fontSize: 17, fontWeight: '700', color: colors.status.warning },
  dishaShoolWarning: { fontSize: 13, color: colors.status.warning, marginTop: 2 },
  dishaShoolRemedy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(217,119,6,0.15)' },
  dishaShoolRemedyText: { fontSize: 12, color: colors.status.success, flex: 1 },

  // Auspicious Activities
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1 },
  activityRowGood: { backgroundColor: 'rgba(22,163,74,0.05)', borderColor: 'rgba(22,163,74,0.15)' },
  activityRowBad: { backgroundColor: 'rgba(220,38,38,0.05)', borderColor: 'rgba(220,38,38,0.15)' },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  activityReason: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },

  // Choghadiya
  choghadiyaSubLabel: { fontSize: 13, fontWeight: '600', color: colors.gold.dark, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  choghadiyaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.sm, marginBottom: 4 },
  choghadiyaName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text.primary },
  choghadiyaNature: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: spacing.sm },
  choghadiyaNatureText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  choghadiyaTime: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },

  // Hindu Calendar Info
  calendarInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  infoChip: { backgroundColor: colors.background.warmWhite, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border.gold as string, minWidth: '45%' as any },
  infoChipLabel: { fontSize: 10, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoChipValue: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginTop: 2 },

  // Vrat
  vratContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  vratBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(212,160,23,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'rgba(212,160,23,0.2)' },
  vratText: { fontSize: 13, fontWeight: '600', color: colors.gold.dark },

  // Festival list
  festivalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.gold as string },
  festivalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold.main, marginRight: spacing.md },
  festivalInfo: { flex: 1 },
  festivalName: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  festivalDate: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  daysUntilBadge: { backgroundColor: colors.background.sandstone, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  daysUntilText: { fontSize: 12, fontWeight: '600', color: colors.gold.dark },

  // Calendar button
  calendarButton: { marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.temple },
  calendarButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  calendarButtonText: { fontSize: 16, fontWeight: '700', color: colors.text.white },
});
