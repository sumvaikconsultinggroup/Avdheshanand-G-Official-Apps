import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Card, FAB, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AdminEmptyState,
  AdminHero,
  AdminMetricCard,
  AdminSectionHeader,
  Badge,
} from '../../components/common';
import { colors, spacing, borderRadius, typography, shadows, gradients } from '../../theme';
import api from '../../services/api';
import { Schedule, LocalizedText } from '../../types';

interface ScheduleSection {
  title: string;
  data: Schedule[];
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const BASE_LOCATIONS: Array<Schedule['baseLocation']> = [
  'Haridwar Ashram',
  'Delhi Ashram',
  'Other',
];

const CONTENT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bangla' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'or', label: 'Odia' },
  { code: 'as', label: 'Assamese' },
] as const;

const createEmptyLocalizedText = (): LocalizedText =>
  CONTENT_LANGUAGES.reduce<LocalizedText>((acc, { code }) => {
    acc[code] = '';
    return acc;
  }, {});

const normalizeLocalizedText = (localized: LocalizedText): LocalizedText =>
  CONTENT_LANGUAGES.reduce<LocalizedText>((acc, { code }) => {
    const value = localized[code]?.trim();
    if (value) acc[code] = value;
    return acc;
  }, {});

const getPrimaryLocalizedValue = (localized?: LocalizedText, fallback = '') =>
  localized?.en?.trim() ||
  localized?.hi?.trim() ||
  Object.values(localized || {}).find((value) => value?.trim()) ||
  fallback;

interface ScheduleFormData {
  month: string;
  locations: string;
  baseLocation: Schedule['baseLocation'];
  startDate: string;
  endDate: string;
  period: string;
  maxPeople: string;
  slotCapacity: string;
  appointment: boolean;
  publicTitle: LocalizedText;
  publicLocation: LocalizedText;
  publicNotes: LocalizedText;
  changeNote: string;
  isLastMinuteUpdate: boolean;
}

const EMPTY_FORM: ScheduleFormData = {
  month: '',
  locations: '',
  baseLocation: 'Delhi Ashram',
  startDate: '',
  endDate: '',
  period: '',
  maxPeople: '',
  slotCapacity: '',
  appointment: false,
  publicTitle: createEmptyLocalizedText(),
  publicLocation: createEmptyLocalizedText(),
  publicNotes: createEmptyLocalizedText(),
  changeNote: '',
  isLastMinuteUpdate: false,
};

