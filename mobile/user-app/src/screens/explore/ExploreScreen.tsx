import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { borderRadius, spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { EmptyStateCard, ScreenHeader, SurfaceCard } from '../../components/common';

const { width } = Dimensions.get('window');
const GALLERY_ITEM_WIDTH = (width - spacing.lg * 2 - spacing.sm) / 2;

type Category = 'Articles' | 'Videos' | 'Books' | 'Podcasts' | 'Gallery';
type LocalizedText = Record<string, string | undefined>;

interface Article {
  _id: string;
  title: string;
  titleTranslations?: LocalizedText;
  description?: string;
  descriptionTranslations?: LocalizedText;
  category?: string;
  categoryTranslations?: LocalizedText;
  publishedDate: string;
  coverImage?: string;
}

interface Video {
  _id: string;
  title: string;
  titleTranslations?: LocalizedText;
  description?: string;
  descriptionTranslations?: LocalizedText;
  thumbnail?: string;
}

interface Book {
  _id: string;
  title: string;
  titleTranslations?: LocalizedText;
  author?: string;
  price?: number;
  coverImage?: string;
  purchaseUrl?: string;
}

interface Podcast {
  _id: string;
  title: string;
  titleTranslations?: LocalizedText;
  description?: string;
  descriptionTranslations?: LocalizedText;
  duration?: string;
  coverImage?: string;
}

interface GalleryItem {
  _id: string;
  image: string;
  title?: string;
  titleTranslations?: LocalizedText;
}

const categories: { key: Category; icon: 'file-document' | 'video' | 'book-open-variant' | 'podcast' | 'image-multiple' }[] = [
  { key: 'Articles', icon: 'file-document' },
  { key: 'Videos', icon: 'video' },
  { key: 'Books', icon: 'book-open-variant' },
  { key: 'Podcasts', icon: 'podcast' },
  { key: 'Gallery', icon: 'image-multiple' },
];

const apiEndpoints: Record<Category, string> = {
  Articles: '/articles',
  Videos: '/videoseries',
  Books: '/allbooks',
  Podcasts: '/podcasts',
  Gallery: '/glimpse',
};

export function ExploreScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const initialCategory = route.params?.category || 'Articles';

  const [selectedCategory, setSelectedCategory] = useState<Category>(initialCategory);
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dateLocale = useCallback(() => {
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

  const categoryLabels: Record<Category, string> = {
    Articles: t('explore.articles'),
    Videos: t('explore.videos'),
    Books: t('explore.books'),
    Podcasts: t('explore.podcasts'),
    Gallery: t('explore.gallery'),
  };

  const resolveLocalizedText = useCallback(
    (localized?: LocalizedText, fallback?: string) => {
      const language = i18n.language?.split('-')[0] || 'en';
      return localized?.[language] || localized?.en || localized?.hi || fallback || '';
    },
    [i18n.language]
  );

  // Sync the category ONLY when the navigation param changes (e.g. arriving from
  // a Home quick-link). It must NOT depend on selectedCategory, otherwise tapping
  // a different category tab would be immediately reverted to the route's value.
  useEffect(() => {
    const routeCategory = route.params?.category;
    if (routeCategory && categories.some((category) => category.key === routeCategory)) {
      setSelectedCategory(routeCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.category]);

  const fetchData = useCallback(async () => {
    try {
      const endpoint = apiEndpoints[selectedCategory];
      const response = await api.get(`${endpoint}?lang=${encodeURIComponent(i18n.language || 'en')}`);
      const items = response.data || [];
      setData(items);
      setFilteredData(items);
    } catch (error) {
      console.error(`Error fetching ${selectedCategory}:`, error);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language, selectedCategory]);

  useEffect(() => {
    setLoading(true);
    setSearchQuery('');
    fetchData();
  }, [selectedCategory, fetchData]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(data);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = data.filter((item) => {
        const title = resolveLocalizedText(item.titleTranslations, item.title || item.eventName || '');
        const description = resolveLocalizedText(item.descriptionTranslations, item.description || item.excerpt || '');
        const author = item.author || '';
        return (
          title.toLowerCase().includes(query) ||
          description.toLowerCase().includes(query) ||
          author.toLowerCase().includes(query)
        );
      });
      setFilteredData(filtered);
    }
  }, [searchQuery, data, resolveLocalizedText]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(dateLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderArticleItem = ({ item }: { item: Article }) => (
    <TouchableOpacity style={styles.listItemWrap} onPress={() => navigation.navigate('ArticleDetail', { articleId: item._id })}>
      <SurfaceCard compact style={styles.listItem}>
        <View style={styles.itemImageContainer}>
          {item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.itemImage} />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Icon name="file-document" size={24} color={colors.gold.main} />
            </View>
          )}
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {resolveLocalizedText(item.titleTranslations, item.title)}
          </Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {resolveLocalizedText(item.descriptionTranslations, item.description || '')}
          </Text>
          <View style={styles.itemMeta}>
            {(item.category || item.categoryTranslations) ? (
              <Text style={styles.itemMetaText}>
                {resolveLocalizedText(item.categoryTranslations, item.category)}
              </Text>
            ) : null}
            <Text style={styles.itemDate}>{formatDate(item.publishedDate)}</Text>
          </View>
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );

  const renderVideoItem = ({ item }: { item: Video }) => (
    <TouchableOpacity style={styles.listItemWrap} onPress={() => navigation.navigate('VideoSeries', { seriesId: item._id })}>
      <SurfaceCard compact style={styles.listItem}>
        <View style={styles.itemImageContainer}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.itemImage} />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Icon name="video" size={24} color={colors.gold.main} />
            </View>
          )}
          <View style={styles.playButton}>
            <Icon name="play" size={16} color={colors.text.white} />
          </View>
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {resolveLocalizedText(item.titleTranslations, item.title)}
          </Text>
          <Text style={styles.itemDescription} numberOfLines={3}>
            {resolveLocalizedText(item.descriptionTranslations, item.description) || t('explore.videoSeriesFallback')}
          </Text>
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );

  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity style={styles.listItemWrap} onPress={() => navigation.navigate('BookDetail', { bookId: item._id })}>
      <SurfaceCard compact style={styles.listItem}>
        <View style={styles.bookImageContainer}>
          {item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.bookImage} />
          ) : (
            <View style={styles.bookImagePlaceholder}>
              <Icon name="book-open-variant" size={32} color={colors.gold.main} />
            </View>
          )}
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {resolveLocalizedText(item.titleTranslations, item.title)}
          </Text>
          {item.author ? <Text style={styles.itemDescription}>{t('explore.byAuthor', { author: item.author })}</Text> : null}
          {item.price !== undefined ? <Text style={styles.bookPrice}>₹{item.price.toLocaleString('en-IN')}</Text> : null}
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );

  const renderPodcastItem = ({ item }: { item: Podcast }) => (
    <TouchableOpacity style={styles.listItemWrap} onPress={() => navigation.navigate('PodcastDetail', { podcastId: item._id })}>
      <SurfaceCard compact style={styles.listItem}>
        <View style={styles.podcastIcon}>
          {item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.podcastImage} />
          ) : (
            <Icon name="podcast" size={28} color={colors.primary.saffron} />
          )}
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {resolveLocalizedText(item.titleTranslations, item.title)}
          </Text>
          {item.description ? (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {resolveLocalizedText(item.descriptionTranslations, item.description)}
            </Text>
          ) : null}
          {item.duration ? (
            <View style={styles.durationBadge}>
              <Icon name="clock-outline" size={12} color={colors.text.secondary} />
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          ) : null}
        </View>
        <Icon name="play-circle" size={32} color={colors.primary.saffron} />
      </SurfaceCard>
    </TouchableOpacity>
  );

  const renderGalleryItem = ({ item }: { item: GalleryItem }) => (
    <TouchableOpacity style={styles.galleryItem} onPress={() => navigation.navigate('GalleryFull')}>
      <SurfaceCard compact style={styles.galleryCard}>
        <Image source={{ uri: item.image }} style={styles.galleryImage} />
        {(item.title || item.titleTranslations) ? (
          <Text style={styles.galleryTitle} numberOfLines={1}>
            {resolveLocalizedText(item.titleTranslations, item.title)}
          </Text>
        ) : null}
      </SurfaceCard>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => {
    switch (selectedCategory) {
      case 'Articles':
        return renderArticleItem({ item });
      case 'Videos':
        return renderVideoItem({ item });
      case 'Books':
        return renderBookItem({ item });
      case 'Podcasts':
        return renderPodcastItem({ item });
      case 'Gallery':
        return renderGalleryItem({ item });
      default:
        return null;
    }
  };

  const listHeader = (
    <View>
      <ScreenHeader
        compact
        eyebrow={t('explore.title')}
        title={categoryLabels[selectedCategory]}
        subtitle={t('onboarding.slides.wisdomDescription')}
        icon={categories.find((item) => item.key === selectedCategory)?.icon || 'compass-outline'}
      />

      <View style={styles.controlsWrap}>
        <SurfaceCard compact style={styles.categoryPanel}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryTab, selectedCategory === item.key && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(item.key)}
                activeOpacity={0.85}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  color={selectedCategory === item.key ? colors.text.white : colors.primary.maroon}
                />
                <Text style={[styles.categoryText, selectedCategory === item.key && styles.categoryTextActive]}>
                  {categoryLabels[item.key]}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SurfaceCard>

        <SurfaceCard compact style={styles.searchPanel}>
          <View style={styles.searchBar}>
            <Icon name="magnify" size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('explore.searchPlaceholder', {
                category: categoryLabels[selectedCategory].toLowerCase(),
              })}
              placeholderTextColor={colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </SurfaceCard>

        {selectedCategory === 'Books' ? (
          <SurfaceCard compact style={styles.disclaimerPanel}>
            <View style={styles.disclaimerRow}>
              <Icon name="information-outline" size={18} color={colors.primary.maroon} />
              <Text style={styles.disclaimerText}>{t('details.book.externalSellerNoticeShort')}</Text>
            </View>
          </SurfaceCard>
        ) : null}
      </View>
    </View>
  );

  return (
    <FlatList
      data={loading ? [] : filteredData}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      numColumns={selectedCategory === 'Gallery' ? 2 : 1}
      key={selectedCategory === 'Gallery' ? 'gallery' : 'list'}
      style={styles.container}
      contentContainerStyle={[
        styles.listContainer,
        selectedCategory === 'Gallery' && styles.galleryContainer,
      ]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeader}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary.saffron]}
          tintColor={colors.primary.saffron}
        />
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.listLoading}>
            <ActivityIndicator size="large" color={colors.primary.saffron} />
          </View>
        ) : (
          <EmptyStateCard
            icon={categories.find((c) => c.key === selectedCategory)?.icon || 'alert'}
            title={t('explore.noItemsTitle', { category: categoryLabels[selectedCategory] })}
            subtitle={searchQuery ? t('explore.searchTryDifferent') : t('explore.checkBackLater')}
          />
        )
      }
    />
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  controlsWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  categoryPanel: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryList: {
    paddingRight: spacing.xs,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 1,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.sandstone,
  },
  categoryTabActive: {
    backgroundColor: colors.primary.maroon,
    shadowColor: colors.primary.maroon,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryText: {
    fontSize: 14,
    color: colors.primary.maroon,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: colors.text.white,
  },
  searchPanel: {
    marginBottom: spacing.md,
  },
  disclaimerPanel: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  disclaimerText: {
    flex: 1,
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.parchment,
  },
  listLoading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: spacing.xxl,
  },
  galleryContainer: {
    paddingHorizontal: spacing.lg,
  },
  listItemWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImageContainer: {
    width: 82,
    height: 82,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.sandstone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary.saffron,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    ...typography.title,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  itemDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  itemMetaText: {
    ...typography.caption,
    color: colors.gold.dark,
    flex: 1,
  },
  itemDate: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  bookImageContainer: {
    width: 72,
    height: 104,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  bookImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bookImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.sandstone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookPrice: {
    ...typography.title,
    color: colors.primary.maroon,
    marginTop: spacing.sm,
  },
  podcastIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.background.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  podcastImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  durationText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  galleryItem: {
    width: GALLERY_ITEM_WIDTH,
    marginBottom: spacing.md,
    marginRight: spacing.sm,
  },
  galleryCard: {
    padding: spacing.sm,
  },
  galleryImage: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.md,
  },
  galleryTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
});
