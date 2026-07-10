import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { Podcast } from '../../types';

interface RouteParams {
  podcastId: string;
}

export function PodcastDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { podcastId } = route.params as RouteParams;

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [relatedEpisodes, setRelatedEpisodes] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    fetchPodcastDetails();
  }, [podcastId]);

  const fetchPodcastDetails = async () => {
    try {
      const [podcastRes, episodesRes] = await Promise.all([
        api.get(`/podcasts/${podcastId}`),
        api.get('/podcasts').catch(() => ({ data: [] })),
      ]);
      setPodcast(podcastRes.data);
      // Filter out current podcast and get related episodes
      const episodes = (episodesRes.data || []).filter(
        (ep: Podcast) => ep._id !== podcastId
      );
      setRelatedEpisodes(episodes.slice(0, 5));
    } catch (error) {
      console.error('Error fetching podcast details:', error);
      Alert.alert(t('common.error'), t('details.podcast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        setPlaying(true);
        await Linking.openURL(url);
        setTimeout(() => setPlaying(false), 1000);
      } else {
        Alert.alert(t('details.podcast.unableToPlayTitle'), t('details.podcast.unableToPlayMessage'));
      }
    } catch (error) {
      console.error('Error playing:', error);
      Alert.alert(t('common.error'), t('details.podcast.openFailed'));
      setPlaying(false);
    }
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderEpisodeItem = ({ item }: { item: Podcast }) => (
    <TouchableOpacity
      style={styles.episodeCard}
      onPress={() => handlePlay(item.videoUrl)}
    >
      <View style={styles.episodeIcon}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={{ width: 48, height: 48, borderRadius: 8 }} />
        ) : (
          <Icon name="podcast" size={24} color={colors.gold.main} />
        )}
      </View>
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.duration && (
          <Text style={styles.episodeNumber}>{item.duration}</Text>
        )}
      </View>
      <View style={styles.episodePlayButton}>
        <Icon name="play-circle" size={32} color={colors.primary.saffron} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
        <Text style={styles.loadingText}>{t('details.podcast.loading')}</Text>
      </View>
    );
  }

  if (!podcast) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="podcast" size={64} color={colors.text.secondary} />
        <Text style={styles.errorText}>{t('details.podcast.notFound')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
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
        <Text style={styles.headerTitle}>{t('details.podcast.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Podcast Cover */}
        <View style={styles.coverSection}>
          <View style={styles.coverContainer}>
            {podcast.coverImage ? (
              <Image source={{ uri: podcast.coverImage }} style={styles.coverImage} />
            ) : (
              <LinearGradient
                colors={[colors.primary.saffron, colors.primary.maroon]}
                style={styles.coverPlaceholder}
              >
                <Icon name="podcast" size={80} color={colors.gold.light} />
              </LinearGradient>
            )}
            {/* Sound wave decoration */}
            <View style={styles.soundWaveDecoration}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.soundWaveBar,
                    { height: 12 + (i % 3) * 8 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Podcast Info */}
        <View style={styles.infoSection}>
          <Text style={styles.podcastTitle}>{podcast.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            {podcast.duration && (
              <View style={styles.metaBadge}>
                <Icon name="clock-outline" size={14} color={colors.gold.dark} />
                <Text style={styles.metaText}>{podcast.duration}</Text>
              </View>
            )}
            {podcast.category && (
              <View style={styles.metaBadge}>
                <Icon name="tag" size={14} color={colors.gold.dark} />
                <Text style={styles.metaText}>{podcast.category}</Text>
              </View>
            )}
            {podcast.date && (
              <View style={styles.metaBadge}>
                <Icon name="calendar" size={14} color={colors.gold.dark} />
                <Text style={styles.metaText}>{formatDate(podcast.date)}</Text>
              </View>
            )}
          </View>

          {/* Play Button */}
          <TouchableOpacity
            style={styles.playButtonLarge}
            onPress={() => handlePlay(podcast.videoUrl)}
            disabled={playing}
          >
            <LinearGradient
              colors={[colors.primary.saffron, colors.primary.vermillion]}
              style={styles.playButtonGradient}
            >
              {playing ? (
                <ActivityIndicator color={colors.text.white} />
              ) : (
                <>
                  <Icon name="play" size={32} color={colors.text.white} />
                  <Text style={styles.playButtonText}>{t('details.podcast.listenNow')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Description */}
          {podcast.description && (
            <View style={styles.descriptionSection}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.goldAccent} />
                <Text style={styles.sectionTitle}>{t('details.podcast.aboutThisEpisode')}</Text>
              </View>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{podcast.description}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Related Episodes */}
        {relatedEpisodes.length > 0 && (
          <View style={styles.relatedSection}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.goldAccent} />
              <Text style={styles.sectionTitle}>{t('details.podcast.moreEpisodes')}</Text>
            </View>
            <FlatList
              data={relatedEpisodes}
              keyExtractor={(item) => item._id}
              renderItem={renderEpisodeItem}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Spiritual Quote */}
        <View style={styles.quoteSection}>
          <Icon name="headphones" size={28} color={colors.gold.main} />
          <Text style={styles.quoteText}>{t('details.podcast.quote')}</Text>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  coverSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.sandstone,
  },
  coverContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  coverImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
    borderWidth: 3,
    borderColor: colors.gold.main,
  },
  coverPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.gold.main,
  },
  soundWaveDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.md,
  },
  soundWaveBar: {
    width: 4,
    backgroundColor: colors.gold.main,
    borderRadius: 2,
  },
  infoSection: {
    padding: spacing.lg,
  },
  podcastTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary.maroon,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 34,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.cream,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  metaText: {
    fontSize: 13,
    color: colors.gold.dark,
    fontWeight: '500',
  },
  playButtonLarge: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.warm,
  },
  playButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.white,
  },
  descriptionSection: {
    marginBottom: spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  goldAccent: {
    width: 4,
    height: 20,
    backgroundColor: colors.gold.main,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  descriptionCard: {
    padding: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold.main,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
  },
  relatedSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  episodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  episodeNumber: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  episodePlayButton: {
    padding: spacing.xs,
  },
  quoteSection: {
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background.cream,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  quoteText: {
    fontSize: 14,
    color: colors.text.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
});