export function ScheduleScreen() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/schedule');
      const data = Array.isArray(response.data) ? response.data : [];
      setSchedules(data.filter((s: Schedule) => !s.isDeleted));
    } catch (err) {
      setError('Failed to load schedules');
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedules();
  }, [fetchSchedules]);

  const groupedSchedules = useMemo((): ScheduleSection[] => {
    const groups: Record<string, Schedule[]> = {};

    schedules.forEach((schedule) => {
      const key = schedule.month || 'Unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(schedule);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const dateA = a.earliestStartDate ? new Date(a.earliestStartDate).getTime() : 0;
        const dateB = b.earliestStartDate ? new Date(b.earliestStartDate).getTime() : 0;
        return dateA - dateB;
      });
    });

    return Object.keys(groups)
      .map((title) => ({ title, data: groups[title] }))
      .sort((a, b) => MONTHS.indexOf(a.title) - MONTHS.indexOf(b.title));
  }, [schedules]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormData(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (schedule: Schedule) => {
    const firstSlot = schedule.timeSlots?.[0];
    setEditingSchedule(schedule);
    setFormData({
      month: schedule.month,
      locations: schedule.locations,
      baseLocation: schedule.baseLocation || 'Other',
      startDate: firstSlot?.startDate
        ? new Date(firstSlot.startDate).toISOString().split('T')[0]
        : '',
      endDate: firstSlot?.endDate
        ? new Date(firstSlot.endDate).toISOString().split('T')[0]
        : '',
      period: firstSlot?.period ?? '',
      maxPeople: schedule.maxPeople != null ? String(schedule.maxPeople) : '',
      slotCapacity: firstSlot?.slotCapacity != null ? String(firstSlot.slotCapacity) : '',
      appointment: schedule.appointment ?? false,
      publicTitle: { ...createEmptyLocalizedText(), ...(schedule.publicTitle || {}) },
      publicLocation: { ...createEmptyLocalizedText(), ...(schedule.publicLocation || {}) },
      publicNotes: { ...createEmptyLocalizedText(), ...(schedule.publicNotes || {}) },
      changeNote: schedule.changeNote || '',
      isLastMinuteUpdate: Boolean(schedule.isLastMinuteUpdate),
    });
    setModalVisible(true);
  };

  const isValidIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };

  const handleSave = async () => {
    if (!formData.month.trim()) {
      Alert.alert('Validation', 'Please select a month.');
      return;
    }
    if (!formData.locations.trim()) {
      Alert.alert('Validation', 'Locations field is required.');
      return;
    }
    if (!formData.startDate.trim() || !formData.endDate.trim()) {
      Alert.alert('Validation', 'Start date and end date are required (YYYY-MM-DD).');
      return;
    }
    if (!isValidIsoDate(formData.startDate.trim()) || !isValidIsoDate(formData.endDate.trim())) {
      Alert.alert('Validation', 'Dates must be in valid YYYY-MM-DD format.');
      return;
    }
    if (new Date(formData.endDate).getTime() < new Date(formData.startDate).getTime()) {
      Alert.alert('Validation', 'End date cannot be earlier than start date.');
      return;
    }

    const maxPeople = formData.maxPeople ? Number(formData.maxPeople) : undefined;
    const slotCapacity = formData.slotCapacity ? Number(formData.slotCapacity) : undefined;
    if (maxPeople !== undefined && Number.isNaN(maxPeople)) {
      Alert.alert('Validation', 'Daily appointment capacity must be numeric.');
      return;
    }
    if (slotCapacity !== undefined && Number.isNaN(slotCapacity)) {
      Alert.alert('Validation', 'Slot capacity must be numeric.');
      return;
    }

    // The backend requires endDate to be strictly AFTER startDate; for a
    // single-day schedule (start === end) we omit endDate (it's optional).
    const isSingleDay =
      new Date(formData.endDate).getTime() === new Date(formData.startDate).getTime();

    const body = {
      month: formData.month.trim(),
      locations: formData.locations.trim(),
      baseLocation: formData.baseLocation,
      timeSlots: [
        {
          period: formData.period.trim() || undefined,
          startDate: new Date(formData.startDate).toISOString(),
          ...(isSingleDay ? {} : { endDate: new Date(formData.endDate).toISOString() }),
          slotCapacity,
        },
      ],
      appointment: formData.appointment,
      maxPeople,
      publicTitle: normalizeLocalizedText(formData.publicTitle),
      publicLocation: normalizeLocalizedText(formData.publicLocation),
      publicNotes: normalizeLocalizedText(formData.publicNotes),
      changeNote: formData.changeNote.trim() || undefined,
      isLastMinuteUpdate: formData.isLastMinuteUpdate,
    };

    try {
      setSaving(true);
      if (editingSchedule) {
        await api.put(`/schedule/${editingSchedule._id}`, body);
      } else {
        await api.post('/schedule', body);
      }
      setModalVisible(false);
      fetchSchedules();
    } catch (err) {
      console.error('Error saving schedule:', err);
      Alert.alert('Error', 'Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (schedule: Schedule) => {
    Alert.alert(
      'Delete Schedule',
      `Are you sure you want to delete the schedule for "${schedule.locations}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/schedule/${schedule._id}`);
              fetchSchedules();
            } catch (err) {
              console.error('Error deleting schedule:', err);
              Alert.alert('Error', 'Failed to delete schedule.');
            }
          },
        },
      ]
    );
  };

  const handleImportLatestSchedule = () => {
    Alert.alert(
      'Import Latest Schedule',
      'This replaces current schedule rows with the latest official poster schedule for testing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              setImporting(true);
              await api.post('/schedule/import-latest');
              await fetchSchedules();
              Alert.alert('Imported', 'Latest poster schedule has been imported successfully.');
            } catch (err) {
              console.error('Error importing schedule:', err);
              Alert.alert(
                'Import failed',
                'Could not import the latest poster schedule. Please try again.'
              );
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  const renderScheduleItem = ({ item }: { item: Schedule }) => {
    const firstSlot = item.timeSlots?.[0];
    const period = firstSlot?.period;
    const title = getPrimaryLocalizedValue(item.publicTitle, item.locations);

    return (
      <Card style={styles.card}>
        <View style={styles.cardBody}>
          <View style={styles.leftStripe} />
          <View style={styles.detailsSection}>
            <TouchableOpacity activeOpacity={0.75} onPress={() => setDetailSchedule(item)}>
              <View style={styles.titleRow}>
                <View style={styles.titleTextWrap}>
                  <Text style={styles.locationText} numberOfLines={2}>
                    {title}
                  </Text>
                  <View style={styles.baseRow}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={14}
                      color={colors.gold.dark}
                    />
                    <Text style={styles.secondaryText} numberOfLines={2}>
                      {item.baseLocation || 'Ashram schedule'}
                    </Text>
                  </View>
                </View>
                <View style={styles.chevronCircle}>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.primary.maroon}
                  />
                </View>
              </View>

              {item.dateRange ? (
                <View style={styles.dateRow}>
                  <MaterialCommunityIcons
                    name="calendar-range"
                    size={15}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.dateRangeText}>{item.dateRange}</Text>
                </View>
              ) : null}

              {period || item.appointment || item.isLastMinuteUpdate ? (
                <View style={styles.metaRow}>
                  {period ? (
                    <Badge
                      label={period}
                      tone={colors.gold.dark}
                      variant="soft"
                      icon="clock-outline"
                    />
                  ) : null}

                  {item.appointment ? (
                    <Badge
                      label="Appointment open"
                      tone={colors.status.success}
                      variant="soft"
                      dot
                    />
                  ) : null}

                  {item.isLastMinuteUpdate ? (
                    <Badge
                      label="Last-minute update"
                      tone={colors.status.warning}
                      variant="solid"
                      icon="alert"
                    />
                  ) : null}
                </View>
              ) : null}

              <View style={styles.capacityStrip}>
                <View style={styles.capItem}>
                  <Text style={styles.capValue}>{item.maxPeople ?? 100}</Text>
                  <Text style={styles.capLabel}>Daily</Text>
                </View>
                <View style={styles.capDivider} />
                <View style={styles.capItem}>
                  <Text style={styles.capValue}>{item.currentAppointments ?? 0}</Text>
                  <Text style={styles.capLabel}>Booked</Text>
                </View>
                <View style={styles.capDivider} />
                <View style={[styles.capItem, styles.capItemAccent]}>
                  <Text style={[styles.capValue, styles.capValueOpen]}>
                    {item.remainingCapacity ?? '—'}
                  </Text>
                  <Text style={[styles.capLabel, styles.capLabelOpen]}>Open</Text>
                </View>
              </View>

              {item.changeNote ? (
                <View style={styles.changeNoteRow}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={15}
                    color={colors.status.warning}
                    style={styles.changeNoteIcon}
                  />
                  <Text style={styles.changeNoteText}>{item.changeNote}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={styles.cardActionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openEditModal(item)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="pencil" size={16} color={colors.primary.maroon} />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => handleDelete(item)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="delete" size={16} color={colors.status.error} />
                <Text style={[styles.actionButtonText, { color: colors.status.error }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const renderSectionHeader = ({ section }: { section: ScheduleSection }) => (
    <LinearGradient
      colors={gradients.maroon}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.sectionHeader}
    >
      <View style={styles.sectionTitleRow}>
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={16}
          color={colors.gold.light}
          style={styles.sectionTitleIcon}
        />
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {section.title}
        </Text>
      </View>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionCount}>{section.data.length}</Text>
      </View>
    </LinearGradient>
  );

  const renderEmptyState = () => (
    <AdminEmptyState
      icon="calendar-blank-outline"
      title="No schedules available"
      message="Create the Delhi or Haridwar schedule here and every surface will read from the same source."
      actionLabel="Create schedule"
      onAction={openCreateModal}
    />
  );

  const scheduleSummary = {
    total: schedules.length,
    openAppointments: schedules.filter((item) => item.appointment).length,
    urgent: schedules.filter((item) => item.isLastMinuteUpdate).length,
    capacity: schedules.reduce((sum, item) => sum + (item.remainingCapacity || 0), 0),
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <AdminHero
        eyebrow="Travel and darshan windows"
        title="Schedule"
        subtitle="Keep the master itinerary, appointment availability, and location messaging aligned across the platform."
        actions={[
          { label: 'Create schedule', icon: 'plus', onPress: openCreateModal },
          { label: 'Replace poster', icon: 'upload', onPress: handleImportLatestSchedule },
        ]}
      />
      <View style={styles.metricGrid}>
        <AdminMetricCard label="Entries" value={scheduleSummary.total} icon="calendar-multiple" />
        <AdminMetricCard
          label="Appointment open"
          value={scheduleSummary.openAppointments}
          icon="account-check-outline"
          tone={colors.primary.saffron}
        />
        <AdminMetricCard
          label="Urgent changes"
          value={scheduleSummary.urgent}
          icon="alert-circle-outline"
          tone={colors.status.warning}
        />
        <AdminMetricCard
          label="Open capacity"
          value={scheduleSummary.capacity}
          icon="seat-recline-normal"
          tone={colors.gold.dark}
        />
      </View>
      <AdminSectionHeader
        title="Schedule timeline"
        subtitle="Each card is one published schedule block with its public title, capacity, and updates."
      />
    </View>
  );

  const renderDetailModal = () => {
    const item = detailSchedule;
    if (!item) return null;
    const firstSlot = item.timeSlots?.[0];
    const period = firstSlot?.period;
    const title = getPrimaryLocalizedValue(item.publicTitle, item.locations);

    const Row = ({ label, value, last }: { label: string; value?: string | number | null; last?: boolean }) =>
      value === undefined || value === null || value === '' ? null : (
        <View style={[styles.detailRow, last && styles.detailRowLast]}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue}>{String(value)}</Text>
        </View>
      );

    return (
      <Modal
        visible={!!detailSchedule}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailSchedule(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            {/* Compact gradient header */}
            <LinearGradient
              colors={gradients.maroon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.detailHeader}
            >
              <View style={styles.detailHeaderTop}>
                <Text style={styles.detailEyebrow}>Schedule details</Text>
                <TouchableOpacity onPress={() => setDetailSchedule(null)} style={styles.detailClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.text.white} />
                </TouchableOpacity>
              </View>
              <Text style={styles.detailTitle}>{title}</Text>
              <View style={styles.detailSubRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.gold.light} />
                <Text style={styles.detailSub}>{item.baseLocation || 'Ashram schedule'}</Text>
              </View>
            </LinearGradient>

            <ScrollView style={styles.detailBody} contentContainerStyle={styles.detailBodyContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailBadgeRow}>
                {period ? <Badge label={period} tone={colors.gold.dark} variant="soft" icon="clock-outline" /> : null}
                <Badge
                  label={item.appointment ? 'Appointment open' : 'Appointment closed'}
                  tone={item.appointment ? colors.status.success : colors.text.secondary}
                  variant="soft"
                  dot
                />
                {item.isLastMinuteUpdate ? (
                  <Badge label="Last-minute update" tone={colors.status.warning} variant="solid" icon="alert" />
                ) : null}
              </View>

              {/* Capacity stat tiles */}
              <View style={styles.statRow}>
                <View style={styles.statTile}>
                  <Text style={styles.statValue}>{item.maxPeople ?? 100}</Text>
                  <Text style={styles.statLabel}>Daily cap</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statValue}>{item.currentAppointments ?? 0}</Text>
                  <Text style={styles.statLabel}>Booked</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={[styles.statValue, { color: colors.status.success }]}>
                    {item.remainingCapacity ?? '—'}
                  </Text>
                  <Text style={styles.statLabel}>Open</Text>
                </View>
              </View>

              {/* Info list */}
              <View style={styles.detailList}>
                <Row label="Dates" value={item.dateRange} />
                <Row label="Month" value={item.month} />
                <Row label="Preferred period" value={period} />
                <Row label="Slot capacity" value={firstSlot?.slotCapacity} last />
              </View>

              {item.timeSlots && item.timeSlots.length > 0 ? (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailSectionLabel}>Time slots</Text>
                  <View style={styles.detailBadgeRow}>
                    {item.timeSlots.map((slot, i) => (
                      <Badge
                        key={i}
                        label={`${slot.period || 'Slot'}${slot.slotCapacity ? ` · ${slot.slotCapacity}` : ''}`}
                        tone={colors.primary.saffron}
                        variant="soft"
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {item.changeNote ? (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailSectionLabel}>Update note</Text>
                  <View style={styles.noteCard}>
                    <Text style={styles.noteText}>{item.changeNote}</Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.detailEditBtn}
                activeOpacity={0.9}
                onPress={() => {
                  setDetailSchedule(null);
                  openEditModal(item);
                }}
              >
                <MaterialCommunityIcons name="pencil" size={18} color={colors.text.white} />
                <Text style={styles.detailEditBtnText}>Edit schedule</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFormModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setModalVisible(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.grabber} />
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalEyebrow}>
                {editingSchedule ? 'Update details' : 'New entry'}
              </Text>
              <Text style={styles.modalTitle}>
                {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.primary.maroon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>Month *</Text>
            <View style={styles.choiceRow}>
              {MONTHS.map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.choiceChip,
                    formData.month === month && styles.choiceChipActive,
                  ]}
                  onPress={() => setFormData((prev) => ({ ...prev, month }))}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      formData.month === month && styles.choiceChipTextActive,
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Base Ashram *</Text>
            <View style={styles.choiceRow}>
              {BASE_LOCATIONS.map((baseLocation) => (
                <TouchableOpacity
                  key={baseLocation}
                  style={[
                    styles.choiceChip,
                    formData.baseLocation === baseLocation && styles.choiceChipActive,
                  ]}
                  onPress={() => setFormData((prev) => ({ ...prev, baseLocation }))}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      formData.baseLocation === baseLocation && styles.choiceChipTextActive,
                    ]}
                  >
                    {baseLocation}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Internal Locations *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.locations}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, locations: value }))}
              placeholder="Exact venue details used by staff"
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.translationSectionTitle}>Localized Public Titles</Text>
            {CONTENT_LANGUAGES.map(({ code, label }) => (
              <TextInput
                key={`schedule-title-${code}`}
                style={styles.textInput}
                value={formData.publicTitle[code] || ''}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    publicTitle: { ...prev.publicTitle, [code]: value },
                  }))
                }
                placeholder={`Public title (${label})`}
                placeholderTextColor={colors.text.secondary}
              />
            ))}

            <Text style={styles.translationSectionTitle}>Localized Public Locations</Text>
            {CONTENT_LANGUAGES.map(({ code, label }) => (
              <TextInput
                key={`schedule-location-${code}`}
                style={styles.textInput}
                value={formData.publicLocation[code] || ''}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    publicLocation: { ...prev.publicLocation, [code]: value },
                  }))
                }
                placeholder={`Public location (${label})`}
                placeholderTextColor={colors.text.secondary}
              />
            ))}

            <View style={styles.fieldRow}>
              <View style={styles.fieldCol}>
                <Text style={styles.inputLabel}>Start Date *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.startDate}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, startDate: value }))}
                  placeholder="2026-04-07"
                  placeholderTextColor={colors.text.secondary}
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.inputLabel}>End Date *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.endDate}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, endDate: value }))}
                  placeholder="2026-04-07"
                  placeholderTextColor={colors.text.secondary}
                />
              </View>
            </View>
            <Text style={styles.fieldHint}>Use ISO format, YYYY-MM-DD.</Text>

            <Text style={styles.inputLabel}>Meeting Window</Text>
            <TextInput
              style={styles.textInput}
              value={formData.period}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, period: value }))}
              placeholder="Morning / Evening / Whole day"
              placeholderTextColor={colors.text.secondary}
            />

            <Text style={styles.inputLabel}>Daily Appointment Capacity</Text>
            <TextInput
              style={styles.textInput}
              value={formData.maxPeople}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, maxPeople: value }))}
              placeholder="25"
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Slot Capacity Override</Text>
            <TextInput
              style={styles.textInput}
              value={formData.slotCapacity}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, slotCapacity: value }))}
              placeholder="Optional if this date has a special cap"
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
            />

            <Text style={styles.translationSectionTitle}>Localized Public Notes</Text>
            {CONTENT_LANGUAGES.map(({ code, label }) => (
              <TextInput
                key={`schedule-notes-${code}`}
                style={[styles.textInput, styles.textArea]}
                value={formData.publicNotes[code] || ''}
                onChangeText={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    publicNotes: { ...prev.publicNotes, [code]: value },
                  }))
                }
                placeholder={`Public notes (${label})`}
                placeholderTextColor={colors.text.secondary}
                multiline
                numberOfLines={3}
              />
            ))}

            <Text style={styles.inputLabel}>Change Note</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.changeNote}
              onChangeText={(value) => setFormData((prev) => ({ ...prev, changeNote: value }))}
              placeholder="Use this for last-minute changes or urgent updates"
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={2}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Accept appointment requests</Text>
              <Switch
                value={formData.appointment}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, appointment: value }))}
                trackColor={{ false: colors.text.secondary, true: colors.status.success }}
                thumbColor={colors.text.white}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mark as last-minute update</Text>
              <Switch
                value={formData.isLastMinuteUpdate}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, isLastMinuteUpdate: value }))
                }
                trackColor={{ false: colors.text.secondary, true: colors.status.warning }}
                thumbColor={colors.text.white}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Text style={styles.saveButtonText}>{editingSchedule ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading schedules...</Text>
      </View>
    );
  }

  if (error && schedules.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSchedules}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={groupedSchedules}
        keyExtractor={(item) => item._id}
        renderItem={renderScheduleItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.maroon]}
            tintColor={colors.primary.maroon}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreateModal} color={colors.text.white} />

      {renderDetailModal()}
      {renderFormModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.parchment,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 16,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary.saffron,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.text.white,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  listHeader: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 46,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gold.dark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.soft,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitleIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.gold.light,
    flexShrink: 1,
    letterSpacing: 0.3,
  },
  sectionBadge: {
    backgroundColor: colors.gold.main,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary.maroon,
  },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold,
    overflow: 'hidden',
    ...shadows.soft,
  },
  cardBody: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  leftStripe: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.primary.maroon,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
  },
  detailsSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleTextWrap: {
    flex: 1,
  },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  locationText: {
    ...typography.title,
    color: colors.primary.maroon,
    fontWeight: '700',
  },
  baseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  detailSheet: {
    backgroundColor: colors.background.warmWhite,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  detailHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailEyebrow: {
    ...typography.micro,
    color: colors.gold.light,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  detailClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    color: colors.text.white,
  },
  detailSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  detailSub: {
    ...typography.bodySm,
    color: colors.gold.light,
  },
  detailBody: {},
  detailBodyContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary.maroon,
  },
  statLabel: {
    ...typography.micro,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  detailList: {
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold as string,
    gap: spacing.md,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    ...typography.label,
    color: colors.gold.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    ...typography.body,
    flexShrink: 1,
    textAlign: 'right',
    color: colors.primary.maroon,
    fontWeight: '700',
  },
  detailBlock: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  detailSectionLabel: {
    ...typography.label,
    color: colors.gold.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noteCard: {
    backgroundColor: colors.background.parchment,
    borderLeftWidth: 3,
    borderLeftColor: colors.status.warning,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  noteText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 21,
  },
  detailEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.maroon,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.xl,
    ...shadows.maroonGlow,
  },
  detailEditBtnText: {
    ...typography.title,
    color: colors.text.white,
  },
  secondaryText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  dateRangeText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    fontWeight: '600',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  capacityStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  capItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capItemAccent: {
    backgroundColor: `${colors.status.success}12`,
  },
  capValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary.maroon,
  },
  capValueOpen: {
    color: colors.status.success,
  },
  capLabel: {
    ...typography.micro,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  capLabelOpen: {
    color: colors.status.success,
  },
  capDivider: {
    width: 1,
    alignSelf: 'center',
    height: 30,
    backgroundColor: colors.border.gold as string,
  },
  changeNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.status.warning}10`,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  changeNoteIcon: {
    marginTop: 1,
    marginRight: spacing.xs,
  },
  changeNoteText: {
    ...typography.bodySm,
    color: colors.status.warning,
    flex: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
    paddingTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary.maroon}0F`,
  },
  actionButtonDanger: {
    backgroundColor: `${colors.status.error}0F`,
  },
  actionButtonText: {
    fontSize: 13,
    color: colors.primary.maroon,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary.maroon,
    ...shadows.maroonGlow,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.warmWhite,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border.gold as string,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold,
    paddingBottom: spacing.md,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalEyebrow: {
    ...typography.micro,
    color: colors.gold.dark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary.maroon,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  modalBody: {
    marginHorizontal: -spacing.xs,
  },
  modalBodyContent: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldCol: {
    flex: 1,
  },
  fieldHint: {
    ...typography.micro,
    color: colors.text.secondary,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  translationSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.gold.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold.main,
  },
  textInput: {
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: colors.border.gold,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.parchment,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  choiceChipActive: {
    backgroundColor: colors.primary.maroon,
    borderColor: colors.primary.maroon,
  },
  choiceChipText: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: colors.gold.light,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
  },
  switchLabel: {
    flex: 1,
    marginRight: spacing.md,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
  saveButton: {
    flex: 1.6,
    backgroundColor: colors.primary.maroon,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.maroonGlow,
  },
  saveButtonText: {
    color: colors.text.white,
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
