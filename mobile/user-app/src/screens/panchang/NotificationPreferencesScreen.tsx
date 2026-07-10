import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { registerForPushNotifications } from '../../services/notifications';
import { resolveUserApiBaseUrl } from '../../services/api';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const STORAGE_KEY_NOTIF = '@panchang_notification_prefs';
const STORAGE_KEY_PUSH_TOKEN = '@push_notification_token';
const STORAGE_KEY_CITY = '@panchang_selected_city';

interface NotificationPrefs {
  dailyPanchang: boolean;
  festivalAlerts: boolean;
  brahmaMuhurtaAlert: boolean;
  language: string;
}

const LANGUAGE_OPTIONS = [
  { code: 'hi', label: 'Hindi', labelNative: 'हिन्दी' },
  { code: 'en', label: 'English', labelNative: 'English' },
  { code: 'sa', label: 'Sanskrit', labelNative: 'संस्कृतम्' },
  { code: 'gu', label: 'Gujarati', labelNative: 'ગુજરાતી' },
  { code: 'mr', label: 'Marathi', labelNative: 'मराठी' },
  { code: 'bn', label: 'Bengali', labelNative: 'বাংলা' },
  { code: 'ta', label: 'Tamil', labelNative: 'தமிழ்' },
  { code: 'te', label: 'Telugu', labelNative: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', labelNative: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', labelNative: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', labelNative: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'Odia', labelNative: 'ଓଡ଼ିଆ' },
];

async function syncPrefsToServer(pushToken: string, prefs: NotificationPrefs) {
  try {
    const storedCity = await AsyncStorage.getItem(STORAGE_KEY_CITY);
    const city = storedCity ? JSON.parse(storedCity) : { name: 'Haridwar', lat: 29.9457, lng: 78.1642, timezone: 'Asia/Kolkata' };
    
    const baseUrl = await resolveUserApiBaseUrl();
    await fetch(`${baseUrl}/api/notifications/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pushToken,
        platform: Platform.OS,
        language: prefs.language,
        cityName: city.name,
        lat: city.lat,
        lng: city.lng,
        timezone: city.timezone || 'Asia/Kolkata',
        dailyPanchang: prefs.dailyPanchang,
        festivalAlerts: prefs.festivalAlerts,
        brahmaMuhurtaAlert: prefs.brahmaMuhurtaAlert,
      }),
    });
  } catch {
    // Server sync failure is non-critical for local preference changes
  }
}

export default function NotificationPreferencesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    dailyPanchang: true,
    festivalAlerts: true,
    brahmaMuhurtaAlert: true,
    language: 'hi',
  });
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);

  useEffect(() => { loadPrefs(); }, []);

  const loadPrefs = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_NOTIF);
      if (stored) setPrefs(JSON.parse(stored));
      const token = await AsyncStorage.getItem(STORAGE_KEY_PUSH_TOKEN);
      setPushToken(token);
    } catch {} finally {
      setLoading(false);
    }
  };

  const savePrefs = async (updated: NotificationPrefs) => {
    setPrefs(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIF, JSON.stringify(updated));
      if (pushToken) syncPrefsToServer(pushToken, updated);
    } catch {}
  };

  const handleEnableNotifications = async () => {
    setSaving(true);
    try {
      const token = await registerForPushNotifications();
      if (token) {
        setPushToken(token);
        await AsyncStorage.setItem(STORAGE_KEY_PUSH_TOKEN, token);
        await syncPrefsToServer(token, prefs);
        Alert.alert(t('panchangNotifications.enabledTitle'), t('panchangNotifications.enabledMessage'));
      } else {
        Alert.alert(t('panchangNotifications.permissionDeniedTitle'), t('panchangNotifications.permissionDeniedMessage'));
      }
    } catch {
      Alert.alert(t('common.error'), t('panchangNotifications.enableFailedMessage'));
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    savePrefs(updated);
  };

  const selectLanguage = (code: string) => {
    const updated = { ...prefs, language: code };
    savePrefs(updated);
    setLanguagePickerVisible(false);
  };

  const selectedLang = LANGUAGE_OPTIONS.find(l => l.code === prefs.language) || LANGUAGE_OPTIONS[0];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.primary.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('panchangNotifications.headerTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Info */}
        <View style={styles.heroBanner}>
          <Icon name="bell-ring-outline" size={32} color={colors.gold.main} />
          <Text style={styles.heroTitle}>{t('panchangNotifications.heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('panchangNotifications.heroSubtitle')}</Text>
        </View>

        {/* Enable Notifications */}
        {!pushToken && (
          <TouchableOpacity style={styles.enableButton} onPress={handleEnableNotifications} disabled={saving} activeOpacity={0.7}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.text.white} />
            ) : (
              <>
                <Icon name="bell-plus" size={22} color={colors.text.white} />
                <Text style={styles.enableButtonText}>{t('panchangNotifications.enableButton')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {pushToken && (
          <View style={styles.enabledBadge}>
            <Icon name="check-circle" size={18} color="#16A34A" />
            <Text style={styles.enabledBadgeText}>{t('panchangNotifications.enabledBadge')}</Text>
          </View>
        )}

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('panchangNotifications.notificationTypes')}</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Icon name="calendar-today" size={22} color={colors.primary.saffron} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>{t('panchangNotifications.dailyPanchangLabel')}</Text>
                <Text style={styles.toggleDescription}>{t('panchangNotifications.dailyPanchangDescription')}</Text>
              </View>
            </View>
            <Switch
              value={prefs.dailyPanchang}
              onValueChange={() => togglePref('dailyPanchang')}
              trackColor={{ false: '#E5E7EB', true: 'rgba(255, 107, 0, 0.3)' }}
              thumbColor={prefs.dailyPanchang ? colors.primary.saffron : '#9CA3AF'}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Icon name="party-popper" size={22} color={colors.gold.main} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>{t('panchangNotifications.festivalAlertsLabel')}</Text>
                <Text style={styles.toggleDescription}>{t('panchangNotifications.festivalAlertsDescription')}</Text>
              </View>
            </View>
            <Switch
              value={prefs.festivalAlerts}
              onValueChange={() => togglePref('festivalAlerts')}
              trackColor={{ false: '#E5E7EB', true: 'rgba(212, 160, 23, 0.3)' }}
              thumbColor={prefs.festivalAlerts ? colors.gold.main : '#9CA3AF'}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Icon name="weather-sunset-up" size={22} color={colors.primary.maroon} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>{t('panchangNotifications.brahmaMuhurtaLabel')}</Text>
                <Text style={styles.toggleDescription}>{t('panchangNotifications.brahmaMuhurtaDescription')}</Text>
              </View>
            </View>
            <Switch
              value={prefs.brahmaMuhurtaAlert}
              onValueChange={() => togglePref('brahmaMuhurtaAlert')}
              trackColor={{ false: '#E5E7EB', true: 'rgba(128, 0, 32, 0.3)' }}
              thumbColor={prefs.brahmaMuhurtaAlert ? colors.primary.maroon : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('panchangNotifications.notificationLanguage')}</Text>
          <Text style={styles.sectionSubtitle}>{t('panchangNotifications.notificationLanguageSubtitle')}</Text>

          <TouchableOpacity style={styles.languageSelector} onPress={() => setLanguagePickerVisible(!languagePickerVisible)} activeOpacity={0.7}>
            <View style={styles.languageSelected}>
              <Text style={styles.languageSelectedText}>{selectedLang.labelNative}</Text>
              <Text style={styles.languageSelectedSub}>{selectedLang.label}</Text>
            </View>
            <Icon name={languagePickerVisible ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          {languagePickerVisible && (
            <View style={styles.languageGrid}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageOption, prefs.language === lang.code && styles.languageOptionActive]}
                  onPress={() => selectLanguage(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.languageOptionNative, prefs.language === lang.code && styles.languageOptionTextActive]}>
                    {lang.labelNative}
                  </Text>
                  <Text style={[styles.languageOptionLabel, prefs.language === lang.code && styles.languageOptionSubActive]}>
                    {lang.label}
                  </Text>
                  {prefs.language === lang.code && (
                    <Icon name="check-circle" size={16} color={colors.primary.saffron} style={styles.languageCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Info Footer */}
        <View style={styles.infoFooter}>
          <Icon name="information-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.infoFooterText}>
            {t('panchangNotifications.footerNote')}
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.parchment },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.parchment },
  scrollContent: { paddingBottom: spacing.xxl },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.background.warmWhite, borderBottomWidth: 1, borderBottomColor: colors.border.gold as string },
  backButton: { padding: spacing.xs, width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.primary.maroon },

  // Hero
  heroBanner: { margin: spacing.lg, padding: spacing.lg, alignItems: 'center', backgroundColor: colors.background.warmWhite, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.gold as string, ...shadows.warm },
  heroTitle: { fontSize: 18, fontWeight: '700', color: colors.primary.maroon, marginTop: spacing.sm },
  heroSubtitle: { fontSize: 13, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },

  // Enable Button
  enableButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.primary.saffron, gap: spacing.sm, ...shadows.warm },
  enableButtonText: { fontSize: 16, fontWeight: '700', color: colors.text.white },
  enabledBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: 'rgba(22,163,74,0.08)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.2)', gap: spacing.xs },
  enabledBadgeText: { fontSize: 14, fontWeight: '600', color: '#16A34A' },

  // Section
  section: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary.maroon, marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.md },

  // Toggle Row
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.background.warmWhite, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border.gold as string, marginBottom: spacing.sm },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.md },
  toggleTextContainer: { marginLeft: spacing.md, flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  toggleDescription: { fontSize: 12, color: colors.text.secondary, marginTop: 2, lineHeight: 17 },

  // Language
  languageSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.background.warmWhite, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border.gold as string },
  languageSelected: {},
  languageSelectedText: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  languageSelectedSub: { fontSize: 12, color: colors.text.secondary },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  languageOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.background.warmWhite, borderWidth: 1, borderColor: colors.border.gold as string, minWidth: '30%' as any, position: 'relative' },
  languageOptionActive: { borderColor: colors.primary.saffron, borderWidth: 2, backgroundColor: 'rgba(255,107,0,0.06)' },
  languageOptionNative: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  languageOptionLabel: { fontSize: 11, color: colors.text.secondary },
  languageOptionTextActive: { color: colors.primary.saffron },
  languageOptionSubActive: { color: colors.primary.saffron },
  languageCheck: { position: 'absolute', top: 4, right: 4 },

  // Info Footer
  infoFooter: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginHorizontal: spacing.lg, padding: spacing.md, backgroundColor: 'rgba(212,160,23,0.06)', borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(212,160,23,0.15)' },
  infoFooterText: { flex: 1, fontSize: 12, color: colors.text.secondary, lineHeight: 18 },
});
