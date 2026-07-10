import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SectionList,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { spacing, borderRadius, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { EmptyStateCard, FloatingInput, ScreenHeader, SectionHeader, SurfaceCard } from '../../components/common';

interface Event {
  _id: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  description?: string;
}

interface LocalizedText {
  [key: string]: string | undefined;
  en?: string;
  hi?: string;
}

interface TimeSlot {
  period?: string;
  startDate: string;
  endDate?: string;
  _id?: string;
  slotCapacity?: number;
  bookedCount?: number;
  remainingCapacity?: number;
  isBlocked?: boolean;
}

interface Schedule {
  _id: string;
  month: string;
  locations: string;
  baseLocation?: 'Haridwar Ashram' | 'Delhi Ashram' | 'Other';
  timeSlots: TimeSlot[];
  slotStats?: TimeSlot[];
  appointment?: boolean;
  maxPeople?: number;
  dateRange?: string;
  publicTitle?: LocalizedText;
  publicLocation?: LocalizedText;
  publicNotes?: LocalizedText;
  changeNote?: string;
  isLastMinuteUpdate?: boolean;
  currentAppointments?: number;
  remainingCapacity?: number;
  totalCapacity?: number;
  isBlocked?: boolean;
}

interface GroupedSchedule {
  title: string;
  data: Schedule[];
}

type RequestForm = {
  name: string;
  email: string;
  phone: string;
  purpose: string;
  preferredTime: string;
  additionalInfo: string;
};

const EMPTY_FORM: RequestForm = {
  name: '',
  email: '',
  phone: '',
  purpose: '',
  preferredTime: '',
  additionalInfo: '',
};

export function ScheduleScreen() {
  const { isAuthenticated, user } = useAuth();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedules, setSchedules] = useState<GroupedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'schedules'>('schedules');
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [requestForm, setRequestForm] = useState<RequestForm>(EMPTY_FORM);

  const locale = useMemo(() => {
    const language = i18n.language?.split('-')[0] || 'en';
    const localeMap: Record<string, string> = {
      hi: 'hi-IN',
      bn: 'bn-BD',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      pa: 'pa-IN',
      or: 'or-IN',
      as: 'as-IN',
      en: 'en-IN',
    };
    return localeMap[language] || 'en-IN';
  }, [i18n.language]);
  const purposeOptions = useMemo(
    () => [
      t('schedule.purposeOptions.personalGuidance'),
      t('schedule.purposeOptions.spiritualDiscussion'),
      t('schedule.purposeOptions.communityEvent'),
      t('schedule.purposeOptions.organizationCollaboration'),
      t('schedule.purposeOptions.mediaInterview'),
      t('schedule.purposeOptions.educationalVisit'),
      t('schedule.purposeOptions.culturalProgram'),
      t('schedule.purposeOptions.charitableDiscussion'),
      t('schedule.purposeOptions.other'),
    ],
    [t]
  );
  const preferredTimes = useMemo(
    () => [
      t('schedule.preferredTimes.morning'),
      t('schedule.preferredTimes.afternoon'),
      t('schedule.preferredTimes.evening'),
      t('schedule.preferredTimes.wholeDay'),
    ],
    [t]
  );

  const pickLocalizedText = (localized?: LocalizedText, fallback?: string) => {
    const language = i18n.language?.split('-')[0] || 'en';
    return localized?.[language] || localized?.en || localized?.hi || fallback || '';
  };

  const fetchData = useCallback(async () => {
    try {
      setScheduleError(null);

      const [eventsRes, schedulesRes] = await Promise.allSettled([
        api.get('/events'),
        api.get('/schedule'),
      ]);

      if (eventsRes.status === 'fulfilled') {
        const sortedEvents = (eventsRes.value.data || []).sort(
          (a: Event, b: Event) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        );
        setEvents(sortedEvents);
      } else {
        console.error('Error fetching events:', eventsRes.reason);
        setEvents([]);
      }

      if (schedulesRes.status === 'fulfilled') {
        const rawSchedules = (schedulesRes.value.data || []).filter(
          (item: Schedule) => !item.isBlocked || item.appointment
        );
        setSchedules(groupSchedulesByMonth(rawSchedules));
      } else {
        console.error('Error fetching schedules:', schedulesRes.reason);
        setSchedules([]);
        setScheduleError(
          schedulesRes.reason instanceof Error
            ? schedulesRes.reason.message
            : t('common.somethingWentWrong')
        );
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setRequestForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      email: user?.email || prev.email,
      phone: user?.phone || prev.phone,
    }));
  }, [user]);

  const groupSchedulesByMonth = (items: Schedule[]): GroupedSchedule[] => {
    const groups: Record<string, Schedule[]> = {};

    items.forEach((item) => {
      const monthYear = item.month || 'Other';
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(item);
    });

    return Object.entries(groups).map(([title, data]) => ({
      title,
      data: data.sort((a, b) => {
        const aDate = a.timeSlots?.[0]?.startDate || '';
        const bDate = b.timeSlots?.[0]?.startDate || '';
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      }),
    }));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatLongDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getPeriodIcon = (period?: string) => {
    switch (period?.toLowerCase()) {
      case 'morning':
        return 'weather-sunny' as const;
      case 'afternoon':
        return 'weather-partly-cloudy' as const;
      case 'evening':
        return 'weather-sunset' as const;
      default:
        return 'clock-outline' as const;
    }
  };

  const openRequestModal = (schedule: Schedule) => {
    if (!isAuthenticated) {
      Alert.alert(t('schedule.alerts.signInRequiredTitle'), t('schedule.alerts.signInRequiredMessage'));
      return;
    }

    setSelectedSchedule(schedule);
    setSelectedSlotIndex(0);
    setRequestForm({
      ...EMPTY_FORM,
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      purpose: t('schedule.purposeOptions.personalGuidance'),
      preferredTime: t('schedule.preferredTimes.morning'),
    });
    setRequestModalVisible(true);
  };

  const handleRegister = async () => {
    if (!selectedSchedule) return;

    const activeSlots = selectedSchedule.slotStats?.length
      ? selectedSchedule.slotStats
      : selectedSchedule.timeSlots || [];
    const selectedSlot = activeSlots[selectedSlotIndex];

    if (!selectedSlot?.startDate) {
      Alert.alert(t('schedule.alerts.unavailableTitle'), t('schedule.alerts.unavailableMessage'));
      return;
    }

    if (!requestForm.name || !requestForm.email || !requestForm.phone) {
      Alert.alert(t('schedule.alerts.missingDetailsTitle'), t('schedule.alerts.missingDetailsMessage'));
      return;
    }

    setRegistering(selectedSchedule._id);
    try {
      await api.post('/scheduleRegistration', {
        userId: user?._id,
        name: requestForm.name,
        email: requestForm.email,
        phone: requestForm.phone,
        purpose: requestForm.purpose,
        preferredTime: requestForm.preferredTime,
        additionalInfo: requestForm.additionalInfo,
        language: i18n.language || 'en',
        requestedSchedule: {
          scheduleId: selectedSchedule._id,
          eventDate: selectedSlot.startDate,
          eventTime: selectedSlot.period || requestForm.preferredTime,
          eventLocation:
            pickLocalizedText(selectedSchedule.publicLocation, selectedSchedule.locations) ||
            selectedSchedule.locations,
          eventDetails: pickLocalizedText(selectedSchedule.publicNotes),
          baseLocation: selectedSchedule.baseLocation,
        },
      });

      setRequestModalVisible(false);
      await fetchData();
      Alert.alert(
        t('schedule.alerts.requestSentTitle'),
        t('schedule.alerts.requestSentMessage')
      );
    } catch (error: any) {
      Alert.alert(
        t('schedule.alerts.requestFailedTitle'),
        error.response?.data?.message || error.message || t('schedule.alerts.requestFailedMessage')
      );
    } finally {
      setRegistering(null);
    }
  };

  const renderEventCard = (event: Event) => (
    <TouchableOpacity key={event._id} style={styles.eventCard}>
      <SurfaceCard compact style={styles.eventGradient}>
        <View style={styles.eventDateBadge}>
          <Text style={styles.eventDateDay}>{new Date(event.eventDate).getDate()}</Text>
          <Text style={styles.eventDateMonth}>
            {new Date(event.eventDate).toLocaleDateString(locale, {
              month: 'short',
            })}
          </Text>
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventName}>{event.eventName}</Text>
          <View style={styles.eventMeta}>
            <Icon name="calendar" size={14} color={colors.text.secondary} />
            <Text style={styles.eventMetaText}>{formatLongDate(event.eventDate)}</Text>
          </View>
          {event.eventLocation ? (
            <View style={styles.eventMeta}>
              <Icon name="map-marker" size={14} color={colors.text.secondary} />
              <Text style={styles.eventMetaText}>{event.eventLocation}</Text>
            </View>
          ) : null}
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );

  const renderScheduleItem = ({ item }: { item: Schedule }) => {
    const activeSlots = item.slotStats?.length ? item.slotStats : item.timeSlots || [];
    const firstSlot = activeSlots[0];
    const period = firstSlot?.period;
    const title = pickLocalizedText(item.publicTitle, item.locations);
    // Only treat as a distinct location if it isn't just a repeat of the title
    // (when publicLocation is empty both fall back to `locations`).
    const rawLocation = pickLocalizedText(item.publicLocation, '');
    const baseLabel = item.baseLocation || t('schedule.ashram');
    const hasDistinctLocation = !!rawLocation && rawLocation.trim() !== title.trim();
    const locationLine = hasDistinctLocation ? `${baseLabel} • ${rawLocation}` : baseLabel;

    return (
      <SurfaceCard compact style={styles.scheduleItem}>
        <View style={styles.scheduleLeft}>
          {firstSlot?.startDate ? (
            <View style={styles.scheduleDate}>
              <Text style={styles.scheduleDateText}>{formatShortDate(firstSlot.startDate)}</Text>
            </View>
          ) : null}
          {period ? (
            <View style={styles.periodBadge}>
              <Icon name={getPeriodIcon(period)} size={12} color={colors.gold.dark} />
              <Text style={styles.periodText}>{period}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.scheduleContent}>
          <Text style={styles.scheduleTitle} numberOfLines={3}>{title}</Text>
          <View style={styles.scheduleLocationRow}>
            <Icon name="map-marker-outline" size={13} color={colors.text.secondary} />
            <Text style={styles.scheduleLocation} numberOfLines={2}>{locationLine}</Text>
          </View>
          {item.dateRange ? <Text style={styles.scheduleTime}>{item.dateRange}</Text> : null}
          {item.changeNote ? <Text style={styles.changeNote}>{item.changeNote}</Text> : null}

          <View style={styles.capacityRow}>
            <Text style={styles.capacityText}>
              {t('schedule.capacityOpen', {
                open: item.remainingCapacity ?? item.maxPeople ?? 0,
                total: item.totalCapacity ?? item.maxPeople ?? 0,
              })}
            </Text>
            {item.isLastMinuteUpdate ? (
              <View style={styles.lastMinuteBadge}>
                <Text style={styles.lastMinuteBadgeText}>{t('schedule.updated')}</Text>
              </View>
            ) : null}
          </View>

          {item.appointment ? (
            <TouchableOpacity
              style={[
                styles.registerButton,
                item.isBlocked && styles.registerButtonDisabled,
              ]}
              onPress={() => openRequestModal(item)}
              disabled={item.isBlocked || registering === item._id}
            >
              {registering === item._id ? (
                <ActivityIndicator size="small" color={colors.text.white} />
              ) : (
                <>
                  <Icon name="account-check" size={14} color={colors.text.white} />
                  <Text style={styles.registerButtonText}>
                    {item.isBlocked ? t('schedule.fullyBooked') : t('schedule.requestAppointment')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </SurfaceCard>
    );
  };

  const renderRequestModal = () => {
    const schedule = selectedSchedule;
    if (!schedule) return null;

    const activeSlots = schedule.slotStats?.length ? schedule.slotStats : schedule.timeSlots || [];
    const selectedSlot = activeSlots[selectedSlotIndex];

    return (
      <Modal visible={requestModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('schedule.requestAppointment')}</Text>
              <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalScheduleTitle}>
                {pickLocalizedText(schedule.publicTitle, schedule.locations)}
              </Text>
              <Text style={styles.modalMetaText}>
                {schedule.baseLocation || t('schedule.ashram')} •{' '}
                {pickLocalizedText(schedule.publicLocation, schedule.locations)}
              </Text>

              <Text style={styles.inputLabel}>{t('schedule.chooseScheduleDate')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotScroller}>
                {activeSlots.map((slot, index) => (
                  <TouchableOpacity
                    key={`${slot.startDate}-${index}`}
                    style={[
                      styles.slotChip,
                      index === selectedSlotIndex && styles.slotChipActive,
                      slot.isBlocked && styles.slotChipBlocked,
                    ]}
                    onPress={() => setSelectedSlotIndex(index)}
                    disabled={slot.isBlocked}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        index === selectedSlotIndex && styles.slotChipTextActive,
                      ]}
                    >
                      {formatShortDate(slot.startDate)}
                    </Text>
                    <Text
                      style={[
                        styles.slotChipSubtext,
                        index === selectedSlotIndex && styles.slotChipTextActive,
                      ]}
                    >
                      {slot.isBlocked
                        ? t('schedule.full')
                        : t('schedule.openCount', {
                            count:
                              slot.remainingCapacity ?? slot.slotCapacity ?? schedule.maxPeople ?? 0,
                          })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedSlot?.startDate ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>{t('schedule.selectedDay')}</Text>
                  <Text style={styles.summaryText}>{formatLongDate(selectedSlot.startDate)}</Text>
                  <Text style={styles.summaryText}>
                    {selectedSlot.period || requestForm.preferredTime} •{' '}
                    {pickLocalizedText(schedule.publicLocation, schedule.locations)}
                  </Text>
                </View>
              ) : null}

              <FloatingInput
                label={t('schedule.fullName')}
                leftIcon="account"
                value={requestForm.name}
                onChangeText={(value) => setRequestForm((prev) => ({ ...prev, name: value }))}
                placeholder={t('schedule.placeholders.name')}
              />

              <FloatingInput
                label={t('schedule.email')}
                leftIcon="email"
                value={requestForm.email}
                onChangeText={(value) => setRequestForm((prev) => ({ ...prev, email: value }))}
                placeholder={t('schedule.placeholders.email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <FloatingInput
                label={t('schedule.phone')}
                leftIcon="phone"
                value={requestForm.phone}
                onChangeText={(value) => setRequestForm((prev) => ({ ...prev, phone: value }))}
                placeholder={t('schedule.placeholders.phone')}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>{t('schedule.meetingPurpose')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroller}>
                {purposeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionChip,
                      requestForm.purpose === option && styles.optionChipActive,
                    ]}
                    onPress={() => setRequestForm((prev) => ({ ...prev, purpose: option }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        requestForm.purpose === option && styles.optionChipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>{t('schedule.preferredTime')}</Text>
              <View style={styles.inlineOptions}>
                {preferredTimes.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionChip,
                      requestForm.preferredTime === option && styles.optionChipActive,
                    ]}
                    onPress={() =>
                      setRequestForm((prev) => ({ ...prev, preferredTime: option }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        requestForm.preferredTime === option && styles.optionChipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FloatingInput
                label={t('schedule.additionalInfo')}
                leftIcon="message-text-outline"
                value={requestForm.additionalInfo}
                onChangeText={(value) =>
                  setRequestForm((prev) => ({ ...prev, additionalInfo: value }))
                }
                placeholder={t('schedule.placeholders.additionalInfo')}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedSlot || selectedSlot.isBlocked || registering === schedule._id) &&
                    styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={!selectedSlot || selectedSlot.isBlocked || registering === schedule._id}
              >
                {registering === schedule._id ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Text style={styles.submitButtonText}>{t('schedule.submitAppointmentRequest')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        compact
        eyebrow={t('schedule.title')}
        title={activeTab === 'schedules' ? t('schedule.title') : t('explore.events')}
        subtitle={activeTab === 'schedules' ? t('schedule.emptySchedulesSubtitle') : t('schedule.emptyEventsSubtitle')}
        icon={activeTab === 'schedules' ? 'calendar-clock' : 'calendar-star'}
      />

      <View style={styles.tabWrap}>
        <View style={styles.tabTrack}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'schedules' && styles.tabActive]}
            onPress={() => setActiveTab('schedules')}
            activeOpacity={0.85}
          >
            <Icon
              name="calendar-clock"
              size={18}
              color={activeTab === 'schedules' ? colors.text.white : colors.primary.maroon}
            />
            <Text style={[styles.tabText, activeTab === 'schedules' && styles.tabTextActive]}>
              {t('schedule.title')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.tabActive]}
            onPress={() => setActiveTab('events')}
            activeOpacity={0.85}
          >
            <Icon
              name="calendar-star"
              size={18}
              color={activeTab === 'events' ? colors.text.white : colors.primary.maroon}
            />
            <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>
              {t('explore.events')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'events' ? (
        <ScrollView
          style={styles.scrollView}
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
          <View style={styles.sectionWrap}>
            <SectionHeader
              title={t('home.upcomingEvents')}
              subtitle={t('schedule.emptyEventsSubtitle')}
              icon="calendar-star"
            />
          </View>
          {events.length > 0 ? (
            events.map((event) => <View key={event._id}>{renderEventCard(event)}</View>)
          ) : (
            <View style={styles.sectionWrap}>
              <EmptyStateCard
                icon="calendar-blank"
                title={t('schedule.noEvents')}
                subtitle={t('schedule.emptyEventsSubtitle')}
              />
            </View>
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      ) : (
        <SectionList
          sections={schedules}
          keyExtractor={(item) => item._id}
          renderItem={renderScheduleItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderBar}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.saffron]}
              tintColor={colors.primary.saffron}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.sectionWrap}>
              {scheduleError ? (
                <SurfaceCard compact style={styles.errorCard}>
                  <EmptyStateCard
                    icon="alert-circle-outline"
                    title={t('common.somethingWentWrong')}
                    subtitle={scheduleError}
                  />
                  <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.85}>
                    <Icon name="refresh" size={16} color={colors.text.white} />
                    <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
                  </TouchableOpacity>
                </SurfaceCard>
              ) : (
                <EmptyStateCard
                  icon="calendar-clock"
                  title={t('schedule.noSchedulesAvailable')}
                  subtitle={t('schedule.emptySchedulesSubtitle')}
                />
              )}
            </View>
          )}
        />
      )}

      {renderRequestModal()}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  tabWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
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
    ...typography.bodySm,
  },
  tabTrack: {
    flexDirection: 'row',
    backgroundColor: colors.background.sandstone,
    borderRadius: borderRadius.full,
    padding: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  tabActive: {
    backgroundColor: colors.primary.maroon,
    shadowColor: colors.primary.maroon,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  tabTextActive: {
    color: colors.text.white,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionWrap: {
    paddingHorizontal: spacing.lg,
  },
  errorCard: {
    alignItems: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.saffron,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    ...typography.label,
    color: colors.text.white,
    marginLeft: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary.maroon,
    marginLeft: spacing.sm,
  },
  sectionHeaderBar: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.maroon,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.lg,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.text.white,
  },
  eventCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  eventGradient: {
    flexDirection: 'row',
  },
  eventDateBadge: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.saffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventDateDay: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.white,
  },
  eventDateMonth: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
  },
  eventContent: {
    flex: 1,
  },
  eventName: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  eventMetaText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  scheduleLeft: {
    alignItems: 'center',
    marginRight: spacing.md,
    minWidth: 70,
  },
  scheduleDate: {
    backgroundColor: colors.background.cream,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  scheduleDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.maroon,
    textAlign: 'center',
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  periodText: {
    fontSize: 10,
    color: colors.gold.dark,
    marginLeft: 2,
    textTransform: 'capitalize',
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    ...typography.title,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  scheduleTime: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  scheduleLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  scheduleLocation: {
    ...typography.bodySm,
    color: colors.text.secondary,
    flex: 1,
  },
  changeNote: {
    ...typography.caption,
    color: colors.status.warning,
    marginTop: spacing.xs,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  capacityText: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.accent.peacock,
  },
  lastMinuteBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.status.warning,
  },
  lastMinuteBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.white,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.saffron,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.white,
    marginLeft: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: colors.background.warmWhite,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  modalScheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalMetaText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  slotScroller: {
    marginTop: spacing.xs,
  },
  slotChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
    marginRight: spacing.sm,
  },
  slotChipActive: {
    backgroundColor: colors.primary.saffron,
    borderColor: colors.primary.saffron,
  },
  slotChipBlocked: {
    opacity: 0.5,
  },
  slotChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  slotChipTextActive: {
    color: colors.text.white,
  },
  slotChipSubtext: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  summaryCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.cream,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: 13,
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionScroller: {
    marginTop: spacing.xs,
  },
  inlineOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionChipActive: {
    backgroundColor: colors.primary.maroon,
    borderColor: colors.primary.maroon,
  },
  optionChipText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: colors.text.white,
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.primary.saffron,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
