import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { Event } from '../../types';

const { width } = Dimensions.get('window');

interface RouteParams {
  eventId: string;
}

export function EventDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { eventId } = route.params as RouteParams;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data);
      setIsRegistered(response.data.registeredUsers?.includes(eventId) || false);
    } catch (error) {
      console.error('Error fetching event details:', error);
      Alert.alert(t('common.error'), t('details.event.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (isRegistered) return;

    setRegistering(true);
    try {
      await api.post('/event-registration/register', { eventId });
      setIsRegistered(true);
      Alert.alert(
        t('details.event.registrationSuccessTitle'),
        t('details.event.registrationSuccessMessage'),
        [{ text: t('home.welcome'), style: 'default' }]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || t('details.event.registrationFailedMessage');
      Alert.alert(t('details.event.registrationFailedTitle'), message);
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
        <Text style={styles.loadingText}>{t('details.event.loading')}</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="calendar-alert" size={64} color={colors.text.secondary} />
        <Text style={styles.errorText}>{t('details.event.notFound')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Event Image */}
        <View style={styles.imageContainer}>
          {event.eventImage ? (
            <Image source={{ uri: event.eventImage }} style={styles.eventImage} />
          ) : (
            <LinearGradient
              colors={[colors.primary.saffron, colors.primary.maroon]}
              style={styles.imagePlaceholder}
            >
              <Icon name="calendar-star" size={64} color={colors.gold.light} />
            </LinearGradient>
          )}
          {/* Back Button Overlay */}
          <TouchableOpacity
            style={styles.backButtonOverlay}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={colors.text.white} />
          </TouchableOpacity>
          {/* Temple Border Decoration */}
          <View style={styles.templeBorder}>
            <View style={styles.templeBorderInner} />
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.contentContainer}>
          <Text style={styles.eventName}>{event.eventName}</Text>

          {/* Meta Info Cards */}
          <View style={styles.metaCardsContainer}>
            <View style={styles.metaCard}>
              <View style={styles.metaIconContainer}>
                <Icon name="calendar" size={20} color={colors.gold.main} />
              </View>
              <View>
                <Text style={styles.metaLabel}>{t('schedule.date')}</Text>
                <Text style={styles.metaValue}>{formatDate(event.eventDate)}</Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <View style={styles.metaIconContainer}>
                <Icon name="clock-outline" size={20} color={colors.gold.main} />
              </View>
              <View>
                <Text style={styles.metaLabel}>{t('details.event.time')}</Text>
                <Text style={styles.metaValue}>{formatTime(event.eventDate)}</Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <View style={styles.metaIconContainer}>
                <Icon name="map-marker" size={20} color={colors.gold.main} />
              </View>
              <View style={styles.metaTextContainer}>
                <Text style={styles.metaLabel}>{t('schedule.location')}</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {event.eventLocation}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>{t('details.event.aboutThisEvent')}</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          </View>

          {/* Spiritual Quote */}
          <View style={styles.quoteSection}>
            <Icon name="format-quote-open" size={24} color={colors.gold.main} />
            <Text style={styles.quoteText}>{t('details.event.quote')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Register Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.registerButton,
            isRegistered && styles.registeredButton,
          ]}
          onPress={handleRegister}
          disabled={registering || isRegistered}
        >
          <LinearGradient
            colors={
              isRegistered
                ? [colors.accent.sage, colors.accent.sage]
                : [colors.primary.saffron, colors.primary.vermillion]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.registerButtonGradient}
          >
            {registering ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <>
                <Icon
                  name={isRegistered ? 'check-circle' : 'account-plus'}
                  size={22}
                  color={colors.text.white}
                />
                <Text style={styles.registerButtonText}>
                  {isRegistered ? t('schedule.registered') : t('details.event.registerForEvent')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
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
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.parchment,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 18,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.saffron,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.text.white,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    height: 280,
  },
  eventImage: {
    width: width,
    height: 280,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: width,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonOverlay: {
    position: 'absolute',
    top: spacing.xxl,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templeBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: colors.background.parchment,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  templeBorderInner: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 8,
    backgroundColor: colors.gold.main,
    borderRadius: 4,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  eventName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.lg,
    lineHeight: 34,
  },
  metaCardsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.warmWhite,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  metaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metaTextContainer: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  descriptionSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.md,
  },
  descriptionCard: {
    backgroundColor: colors.background.warmWhite,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold.main,
  },
  description: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
  },
  quoteSection: {
    backgroundColor: colors.background.cream,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  quoteText: {
    fontSize: 14,
    color: colors.text.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  buttonContainer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.warmWhite,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
    ...shadows.warm,
  },
  registerButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  registeredButton: {
    opacity: 0.9,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.white,
  },
});
