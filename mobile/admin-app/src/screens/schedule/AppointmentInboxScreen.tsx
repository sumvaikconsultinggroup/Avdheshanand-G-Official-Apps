import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, ActivityIndicator, Portal, Modal, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Badge, Avatar } from '../../components/common';
import api from '../../services/api';
import { ScheduleRegistration } from '../../types';
import { useAuth } from '../../context/AuthContext';

const statusTone = (status?: string) =>
  status === 'Approved'
    ? colors.status.success
    : status === 'Rejected'
      ? colors.status.error
      : colors.gold.dark;

type StatusFilter = 'Pending' | 'Approved' | 'Rejected';

export function AppointmentInboxScreen() {
  const { admin } = useAuth();
  const [registrations, setRegistrations] = useState<ScheduleRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pending');
  const [detailRegistration, setDetailRegistration] = useState<ScheduleRegistration | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvedTime, setApprovedTime] = useState('');
  const [approvedLocation, setApprovedLocation] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');

  const fetchRegistrations = useCallback(async () => {
    try {
      const response = await api.get(`/scheduleRegistration?status=${statusFilter}`);
      const data = Array.isArray(response.data) ? response.data : [];
      setRegistrations(data);
    } catch (error) {
      console.error('Failed to load registrations', error);
      Alert.alert('Error', 'Failed to load appointment requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRegistrations();
  }, [fetchRegistrations]);

  const summary = useMemo(() => {
    const pending = registrations.filter((item) => item.status === 'Pending').length;
    const approved = registrations.filter((item) => item.status === 'Approved').length;
    const rejected = registrations.filter((item) => item.status === 'Rejected').length;
    return { pending, approved, rejected };
  }, [registrations]);

  const openDetail = (registration: ScheduleRegistration) => {
    setDetailRegistration(registration);
    setApprovedTime(registration.requestedSchedule?.eventTime || registration.preferedTime || '');
    setApprovedLocation(registration.requestedSchedule?.eventLocation || '');
    setInternalNotes(registration.internalNotes || '');
    setRescheduleDate(
      registration.requestedSchedule?.eventDate
        ? new Date(registration.requestedSchedule.eventDate).toISOString().split('T')[0]
        : ''
    );
  };

  const updateRegistration = async (payload: Record<string, unknown>) => {
    if (!detailRegistration) return;

    setActionLoading(true);
    try {
      await api.put(`/scheduleRegistration/${detailRegistration._id}`, payload);
      setDetailRegistration(null);
      fetchRegistrations();
    } catch (error: any) {
      console.error('Failed to update registration', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update appointment request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    await updateRegistration({
      status: 'Approved',
      assignedTo: admin?.username || admin?.name || 'PA Team',
      internalNotes,
      requestedSchedule: {
        eventTime: approvedTime,
        eventLocation: approvedLocation,
      },
    });
  };

  const handleReject = async () => {
    await updateRegistration({
      status: 'Rejected',
      assignedTo: admin?.username || admin?.name || 'PA Team',
      internalNotes,
    });
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      Alert.alert('Missing date', 'Please enter a new date in YYYY-MM-DD format.');
      return;
    }

    await updateRegistration({
      reschedule: true,
      rescheduleDate: new Date(rescheduleDate).toISOString(),
      requestedSchedule: {
        eventDate: new Date(rescheduleDate).toISOString(),
        eventTime: approvedTime,
        eventLocation: approvedLocation,
      },
      internalNotes,
      assignedTo: admin?.username || admin?.name || 'PA Team',
    });
  };

  const renderRegistration = ({ item }: { item: ScheduleRegistration }) => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => openDetail(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Avatar name={item.name} size={44} />
            <View style={styles.cardHeaderText}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.metaText} numberOfLines={1}>{item.purpose}</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {item.requestedSchedule?.baseLocation || 'Ashram'} •{' '}
                {item.requestedSchedule?.eventLocation || 'Location pending'}
              </Text>
            </View>
            <Badge
              label={item.status}
              tone={statusTone(item.status)}
              variant="soft"
              dot
            />
          </View>

          <View style={styles.row}>
            <View style={styles.infoLabelWrap}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.primary.maroon} />
              <Text style={styles.infoLabel}>Date</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.requestedSchedule?.eventDate
                ? new Date(item.requestedSchedule.eventDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Pending'}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.infoLabelWrap}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary.maroon} />
              <Text style={styles.infoLabel}>Preferred</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>{item.preferedTime || 'Not provided'}</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.infoLabelWrap}>
              <MaterialCommunityIcons name="phone-outline" size={16} color={colors.primary.maroon} />
              <Text style={styles.infoLabel}>Phone</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>{item.phone}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <Text style={styles.screenTitle}>Appointment Inbox</Text>
      <Text style={styles.screenSubtitle}>
        PA team can approve, reject, or reschedule Swami Ji meeting requests from one place.
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.status.success }]}>{summary.approved}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.status.error }]}>{summary.rejected}</Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {(['Pending', 'Approved', 'Rejected'] as StatusFilter[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === status && styles.filterChipTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={registrations}
        keyExtractor={(item) => item._id}
        renderItem={renderRegistration}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.maroon]}
            tintColor={colors.primary.maroon}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-check-outline" size={48} color={colors.gold.dark} />
            <Text style={styles.emptyTitle}>No requests in this queue</Text>
            <Text style={styles.emptySubtitle}>New devotee appointment requests will appear here.</Text>
          </View>
        }
      />

      <Portal>
        <Modal
          visible={Boolean(detailRegistration)}
          onDismiss={() => setDetailRegistration(null)}
          contentContainerStyle={styles.modalContainer}
        >
          {detailRegistration ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{detailRegistration.name}</Text>
              <Text style={styles.modalMeta}>{detailRegistration.email}</Text>
              <Text style={styles.modalMeta}>{detailRegistration.phone}</Text>
              <Text style={styles.modalMeta}>{detailRegistration.purpose}</Text>

              <Text style={styles.inputLabel}>Confirmed Time</Text>
              <TextInput
                style={styles.input}
                value={approvedTime}
                onChangeText={setApprovedTime}
                placeholder="Morning / 11:00 AM"
              />

              <Text style={styles.inputLabel}>Confirmed Location</Text>
              <TextInput
                style={styles.input}
                value={approvedLocation}
                onChangeText={setApprovedLocation}
                placeholder="Delhi Ashram / Haridwar Ashram"
              />

              <Text style={styles.inputLabel}>Internal Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={internalNotes}
                onChangeText={setInternalNotes}
                placeholder="PA notes, coordination notes, gate instructions"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Reschedule Date</Text>
              <TextInput
                style={styles.input}
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
                placeholder="YYYY-MM-DD"
              />

              <View style={styles.buttonGrid}>
                <Button
                  mode="contained"
                  onPress={handleApprove}
                  loading={actionLoading}
                  buttonColor={colors.status.success}
                >
                  Approve
                </Button>
                <Button
                  mode="contained"
                  onPress={handleReject}
                  loading={actionLoading}
                  buttonColor={colors.status.error}
                >
                  Reject
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleReschedule}
                  loading={actionLoading}
                  textColor={colors.primary.maroon}
                >
                  Reschedule
                </Button>
              </View>
            </ScrollView>
          ) : null}
        </Modal>
      </Portal>
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
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerWrap: {
    marginBottom: spacing.lg,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  screenSubtitle: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  summaryCard: {
    marginTop: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...shadows.soft,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  summaryLabel: {
    marginTop: 4,
    color: colors.text.secondary,
  },
  filtersRow: {
    marginTop: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.warmWhite,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary.saffron,
    borderColor: colors.primary.saffron,
  },
  filterChipText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.text.white,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  metaText: {
    marginTop: 2,
    color: colors.text.secondary,
  },
  row: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoLabel: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  emptyState: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
  },
  modalContainer: {
    margin: spacing.lg,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  modalMeta: {
    marginTop: 4,
    color: colors.text.secondary,
  },
  inputLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '700',
    color: colors.text.primary,
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  buttonGrid: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
