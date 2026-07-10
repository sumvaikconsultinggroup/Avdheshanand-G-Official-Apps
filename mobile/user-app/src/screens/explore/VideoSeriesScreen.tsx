import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { VideoSeries, Video } from '../../types';

const { width } = Dimensions.get('window');

interface RouteParams {
  seriesId: string;
}

export function VideoSeriesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute();
  const navigation = useNavigation();
  const { seriesId } = route.params as RouteParams;

  const [series, setSeries] = useState<VideoSeries | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeriesAndVideos();
  }, [seriesId]);

  const fetchSeriesAndVideos = async () => {
    try {
      const [seriesRes, videosRes] = await Promise.all([
        api.get(`/videoseries/${seriesId}`),
        api.get(`/videos/${seriesId}`),
      ]);
      setSeries(seriesRes.data);
      setVideos(videosRes.data || []);
    } catch (error) {
      console.error('Error fetching video series:', error);
      Alert.alert('Error', 'Failed to load video series');
    } finally {
      setLoading(false);
    }
  };

  const openVideo = useCallback(async (video: Video) => {
    const videoUrl = video.youtubeUrl;
    if (!videoUrl) {
      Alert.alert('Unable to Open', 'Video URL is unavailable');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(videoUrl);
      if (canOpen) {
        await Linking.openURL(videoUrl);
      } else {
        Alert.alert('Unable to Open', 'Cannot open this video URL');
      }
    } catch (error) {
      console.error('Error opening video:', error);
      Alert.alert('Error', 'Failed to open video');
    }
  }, []);

  const renderVideoItem = ({ item, index }: { item: Video; index: number }) => (
    <TouchableOpacity style={styles.videoCard} onPress={() => openVideo(item)}>
      <View style={styles.videoThumbnailContainer}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} />
        ) : (
          <View style={styles.videoThumbnailPlaceholder}>
            <Icon name="video" size={32} color={colors.gold.main} />
          </View>
        )}
        {/* Play Button Overlay */}
        <View style={styles.playButtonOverlay}>
          <LinearGradient
            colors={[colors.primary.saffron, colors.primary.vermillion]}
            style={styles.playButton}
          >
            <Icon name="play" size={24} color={colors.text.white} />
          </LinearGradient>
        </View>
        {/* Episode Number */}
        <View style={styles.episodeNumber}>
          <Text style={styles.episodeText}>{index + 1}</Text>
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.videoDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.duration && (
          <View style={styles.durationBadge}>
            <Icon name="clock-outline" size={14} color={colors.gold.dark} />
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  if (!series) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="video-off" size={64} color={colors.text.secondary} />
        <Text style={styles.errorText}>Video series not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.primary.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Video Series
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item) => item._id}
        renderItem={renderVideoItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.seriesHeader}>
            {/* Series Thumbnail */}
            <View style={styles.seriesThumbnailContainer}>
              {series.thumbnail ? (
                <Image
                  source={{ uri: series.thumbnail }}
                  style={styles.seriesThumbnail}
                />
              ) : (
                <LinearGradient
                  colors={[colors.primary.saffron, colors.primary.maroon]}
                  style={styles.seriesThumbnailPlaceholder}
                >
                  <Icon name="video-box" size={48} color={colors.gold.light} />
                </LinearGradient>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.8)']}
                style={styles.seriesOverlay}
              >
                <Text style={styles.seriesTitle}>{series.title}</Text>
                <Text style={styles.videoCount}>{videos.length} Videos</Text>
              </LinearGradient>
            </View>

            {/* Series Description */}
            {series.description && (
              <View style={styles.seriesDescriptionCard}>
                <Icon name="information-outline" size={20} color={colors.gold.main} />
                <Text style={styles.seriesDescription}>{series.description}</Text>
              </View>
            )}

            {/* Videos Header */}
            <View style={styles.videosHeader}>
              <View style={styles.goldAccent} />
              <Text style={styles.videosHeaderText}>Episodes</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Icon name="video-off-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>No videos available</Text>
          </View>
        )}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold as string,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.sandstone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  seriesHeader: {
    marginBottom: spacing.md,
  },
  seriesThumbnailContainer: {
    height: 200,
    position: 'relative',
  },
  seriesThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  seriesThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  seriesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.white,
    marginBottom: spacing.xs,
  },
  videoCount: {
    fontSize: 14,
    color: colors.gold.light,
    fontWeight: '500',
  },
  seriesDescriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    gap: spacing.sm,
  },
  seriesDescription: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 22,
  },
  videosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  goldAccent: {
    width: 4,
    height: 20,
    backgroundColor: colors.gold.main,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  videosHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  videoCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.warm,
  },
  videoThumbnailContainer: {
    width: 140,
    height: 100,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.sandstone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  episodeNumber: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.white,
  },
  videoInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  videoDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  durationText: {
    fontSize: 12,
    color: colors.gold.dark,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginHorizontal: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
  },
});
