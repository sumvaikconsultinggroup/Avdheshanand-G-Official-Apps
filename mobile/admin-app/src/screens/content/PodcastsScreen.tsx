import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  ActivityIndicator,
  FAB,
  TextInput,
  Button,
  IconButton,
  Portal,
  Snackbar,
  Switch,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  gradients,
} from '../../theme';
import { AdminHero, Badge } from '../../components/common';
import api from '../../services/api';
import { pickImage } from '../../services/imageUpload';
import { Podcast } from '../../types';

type PodcastFormData = {
  title: string;
  description: string;
  videoUrl: string;
  category: string;
  date: string;
  duration: string;
  featured: boolean;
  coverImageUri: string | null;
};

const emptyForm: PodcastFormData = {
  title: '',
  description: '',
  videoUrl: '',
  category: '',
  date: '',
  duration: '',
  featured: false,
  coverImageUri: null,
};

export function PodcastsScreen() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
  const [form, setForm] = useState<PodcastFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const toIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fetchPodcasts = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/podcasts');
      const data = Array.isArray(response.data) ? response.data : [];
      setPodcasts(data.filter((p: Podcast) => !p.isDeleted));
    } catch (err) {
      setError('Failed to load podcasts');
      console.error('Error fetching podcasts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPodcasts();
  }, [fetchPodcasts]);

  const showSnackbar = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const openCreateModal = () => {
    setEditingPodcast(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (podcast: Podcast) => {
    setEditingPodcast(podcast);
    setForm({
      title: podcast.title || '',
      description: podcast.description || '',
      videoUrl: podcast.videoUrl || '',
      category: podcast.category || '',
      date: podcast.date || '',
      duration: podcast.duration || '',
      featured: podcast.featured || false,
      coverImageUri: null,
    });
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    try {
      const uri = await pickImage();
      if (uri) {
        setForm((prev) => ({ ...prev, coverImageUri: uri }));
      }
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to pick image');
    }
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('videoUrl', form.videoUrl);
    if (form.category) fd.append('category', form.category);
    if (form.date) fd.append('date', form.date);
    if (form.duration) fd.append('duration', form.duration);
    fd.append('featured', String(form.featured));
    if (form.coverImageUri) {
      const filename = form.coverImageUri.split('/').pop() || 'cover.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      fd.append('coverImage', {
        uri: form.coverImageUri,
        name: filename,
        type,
      } as any);
    }
    return fd;
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.videoUrl.trim()) {
      showSnackbar('Title and YouTube URL are required');
      return;
    }
    setSubmitting(true);
    try {
      const fd = buildFormData();
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingPodcast) {
        await api.put(`/podcasts/${editingPodcast._id}`, fd, config);
        showSnackbar('Podcast updated — your changes are now live on the user app and the website.');
      } else {
        await api.post('/podcasts', fd, config);
        showSnackbar('Podcast published — the new podcast is now live on the user app and the website.');
      }
      setModalVisible(false);
      fetchPodcasts();
    } catch (err) {
      console.error('Error saving podcast:', err);
      showSnackbar('Failed to save podcast');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (podcast: Podcast) => {
    Alert.alert(
      'Delete Podcast',
      `Are you sure you want to delete "${podcast.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/podcasts/${podcast._id}`);
              showSnackbar('Podcast deleted');
              fetchPodcasts();
            } catch (err) {
              console.error('Error deleting podcast:', err);
              showSnackbar('Failed to delete podcast');
            }
          },
        },
      ],
    );
  };

  const openYouTube = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        showSnackbar('Could not open YouTube link');
      });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderPodcastCard = ({ item }: { item: Podcast }) => (
    <Card style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openYouTube(item.videoUrl)}
      >
        <View style={styles.cardRow}>
          <View style={styles.coverContainer}>
            {item.coverImage ? (
              <Image
                source={{ uri: item.coverImage }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={gradients.maroon as readonly [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverPlaceholder}
              >
                <Text style={styles.placeholderIcon}>🎙️</Text>
              </LinearGradient>
            )}
            <View style={styles.micBadge}>
              <IconButton
                icon="microphone"
                size={13}
                iconColor={colors.text.white}
                style={styles.micBadgeIcon}
              />
            </View>
            {item.duration ? (
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>{item.duration}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.podcastInfo}>
            <Text style={styles.podcastTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.chipRow}>
              {item.category ? (
                <Badge label={item.category} tone={colors.primary.saffron} variant="soft" />
              ) : null}
              {item.date ? (
                <View style={styles.datePill}>
                  <IconButton
                    icon="calendar-blank"
                    size={11}
                    iconColor={colors.primary.maroon}
                    style={styles.dateIcon}
                  />
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>
              ) : null}
            </View>
            {item.featured ? (
              <Badge label="Featured" tone={colors.gold.dark} variant="soft" icon="star" style={{ marginTop: spacing.sm }} />
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <Badge label="Live on app & website" tone={colors.status.success} variant="soft" dot />
        <View style={styles.cardActionButtons}>
        <IconButton
          icon="pencil"
          size={18}
          iconColor={colors.primary.maroon}
          onPress={() => openEditModal(item)}
        />
        <IconButton
          icon="delete"
          size={18}
          iconColor={colors.status.error}
          onPress={() => handleDelete(item)}
        />
        <IconButton
          icon="youtube"
          size={18}
          iconColor={colors.status.error}
          onPress={() => openYouTube(item.videoUrl)}
        />
        </View>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWell}>
        <Text style={styles.emptyStateIcon}>🎙️</Text>
      </View>
      <Text style={styles.emptyStateText}>No podcasts available</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap + to add your first podcast
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <AdminHero
        eyebrow="Manage"
        title="Podcasts"
        subtitle="Publish once — every episode appears instantly on the user app and the website."
        badge={`${podcasts.length} live`}
        actions={[{ label: 'New Podcast', icon: 'plus', onPress: openCreateModal }]}
      />
    </View>
  );

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setModalVisible(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={gradients.maroon as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalHeader}
        >
          <Text style={styles.modalTitle}>
            {editingPodcast ? 'Edit Podcast' : 'Add Podcast'}
          </Text>
          <IconButton
            icon="close"
            size={24}
            iconColor={colors.text.white}
            onPress={() => setModalVisible(false)}
          />
        </LinearGradient>
        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoBanner}>
            <MaterialCommunityIcons name="broadcast" size={16} color={colors.status.success} />
            <Text style={styles.infoBannerText}>
              Saved podcasts publish instantly to the user app and the website.
            </Text>
          </View>

          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {form.coverImageUri ? (
              <Image
                source={{ uri: form.coverImageUri }}
                style={styles.imagePickerPreview}
              />
            ) : editingPodcast?.coverImage ? (
              <Image
                source={{ uri: editingPodcast.coverImage }}
                style={styles.imagePickerPreview}
              />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Text style={styles.imagePickerText}>Tap to pick cover image</Text>
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            label="Title *"
            value={form.title}
            onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
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
            numberOfLines={3}
            style={styles.input}
            outlineColor={colors.border.gold}
            activeOutlineColor={colors.primary.maroon}
          />
          <TextInput
            label="YouTube URL *"
            value={form.videoUrl}
            onChangeText={(v) => setForm((p) => ({ ...p, videoUrl: v }))}
            mode="outlined"
            keyboardType="url"
            autoCapitalize="none"
            style={styles.input}
            outlineColor={colors.border.gold}
            activeOutlineColor={colors.primary.maroon}
          />
          <View style={styles.row}>
            <TextInput
              label="Category"
              value={form.category}
              onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
              mode="outlined"
              style={[styles.input, styles.halfInput]}
              outlineColor={colors.border.gold}
              activeOutlineColor={colors.primary.maroon}
            />
            <TextInput
              label="Duration"
              value={form.duration}
              onChangeText={(v) => setForm((p) => ({ ...p, duration: v }))}
              mode="outlined"
              placeholder="e.g. 45:30"
              style={[styles.input, styles.halfInput]}
              outlineColor={colors.border.gold}
              activeOutlineColor={colors.primary.maroon}
            />
          </View>
          <TouchableOpacity
            onPress={() => setDatePickerVisible(true)}
            activeOpacity={0.8}
            style={styles.dateField}
          >
            <MaterialCommunityIcons name="calendar-month-outline" size={22} color={colors.primary.maroon} />
            <View style={styles.dateFieldTextWrap}>
              <Text style={styles.dateFieldLabel}>Date</Text>
              <Text style={[styles.dateFieldValue, !form.date && styles.dateFieldPlaceholder]}>
                {form.date ? formatDate(form.date) : 'Tap to select a date'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={22} color={colors.gold.dark} />
          </TouchableOpacity>
          {datePickerVisible ? (
            <DateTimePicker
              value={form.date ? new Date(`${form.date}T00:00:00`) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(e, dt) => {
                setDatePickerVisible(false);
                if (e.type === 'set' && dt) setForm((p) => ({ ...p, date: toIsoDate(dt) }));
              }}
            />
          ) : null}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Featured</Text>
            <Switch
              value={form.featured}
              onValueChange={(v) => setForm((p) => ({ ...p, featured: v }))}
              color={colors.primary.saffron}
            />
          </View>

          <LinearGradient
            colors={gradients.maroon as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
              buttonColor="transparent"
              textColor={colors.text.white}
            >
              {editingPodcast ? 'Update Podcast' : 'Create Podcast'}
            </Button>
          </LinearGradient>

          <Button
            mode="outlined"
            onPress={() => setModalVisible(false)}
            style={styles.cancelButton}
            textColor={colors.primary.maroon}
          >
            Cancel
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading podcasts...</Text>
      </View>
    );
  }

  if (error && podcasts.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPodcasts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={podcasts}
        keyExtractor={(item) => item._id}
        renderItem={renderPodcastCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={podcasts.length > 0 ? renderHeader : null}
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
        color={colors.text.white}
        onPress={openCreateModal}
      />
      {renderModal()}
      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ visible: false, message: '' })}
          duration={3000}
          action={{ label: 'OK', onPress: () => {} }}
        >
          {snackbar.message}
        </Snackbar>
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
    color: colors.status.error,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary.maroon,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.maroonGlow,
  },
  retryButtonText: {
    color: colors.text.white,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 96,
  },
  header: {
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  headerTitle: {
    ...typography.titleLg,
    color: colors.primary.maroon,
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
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
  cardRow: {
    flexDirection: 'row',
    padding: spacing.sm,
  },
  coverContainer: {
    width: 108,
    height: 108,
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.sandstone,
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 34,
  },
  micBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.maroon,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  micBadgeIcon: {
    margin: 0,
    width: 24,
    height: 24,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(74, 0, 16, 0.82)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationBadgeText: {
    color: colors.text.white,
    fontSize: 10,
    fontWeight: '700',
  },
  podcastInfo: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  podcastTitle: {
    ...typography.titleSm,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: 'rgba(163, 18, 58, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(163, 18, 58, 0.25)',
    height: 26,
  },
  categoryChipText: {
    color: colors.primary.saffron,
    fontSize: 10,
    fontWeight: '700',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 160, 23, 0.14)',
    borderRadius: borderRadius.full,
    paddingRight: spacing.sm,
  },
  dateIcon: {
    margin: 0,
    width: 20,
    height: 20,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary.maroon,
  },
  featuredChip: {
    backgroundColor: 'rgba(212, 160, 23, 0.18)',
    borderWidth: 1,
    borderColor: colors.gold.main,
    height: 26,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  featuredChipText: {
    color: colors.gold.dark,
    fontSize: 10,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
  },
  cardActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
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
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIconWell: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(163, 18, 58, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(163, 18, 58, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 44,
  },
  emptyStateText: {
    ...typography.title,
    color: colors.primary.maroon,
  },
  emptyStateSubtext: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary.maroon,
    borderRadius: borderRadius.full,
    ...shadows.maroonGlow,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...shadows.maroonGlow,
  },
  modalTitle: {
    ...typography.title,
    color: colors.text.white,
    marginLeft: spacing.xs,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border.gold,
    borderStyle: 'dashed',
  },
  imagePickerPreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.sandstone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.background.warmWhite,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold,
    marginBottom: spacing.sm,
  },
  switchLabel: {
    ...typography.titleSm,
    color: colors.primary.maroon,
  },
  submitGradient: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.maroonGlow,
  },
  submitButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
  },
  cancelButton: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.full,
    borderColor: colors.border.maroon,
    paddingVertical: spacing.xs,
  },
});
