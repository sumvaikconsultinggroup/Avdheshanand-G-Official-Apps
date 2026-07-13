import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../../context/OnboardingContext';
import { resyncPushTokenPreferences } from '../../services/notifications';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const STORAGE_KEY_CITY = '@panchang_selected_city';
const LOGO_SOURCE = require('../../../assets/images/avdheshanandg-mission-logo.png');

export function OnboardingLocationScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { completeOnboarding } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const handleUseLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        await completeOnboarding({ locationPrompted: true, locationEnabled: false });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const place = reverseGeocode[0];
      const cityPayload = {
        _id: 'onboarding-gps',
        name: place?.city || place?.district || place?.region || 'Current Location',
        state: place?.region || '',
        country: place?.country || 'India',
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      };

      await AsyncStorage.setItem(STORAGE_KEY_CITY, JSON.stringify(cityPayload));
      // Push the just-chosen city to the backend so city-targeted broadcasts
      // reach this device (notifications are enabled before this step, so the
      // server still has the default city until now).
      await resyncPushTokenPreferences();
      await completeOnboarding({ locationPrompted: true, locationEnabled: true });
    } catch (error) {
      Alert.alert(t('onboarding.locationErrorTitle'), t('onboarding.locationErrorMessage'));
      await completeOnboarding({ locationPrompted: true, locationEnabled: false });
    } finally {
      setLoading(false);
    }
  };

  const handleLater = async () => {
    await completeOnboarding({ locationPrompted: true, locationEnabled: false });
  };

  const benefits: { icon: React.ComponentProps<typeof Icon>['name']; key: 'panchang' | 'city' }[] = [
    { icon: 'weather-sunset-up', key: 'panchang' },
    { icon: 'map-marker-radius-outline', key: 'city' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.brandRow}>
          <Image source={LOGO_SOURCE} style={styles.brandLogo} />
          <Text style={styles.brandText}>{t('onboarding.brand')}</Text>
        </View>

        {/* Hero medallion */}
        <View style={styles.heroWrap}>
          <View style={styles.heroOuter}>
            <View style={styles.heroInner}>
              <Icon name="map-marker-radius" size={50} color={colors.primary.saffron} />
            </View>
          </View>
        </View>

        <Text style={styles.eyebrow}>{t('onboarding.locationEyebrow')}</Text>
        <Text style={styles.title}>{t('onboarding.locationTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.locationSubtitle')}</Text>

        <View style={styles.benefitsCard}>
          {benefits.map((benefit, index) => (
            <View
              key={benefit.key}
              style={[styles.bulletRow, index > 0 && styles.bulletRowDivider]}
            >
              <View style={styles.bulletIcon}>
                <Icon name={benefit.icon} size={20} color={colors.primary.saffron} />
              </View>
              <Text style={styles.bulletText}>{t(`onboarding.locationBenefits.${benefit.key}`)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed footer — always visible */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleUseLocation}
          activeOpacity={0.9}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.white} />
          ) : (
            <>
              <Icon name="crosshairs-gps" size={18} color={colors.text.white} />
              <Text style={styles.primaryButtonText}>{t('onboarding.useMyLocation')}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLater}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>{t('onboarding.chooseLater')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.parchment,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
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
    heroWrap: {
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
    heroOuter: {
      width: 132,
      height: 132,
      borderRadius: 66,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.cream,
      borderWidth: 1,
      borderColor: colors.border.gold as string,
    },
    heroInner: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.warmWhite,
      ...shadows.warm,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.gold.dark,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: {
      marginTop: spacing.sm,
      fontSize: 27,
      lineHeight: 34,
      fontWeight: '800',
      color: colors.primary.maroon,
    },
    subtitle: {
      marginTop: spacing.sm,
      fontSize: 15,
      lineHeight: 23,
      color: colors.text.secondary,
    },
    benefitsCard: {
      marginTop: spacing.xl,
      backgroundColor: colors.background.warmWhite,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border.gold as string,
      paddingHorizontal: spacing.lg,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    bulletRowDivider: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(212,160,23,0.16)',
    },
    bulletIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.background.cream,
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
      borderTopWidth: 1,
      borderTopColor: colors.border.gold as string,
      backgroundColor: colors.background.parchment,
    },
    primaryButton: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.primary.saffron,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
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
