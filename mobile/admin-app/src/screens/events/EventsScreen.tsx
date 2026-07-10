import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import {
  Card,
  FAB,
  ActivityIndicator,
  IconButton,
  TextInput,
  Button,
  Dialog,
  Portal,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, typography, shadows, gradients } from '../../theme';
import { AdminHero, Badge } from '../../components/common';
import api from '../../services/api';
import { Event } from '../../types';

const toIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

interface EventFormData {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  description: string;
  imageUri: string | null;
  imageName: string | null;
}

const emptyForm: EventFormData = {
  eventName: '',
  eventDate: '',
  eventLocation: '',
  description: '',
  imageUri: null,
  imageName: null,
};

export function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Delete confirmation
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/events');
      const data = response.data?.events || response.data || [];
      setEvents(data.filter((e: Event) => !e.isDeleted));
    } catch (err) {
      setError('Failed to load events');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const isValidIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };

  // ── Image Picker ──

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || 'event_image.jpg';
      setForm((prev) => ({ ...prev, imageUri: asset.uri, imageName: fileName }));
    }
  };

  // ── Create / Edit ──

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setForm({
      eventName: event.eventName,
      eventDate: event.eventDate ? event.eventDate.split('T')[0] : '',
      eventLocation: event.eventLocation,
      description: event.description || '',
      imageUri: event.eventImage || null,
      imageName: null,
    });
    setModalVisible(true);
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append('eventName', form.eventName);
    fd.append('eventDate', form.eventDate);
    fd.append('eventLocation', form.eventLocation);
    fd.append('description', form.description);

    if (form.imageUri && form.imageName) {
      const ext = form.imageName.split('.').pop()?.toLowerCase() || 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      fd.append('eventImage', {
        uri: form.imageUri,
        name: form.imageName,
        type: mimeType,
      } as unknown as Blob);
    }

    return fd;
  };

  const handleSubmit = async () => {
    if (!form.eventName.trim()) {
      Alert.alert('Validation', 'Event name is required.');
      return;
    }
    if (!form.eventDate.trim()) {
      Alert.alert('Validation', 'Event date is required.');
      return;
    }
    if (!isValidIsoDate(form.eventDate.trim())) {
      Alert.alert('Validation', 'Event date must be in YYYY-MM-DD format.');
      return;
    }
    if (!form.eventLocation.trim()) {
      Alert.alert('Validation', 'Event location is required.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = buildFormData();
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      let updatedEvent: Event | null = null;
      if (editingEvent) {
        const res = await api.put(`/events/${editingEvent._id}`, fd, config);
        updatedEvent = res.data;
        // Update local state immediately so the UI reflects changes
        if (updatedEvent) {
          setEvents(prev => prev.map(e => e._id === editingEvent._id ? { ...e, ...updatedEvent } : e));
        }
        Alert.alert('Event updated', 'Your changes are now live on the user app and the website.');
      } else {
        await api.post('/events', fd, config);
        Alert.alert('Event published', 'The new event is now live on the user app and the website.');
      }

      setModalVisible(false);
      setForm(emptyForm);
      setEditingEvent(null);
      // Re-fetch to ensure server state is in sync
      setTimeout(() => fetchEvents(), 500);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', `${msg}${status ? ` (${status})` : ''}`);
      console.error('Event submit error:', JSON.stringify(err?.response?.data || err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──

  const confirmDelete = (event: Event) => {
    setEventToDelete(event);
    setDeleteDialogVisible(true);
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/events/${eventToDelete._id}`);
      setDeleteDialogVisible(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete event.';
      Alert.alert('Error', msg);
      console.error('Event delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ──

  const renderEventCard = ({ item }: { item: Event }) => {
    const eventDate = new Date(item.eventDate);
    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.85}
      >
        <Card style={styles.card}>
          {item.eventImage ? (
            <View style={styles.cardImageWrap}>
              <Image
                source={{ uri: item.eventImage }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(74,0,16,0.55)']}
                style={styles.cardImageScrim}
              />
              <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
                <Text style={styles.dateMonth}>
                  {eventDate.toLocaleString('en', { month: 'short' })}
                </Text>
              </View>
            </View>
          ) : null}
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              {!item.eventImage ? (
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
                  <Text style={styles.dateMonth}>
                    {eventDate.toLocaleString('en', { month: 'short' })}
                  </Text>
                </View>
              ) : null}
              <View style={styles.eventInfo}>
                <Text style={styles.eventName} numberOfLines={2}>
                  {item.eventName}
                </Text>
                <View style={styles.eventMeta}>
                  <MaterialCommunityIcons
                    name="calendar-outline"
                    size={15}
                    color={colors.primary.saffron}
                    style={styles.metaIcon}
                  />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {formatDate(item.eventDate)}
                  </Text>
                </View>
                <View style={styles.eventMeta}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={15}
                    color={colors.gold.dark}
                    style={styles.metaIcon}
                  />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.eventLocation || 'TBA'}
                  </Text>
                </View>
              </View>
            </View>

            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.cardFooter}>
              <Badge label="Live on app & website" tone={colors.status.success} variant="soft" dot />
              <View style={styles.footerActions}>
                <TouchableOpacity style={styles.footerBtn} onPress={() => openEditModal(item)} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="pencil" size={16} color={colors.primary.maroon} />
                  <Text style={styles.footerBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerBtnDelete} onPress={() => confirmDelete(item)} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.status.error} />
                  <Text style={styles.footerBtnDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWell}>
        <MaterialCommunityIcons
          name="calendar-star"
          size={40}
          color={colors.primary.saffron}
        />
      </View>
      <Text style={styles.emptyStateText}>No events yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Create your first event using the + button below
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error && events.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconWell}>
          <MaterialCommunityIcons
            name="calendar-alert"
            size={40}
            color={colors.status.error}
          />
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEvents} activeOpacity={0.85}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <AdminHero
              eyebrow="Manage"
              title="Events"
              subtitle="Publish once — every event appears instantly on the user app and the website."
              badge={`${events.length} live`}
              actions={[{ label: 'New Event', icon: 'plus', onPress: openCreateModal }]}
            />
          </View>
        }
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

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openCreateModal}
        color={colors.text.white}
      />

      {/* ── Create / Edit Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  {editingEvent ? 'UPDATE' : 'NEW'}
                </Text>
                <Text style={styles.modalTitle}>
                  {editingEvent ? 'Edit Event' : 'Create Event'}
                </Text>
              </View>
              <IconButton
                icon="close"
                iconColor={colors.primary.maroon}
                size={24}
                onPress={() => setModalVisible(false)}
              />
            </View>

            <ScrollView
              style={styles.formScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="broadcast" size={16} color={colors.status.success} />
                <Text style={styles.infoBannerText}>
                  Saved events publish instantly to the user app and the website.
                </Text>
              </View>

              <TextInput
                label="Event Name *"
                value={form.eventName}
                onChangeText={(v) => setForm((p) => ({ ...p, eventName: v }))}
                mode="outlined"
                style={styles.input}
                outlineColor={colors.border.gold}
                activeOutlineColor={colors.primary.maroon}
              />

              <TouchableOpacity
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.8}
                style={styles.dateField}
              >
                <MaterialCommunityIcons name="calendar-month-outline" size={22} color={colors.primary.maroon} />
                <View style={styles.dateFieldTextWrap}>
                  <Text style={styles.dateFieldLabel}>Event Date *</Text>
                  <Text style={[styles.dateFieldValue, !form.eventDate && styles.dateFieldPlaceholder]}>
                    {form.eventDate ? formatDate(form.eventDate) : 'Tap to select a date'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={22} color={colors.gold.dark} />
              </TouchableOpacity>
              {datePickerVisible ? (
                <DateTimePicker
                  value={form.eventDate ? new Date(`${form.eventDate}T00:00:00`) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, date) => {
                    setDatePickerVisible(false);
                    if (event.type === 'set' && date) {
                      setForm((p) => ({ ...p, eventDate: toIsoDate(date) }));
                    }
                  }}
                />
              ) : null}

              <TextInput
                label="Event Location *"
                value={form.eventLocation}
                onChangeText={(v) => setForm((p) => ({ ...p, eventLocation: v }))}
                mode="outlined"
                style={styles.input}
                outlineColor={colors.border.gold}
                activeOutlineColor={colors.primary.maroon}
              />

              <TextInput
                label="Description"
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.multilineInput]}
                outlineColor={colors.border.gold}
                activeOutlineColor={colors.primary.maroon}
              />

              {/* Image picker */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {form.imageUri ? (
                  <Image
                    source={{ uri: form.imageUri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialCommunityIcons
                      name="camera-plus-outline"
                      size={30}
                      color={colors.primary.saffron}
                    />
                    <Text style={styles.imagePlaceholderText}>Tap to select an image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.formActions}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelButton}
                  textColor={colors.primary.maroon}
                >
                  Cancel
                </Button>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={styles.submitButtonWrap}
                >
                  <LinearGradient
                    colors={gradients.maroon as readonly [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.submitGradient, submitting && styles.submitGradientDisabled]}
                  >
                    {submitting ? (
                      <ActivityIndicator size={18} color={colors.text.white} />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {editingEvent ? 'Update' : 'Create'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete Event</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete "{eventToDelete?.eventName}"? This action cannot be
              undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} textColor={colors.text.secondary}>
              Cancel
            </Button>
            <Button
              onPress={handleDelete}
              loading={deleting}
              disabled={deleting}
              textColor={colors.status.error}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
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
    backgroundColor: colors.background.parchment,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 16,
  },
  errorText: {
    ...typography.title,
    color: colors.primary.maroon,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary.maroon,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    ...shadows.maroonGlow,
  },
  retryButtonText: {
    color: colors.text.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  listHeader: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.gold.dark,
    letterSpacing: 2,
    marginBottom: 2,
  },
  listTitle: {
    ...typography.titleLg,
    color: colors.primary.maroon,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold,
    overflow: 'hidden',
    ...shadows.soft,
  },
  cardImageWrap: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.background.sandstone,
  },
  cardImageScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
  },
  dateBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    minWidth: 52,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary.maroon,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold.main,
    ...shadows.maroonGlow,
  },
  cardContent: {
    paddingVertical: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary.maroon,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold.main,
  },
  dateDay: {
    color: colors.text.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  dateMonth: {
    color: colors.gold.light,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    ...typography.title,
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaIcon: {
    marginRight: spacing.xs + 1,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    flexShrink: 1,
  },
  cardDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.cream,
  },
  footerBtnText: {
    ...typography.label,
    color: colors.primary.maroon,
    fontWeight: '700',
  },
  footerBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: `${colors.status.error}44`,
    backgroundColor: `${colors.status.error}12`,
  },
  footerBtnDeleteText: {
    ...typography.label,
    color: colors.status.error,
    fontWeight: '700',
  },
  // Date picker field
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  dateFieldTextWrap: {
    flex: 1,
  },
  dateFieldLabel: {
    ...typography.micro,
    color: colors.gold.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dateFieldValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  dateFieldPlaceholder: {
    color: colors.text.secondary,
    fontWeight: '400',
  },
  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F3FAF4',
    borderWidth: 1,
    borderColor: 'rgba(46,158,91,0.25)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    ...typography.bodySm,
    color: colors.text.primary,
    flex: 1,
  },
  emptyState: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyIconWell: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(163, 18, 58, 0.08)',
    borderWidth: 1,
    borderColor: colors.border.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateText: {
    ...typography.title,
    color: colors.primary.maroon,
  },
  emptyStateSubtext: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 260,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.maroon,
    ...shadows.maroonGlow,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 0, 16, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.warmWhite,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: colors.border.gold,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border.gold,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold,
    paddingBottom: spacing.sm,
  },
  modalEyebrow: {
    ...typography.micro,
    color: colors.gold.dark,
    letterSpacing: 2,
    marginBottom: 2,
  },
  modalTitle: {
    ...typography.titleLg,
    color: colors.primary.maroon,
  },
  formScroll: {
    flexGrow: 0,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
  },
  multilineInput: {
    minHeight: 100,
  },

  // Image picker
  imagePicker: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.gold,
    borderStyle: 'dashed',
  },
  imagePreview: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.sandstone,
    gap: spacing.xs,
  },
  imagePlaceholderText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },

  // Form actions
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  cancelButton: {
    borderColor: colors.primary.maroon,
    borderRadius: borderRadius.full,
  },
  submitButtonWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.maroonGlow,
  },
  submitGradient: {
    minWidth: 120,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitGradientDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.text.white,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
