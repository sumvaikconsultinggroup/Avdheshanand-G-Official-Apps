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
  LayoutAnimation,
  UIManager,
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
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AdminHero, Badge } from '../../components/common';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  gradients,
} from '../../theme';
import api from '../../services/api';
import { pickImage } from '../../services/imageUpload';
import { VideoSeries } from '../../types';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SeriesFormData = {
  title: string;
  description: string;
  category: string;
  coverImageUri: string | null;
};

const emptyForm: SeriesFormData = {
  title: '',
  description: '',
  category: '',
  coverImageUri: null,
};

export function VideosScreen() {
  const [series, setSeries] = useState<VideoSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSeries, setEditingSeries] = useState<VideoSeries | null>(null);
  const [form, setForm] = useState<SeriesFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const fetchVideoSeries = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/videoseries');
      const data = Array.isArray(response.data) ? response.data : [];
      setSeries(data);
    } catch (err) {
      setError('Failed to load video series');
      console.error('Error fetching video series:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVideoSeries();
  }, [fetchVideoSeries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVideoSeries();
  }, [fetchVideoSeries]);

  const showSnackbar = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openCreateModal = () => {
    setEditingSeries(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (s: VideoSeries) => {
    setEditingSeries(s);
    setForm({
      title: s.title || '',
      description: s.description || '',
      category: s.category || '',
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
    if (form.category) fd.append('category', form.category);
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
    if (!form.title.trim()) {
      showSnackbar('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      const fd = buildFormData();
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingSeries) {
        await api.put(`/videoseries/${editingSeries._id}`, fd, config);
        showSnackbar(
          'Series updated — your changes are now live on the user app and the website.',
        );
      } else {
        await api.post('/videoseries', fd, config);
        showSnackbar(
          'Series published — the new series is now live on the user app and the website.',
        );
      }
      setModalVisible(false);
      fetchVideoSeries();
    } catch (err) {
      console.error('Error saving series:', err);
      showSnackbar('Failed to save series');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (s: VideoSeries) => {
    Alert.alert(
      'Delete Series',
      `Are you sure you want to delete "${s.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/videoseries/${s._id}`);
              showSnackbar('Series deleted');
              fetchVideoSeries();
            } catch (err) {
              console.error('Error deleting series:', err);
              showSnackbar('Failed to delete series');
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

  const formatViews = (views?: number) => {
    if (!views) return '0';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return String(views);
  };

  const renderVideoItem = (video: NonNullable<VideoSeries['videos']>[number]) => (
    <TouchableOpacity
      key={video.videoId}
      style={styles.videoItem}
      activeOpacity={0.7}
      onPress={() => openYouTube(video.youtubeUrl)}
    >
      <View style={styles.videoThumbContainer}>
        {video.coverImage ? (
          <Image
            source={{ uri: video.coverImage }}
            style={styles.videoThumb}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.videoThumbPlaceholder}>
            <Text style={styles.videoThumbIcon}>▶</Text>
          </View>
        )}
        <View style={styles.videoPlayBadge}>
          <Text style={styles.videoPlayBadgeIcon}>▶</Text>
        </View>
        {video.duration ? (
          <View style={styles.videoDurationBadge}>
            <Text style={styles.videoDurationText}>{video.duration}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.videoDetails}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {video.title}
        </Text>
        {video.description ? (
          <Text style={styles.videoDescription} numberOfLines={1}>
            {video.description}
          </Text>
        ) : null}
        <View style={styles.videoMeta}>
          {video.views !== undefined ? (
            <View style={styles.videoMetaItem}>
              <Text style={styles.videoMetaIcon}>◍</Text>
              <Text style={styles.videoMetaText}>
                {formatViews(video.views)} views
              </Text>
            </View>
          ) : null}
          {video.likes !== undefined ? (
            <View style={styles.videoMetaItem}>
              <Text style={styles.videoMetaIcon}>♥</Text>
              <Text style={styles.videoMetaText}>
                {formatViews(video.likes)} likes
              </Text>
            </View>
          ) : null}
          {video.publishedAt ? (
            <View style={styles.videoMetaItem}>
              <Text style={styles.videoMetaIcon}>◔</Text>
              <Text style={styles.videoMetaText}>
                {new Date(video.publishedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSeriesCard = ({ item }: { item: VideoSeries }) => {
    const videoCount = item.videoCount || item.videos?.length || 0;
    const isExpanded = expandedId === item._id;

    return (
      <Card style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleExpand(item._id)}
        >
          {/* Full-width cover banner */}
          <View style={styles.coverWrap}>
            {item.coverImage ? (
              <Image
                source={{ uri: item.coverImage }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Icon name="movie-open-outline" size={44} color={colors.gold.light} />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(74,0,16,0.9)']}
              style={styles.coverScrim}
            />
            <View style={styles.playBadge}>
              <Icon name="play" size={24} color={colors.text.white} style={{ marginLeft: 2 }} />
            </View>
            <View style={styles.coverCountPill}>
              <Icon name="video" size={13} color={colors.gold.light} />
              <Text style={styles.coverCountText}>
                {videoCount} {videoCount === 1 ? 'video' : 'videos'}
              </Text>
            </View>
          </View>

          {/* Content below the cover */}
          <View style={styles.contentSection}>
            <View style={styles.titleRow}>
              <Text style={styles.seriesTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <IconButton
                icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                iconColor={colors.primary.maroon}
                style={styles.chevron}
              />
            </View>
            {item.description ? (
              <Text style={styles.seriesDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            {item.category ? (
              <View style={styles.chipRow}>
                <Badge label={item.category} tone={colors.primary.saffron} variant="soft" />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <View style={styles.cardFooterBadge}>
            <Badge
              label="Live on app & website"
              tone={colors.status.success}
              variant="soft"
              dot
            />
          </View>
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
        </View>

        {isExpanded && item.videos && item.videos.length > 0 ? (
          <View style={styles.videosContainer}>
            <View style={styles.videosDivider} />
            {item.videos.map(renderVideoItem)}
          </View>
        ) : null}

        {isExpanded && (!item.videos || item.videos.length === 0) ? (
          <View style={styles.noVideos}>
            <Text style={styles.noVideosText}>No videos in this series</Text>
          </View>
        ) : null}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIconWell}>
        <Text style={styles.emptyStateIcon}>🎥</Text>
      </View>
      <Text style={styles.emptyStateText}>No video series</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap + to create your first series
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.heroWrap}>
      <AdminHero
        eyebrow="Manage"
        title="Video Series"
        subtitle="Publish once — every series appears instantly on the user app and the website."
        badge={`${series.length} live`}
        actions={[{ label: 'New Series', icon: 'plus', onPress: openCreateModal }]}
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
            {editingSeries ? 'Edit Series' : 'Add Series'}
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
          <View style={styles.publishBanner}>
            <Icon name="broadcast" size={18} color={colors.status.success} />
            <Text style={styles.publishBannerText}>
              Saved series publish instantly to the user app and the website.
            </Text>
          </View>

          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {form.coverImageUri ? (
              <Image
                source={{ uri: form.coverImageUri }}
                style={styles.imagePickerPreview}
              />
            ) : editingSeries?.coverImage ? (
              <Image
                source={{ uri: editingSeries.coverImage }}
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
            activeOutlineColor={colors.primary.saffron}
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
            activeOutlineColor={colors.primary.saffron}
          />
          <TextInput
            label="Category"
            value={form.category}
            onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border.gold}
            activeOutlineColor={colors.primary.saffron}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          >
            <LinearGradient
              colors={gradients.maroon as readonly [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.text.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingSeries ? 'Update Series' : 'Create Series'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Button
            mode="outlined"
            onPress={() => setModalVisible(false)}
            disabled={submitting}
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
        <Text style={styles.loadingText}>Loading video series...</Text>
      </View>
    );
  }

  if (error && series.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVideoSeries}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={series}
        keyExtractor={(item) => item._id}
        renderItem={renderSeriesCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={series.length > 0 ? renderHeader : null}
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
    borderRadius: borderRadius.md,
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
  heroWrap: {
    marginBottom: spacing.lg,
  },
  publishBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.25)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  publishBannerText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.status.success,
    fontWeight: '600',
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
  coverWrap: {
    width: '100%',
    height: 184,
    position: 'relative',
    backgroundColor: colors.background.sandstone,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary.maroon,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 52,
    height: 52,
    marginTop: -26,
    marginLeft: -26,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(128, 0, 32, 0.86)',
    borderWidth: 2,
    borderColor: 'rgba(255, 213, 79, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverCountPill: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(74, 0, 16, 0.82)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 79, 0.4)',
  },
  coverCountText: {
    color: colors.gold.light,
    fontSize: 11,
    fontWeight: '700',
  },
  contentSection: {
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  seriesTitle: {
    ...typography.title,
    flex: 1,
    color: colors.primary.maroon,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  chevron: {
    margin: 0,
    marginTop: -4,
    marginRight: -8,
  },
  seriesDescription: {
    ...typography.bodySm,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
  },
  cardFooterBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xs,
  },
  videosContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  videosDivider: {
    height: 1,
    backgroundColor: colors.border.gold,
    marginBottom: spacing.md,
  },
  videoItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  videoThumbContainer: {
    width: 104,
    height: 62,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.sandstone,
  },
  videoThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary.maroon,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbIcon: {
    color: colors.text.white,
    fontSize: 18,
  },
  videoPlayBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 26,
    height: 26,
    marginTop: -13,
    marginLeft: -13,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(128, 0, 32, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 79, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayBadgeIcon: {
    color: colors.text.white,
    fontSize: 10,
    marginLeft: 1,
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(74, 0, 16, 0.85)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  videoDurationText: {
    color: colors.gold.light,
    fontSize: 9,
    fontWeight: '600',
  },
  videoDetails: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 18,
  },
  videoDescription: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  videoMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  videoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  videoMetaIcon: {
    fontSize: 9,
    color: colors.primary.saffron,
  },
  videoMetaText: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  noVideos: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  noVideosText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyStateIconWell: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(163, 18, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(163, 18, 58, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 44,
  },
  emptyStateText: {
    color: colors.primary.maroon,
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '600',
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
  },
  submitButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.maroonGlow,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelButton: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderColor: colors.border.maroon,
  },
});
