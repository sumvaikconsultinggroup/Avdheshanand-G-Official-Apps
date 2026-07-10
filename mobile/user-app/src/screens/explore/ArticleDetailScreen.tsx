import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Share,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { Article } from '../../types';

const { width } = Dimensions.get('window');

interface RouteParams {
  articleId: string;
}

export function ArticleDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { articleId } = route.params as RouteParams;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticleDetails();
  }, [articleId]);

  const fetchArticleDetails = async () => {
    try {
      const response = await api.get(`/articles/${articleId}`);
      setArticle(response.data);
    } catch (error) {
      console.error('Error fetching article details:', error);
      Alert.alert(t('common.error'), t('details.article.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!article) return;

    try {
      await Share.share({
        message: `${article.title}\n\n${t('details.article.shareMessage')}`,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
        <Text style={styles.loadingText}>{t('details.article.loading')}</Text>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="file-document-alert" size={64} color={colors.text.secondary} />
        <Text style={styles.errorText}>{t('details.article.notFound')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.headerContainer}>
          {article.coverImage ? (
            <Image source={{ uri: article.coverImage }} style={styles.headerImage} />
          ) : (
            <LinearGradient
              colors={[colors.gold.light, colors.gold.dark]}
              style={styles.headerPlaceholder}
            >
              <Icon name="file-document" size={64} color={colors.primary.maroon} />
            </LinearGradient>
          )}
          {/* Overlay gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
            style={styles.headerOverlay}
          />
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButtonOverlay}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={colors.text.white} />
          </TouchableOpacity>
          {/* Share Button */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Icon name="share-variant" size={22} color={colors.text.white} />
          </TouchableOpacity>
        </View>

        {/* Parchment Content Area */}
        <View style={styles.parchmentContainer}>
          {/* Decorative Top Border */}
          <View style={styles.decorativeBorder}>
            <View style={styles.borderLine} />
            <Icon name="om" size={24} color={colors.gold.main} />
            <View style={styles.borderLine} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            {article.category && (
              <View style={styles.metaItem}>
                <Icon name="tag" size={16} color={colors.gold.dark} />
                <Text style={styles.metaText}>{article.category}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Icon name="calendar" size={16} color={colors.gold.dark} />
              <Text style={styles.metaText}>{formatDate(article.publishedDate)}</Text>
            </View>
            {article.readTime && (
              <View style={styles.metaItem}>
                <Icon name="clock-outline" size={16} color={colors.gold.dark} />
                <Text style={styles.metaText}>{t('details.article.minRead', { count: article.readTime })}</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Icon name="flower-tulip" size={20} color={colors.gold.main} />
            <View style={styles.dividerLine} />
          </View>

          {/* Article Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.content}>{article.description}</Text>
          </View>

          {/* Footer Decoration */}
          <View style={styles.footerDecoration}>
            <Text style={styles.omText}>ॐ</Text>
            <Text style={styles.footerText}>{t('details.article.footerBlessing')}</Text>
          </View>
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
  headerContainer: {
    position: 'relative',
    height: 260,
  },
  headerImage: {
    width: width,
    height: 260,
    resizeMode: 'cover',
  },
  headerPlaceholder: {
    width: width,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backButtonOverlay: {
    position: 'absolute',
    top: spacing.xxl,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parchmentContainer: {
    marginTop: -40,
    backgroundColor: colors.background.sandstone,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    minHeight: 400,
    // Parchment texture effect
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.warm,
  },
  decorativeBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  borderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gold.main,
    marginHorizontal: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary.maroon,
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: spacing.md,
    // Display font style
    letterSpacing: 0.5,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 13,
    color: colors.gold.dark,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    width: 60,
    height: 1,
    backgroundColor: colors.gold.main,
    marginHorizontal: spacing.sm,
  },
  contentContainer: {
    backgroundColor: colors.background.parchment,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  content: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 28,
    textAlign: 'justify',
  },
  footerDecoration: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
  },
  omText: {
    fontSize: 36,
    color: colors.gold.main,
  },
  footerText: {
    fontSize: 14,
    color: colors.gold.dark,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
