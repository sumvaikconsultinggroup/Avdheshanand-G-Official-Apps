import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { GlimpseImage } from '../../types';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = spacing.sm;
const ITEM_WIDTH = (width - spacing.md * 2 - GAP) / COLUMN_COUNT;

export function GalleryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [images, setImages] = useState<GlimpseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await api.get('/glimpse');
      setImages(response.data || []);
    } catch (error) {
      console.error('Error fetching gallery images:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchImages();
  }, []);

  const openImageViewer = (index: number) => {
    setSelectedIndex(index);
  };

  const closeImageViewer = () => {
    setSelectedIndex(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedIndex === null) return;

    if (direction === 'prev' && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (direction === 'next' && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const renderImageItem = ({
    item,
    index,
  }: {
    item: GlimpseImage;
    index: number;
  }) => {
    // Create masonry effect with varying heights
    const aspectRatios = [1, 1.3, 0.8, 1.2, 1, 0.9];
    const aspectRatio = aspectRatios[index % aspectRatios.length];

    return (
      <TouchableOpacity
        style={[styles.imageCard, { marginRight: index % 2 === 0 ? GAP : 0 }]}
        onPress={() => openImageViewer(index)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.imageWrapper,
            { height: ITEM_WIDTH * aspectRatio },
          ]}
        >
          <Image
            source={{ uri: item.image || item.imageUrl }}
            style={styles.galleryImage}
            resizeMode="cover"
          />
          {/* Gold border overlay */}
          <View style={styles.goldBorderOverlay} />
        </View>
        {item.title && (
          <View style={styles.imageCaption}>
            <Text style={styles.imageCaptionText} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
        <Text style={styles.loadingText}>{t('details.gallery.loading')}</Text>
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
        <Text style={styles.headerTitle}>{t('details.gallery.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Gallery Info */}
      <View style={styles.infoBar}>
        <Icon name="image-multiple" size={18} color={colors.gold.dark} />
        <Text style={styles.infoText}>{t('details.gallery.sacredImagesCount', { count: images.length })}</Text>
      </View>

      {/* Image Grid */}
      <FlatList
        ref={flatListRef}
        data={images}
        keyExtractor={(item) => item._id}
        renderItem={renderImageItem}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Icon name="image-off" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyText}>{t('details.gallery.empty')}</Text>
          </View>
        )}
      />

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={selectedIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <StatusBar hidden />
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeImageViewer}
          >
            <Icon name="close" size={28} color={colors.text.white} />
          </TouchableOpacity>

          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.counterText}>
              {selectedIndex !== null ? selectedIndex + 1 : 0} / {images.length}
            </Text>
          </View>

          {/* Previous Button */}
          {selectedIndex !== null && selectedIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={() => navigateImage('prev')}
            >
              <Icon name="chevron-left" size={40} color={colors.text.white} />
            </TouchableOpacity>
          )}

          {/* Full Screen Image */}
          {selectedIndex !== null && images[selectedIndex] && (
            <View style={styles.fullImageContainer}>
              <Image
                source={{ uri: images[selectedIndex].image || images[selectedIndex].imageUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              {/* Image Info */}
              {(images[selectedIndex].title || images[selectedIndex].description) && (
                <View style={styles.fullImageInfo}>
                  {images[selectedIndex].title && (
                    <Text style={styles.fullImageTitle}>
                      {images[selectedIndex].title}
                    </Text>
                  )}
                  {images[selectedIndex].description && (
                    <Text style={styles.fullImageDescription}>
                      {images[selectedIndex].description}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Next Button */}
          {selectedIndex !== null && selectedIndex < images.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={() => navigateImage('next')}
            >
              <Icon name="chevron-right" size={40} color={colors.text.white} />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
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
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold as string,
  },
  infoText: {
    fontSize: 14,
    color: colors.gold.dark,
    fontWeight: '500',
  },
  gridContainer: {
    padding: spacing.md,
  },
  imageCard: {
    width: ITEM_WIDTH,
    marginBottom: GAP,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.warmWhite,
    ...shadows.warm,
  },
  imageWrapper: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  goldBorderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.gold.main,
    borderRadius: borderRadius.md,
  },
  imageCaption: {
    padding: spacing.sm,
    backgroundColor: colors.background.warmWhite,
  },
  imageCaptionText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageCounter: {
    position: 'absolute',
    top: spacing.xxl,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  counterText: {
    fontSize: 16,
    color: colors.text.white,
    fontWeight: '600',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: 0,
  },
  nextButton: {
    right: 0,
  },
  fullImageContainer: {
    width: width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width - spacing.md * 2,
    height: '100%',
  },
  fullImageInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  fullImageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  fullImageDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
