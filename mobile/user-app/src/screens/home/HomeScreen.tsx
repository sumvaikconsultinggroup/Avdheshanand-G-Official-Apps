import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAppShell } from '../../context/AppShellContext';
import { spacing, borderRadius, shadows, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import DailyVicharCard from './DailyVicharCard';
import PanchangCard from './PanchangCard';
import LanguageDrawer from '../../components/LanguageDrawer';
import { EmptyStateCard, ScreenHeader, SectionHeader, SurfaceCard } from '../../components/common';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.74;

interface Event {
  _id: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  eventImage?: string;
}

interface Article {
  _id: string;
  title: string;
  description?: string;
  publishedDate: string;
  coverImage?: string;
  category?: string;
}

interface Campaign {
  _id: string;
  title: string;
  description?: string;
  goal: number;
  achieved: number;
  backgroundImage?: string;
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useAppShell();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredCampaign, setFeaturedCampaign] = useState<Campaign | null>(null);
  const [languageDrawerVisible, setLanguageDrawerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, articlesRes, campaignsRes] = await Promise.all([
        api.get('/events').catch(() => ({ data: [] })),
        api.get('/articles').catch(() => ({ data: [] })),
        api.get('/donate').catch(() => ({ data: [] })),
      ]);

      setEvents((eventsRes.data || []).slice(0, 5));
      setArticles((articlesRes.data || []).slice(0, 5));

      const campaigns = campaignsRes.data || [];
      setFeaturedCampaign(campaigns.length > 0 ? campaigns[0] : null);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const quickLinks = [
    { icon: 'calendar-star' as const, labelKey: 'home.quickLinksItems.panchang', screen: 'Panchang' },
    { icon: 'calendar' as const, labelKey: 'home.quickLinksItems.schedule', tab: 'Schedule' },
    { icon: 'book-open-variant' as const, labelKey: 'home.quickLinksItems.books', category: 'Books' },
    { icon: 'video' as const, labelKey: 'home.quickLinksItems.videos', category: 'Videos' },
    { icon: 'podcast' as const, labelKey: 'home.quickLinksItems.podcasts', category: 'Podcasts' },
    { icon: 'image-multiple' as const, labelKey: 'home.quickLinksItems.gallery', screen: 'GalleryFull' },
    { icon: 'hand-heart' as const, labelKey: 'home.quickLinksItems.volunteer', screen: 'VolunteerForm' },
  ];

  const pathwayLinks = [
    {
      icon: 'account-star-outline' as const,
      title: t('home.pathways.aboutTitle'),
      subtitle: t('home.pathways.aboutSubtitle'),
      onPress: () => navigation.navigate('AboutSwami'),
    },
    {
      icon: 'book-heart-outline' as const,
      title: t('home.pathways.missionTitle'),
      subtitle: t('home.pathways.missionSubtitle'),
      onPress: () => navigation.navigate('Mission'),
    },
    {
      icon: 'om' as const,
      title: t('home.pathways.dikshaTitle'),
      subtitle: t('home.pathways.dikshaSubtitle'),
      onPress: () => navigation.navigate('MantraDiksha'),
    },
    {
      icon: 'email-heart-outline' as const,
      title: t('home.pathways.writeTitle'),
      subtitle: t('home.pathways.writeSubtitle'),
      onPress: () =>
        navigation.navigate('ContactForm', {
          prefillSubject: 'Message for Swami Ji',
          titleOverride: t('appDrawer.items.writeToSwami'),
          introTitleOverride: t('contact.writeToSwamiTitle'),
          introTextOverride: t('contact.writeToSwamiSubtitle'),
          messagePlaceholder: t('contact.placeholders.writeToSwami'),
        }),
    },
  ];

  const teachings = [
    {
      icon: 'meditation' as const,
      title: t('home.teachings.oneTitle'),
      body: t('home.teachings.oneBody'),
    },
    {
      icon: 'book-open-page-variant-outline' as const,
      title: t('home.teachings.twoTitle'),
      body: t('home.teachings.twoBody'),
    },
    {
      icon: 'hand-heart-outline' as const,
      title: t('home.teachings.threeTitle'),
      body: t('home.teachings.threeBody'),
    },
  ];

  const initiatives = [
    t('home.initiatives.one'),
    t('home.initiatives.two'),
    t('home.initiatives.three'),
  ];

  const navigateToQuickLink = (item: (typeof quickLinks)[0]) => {
    if (item.tab) {
      navigation.navigate(item.tab);
    } else if (item.category) {
      navigation.navigate('Explore', { category: item.category });
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary.saffron]}
          tintColor={colors.primary.saffron}
        />
      }
    >
      <View style={[styles.utilityRow, { paddingTop: Math.max(insets.top + spacing.sm, spacing.lg) }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={openDrawer}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('appDrawer.openMenu')}
        >
          <Icon name="menu" size={20} color={colors.primary.maroon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguageDrawerVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('profile.language')}
        >
          <Icon name="translate" size={18} color={colors.primary.maroon} />
          <Text style={styles.languageButtonText}>{t('profile.language')}</Text>
        </TouchableOpacity>
      </View>

      <ScreenHeader
        eyebrow={t('home.dailyVicharLabel')}
        title={t('home.welcome')}
        subtitle={t('home.heroQuote')}
        icon="brightness-5"
      />

      <View style={styles.section}>
        <SectionHeader
          title={t('home.pathways.title')}
          subtitle={t('home.pathways.subtitle')}
          icon="star-four-points"
        />
        <View style={styles.pathwaysGrid}>
          {pathwayLinks.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.pathwayItem}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <SurfaceCard compact style={styles.pathwayCard}>
                <View style={styles.pathwayIconWrap}>
                  <Icon name={item.icon} size={22} color={colors.primary.saffron} />
                </View>
                <Text style={styles.pathwayTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.pathwaySubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </SurfaceCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <DailyVicharCard />
      <PanchangCard onPress={() => navigation.navigate('Panchang')} />

      <View style={styles.section}>
        <SectionHeader
          title={t('home.upcomingEvents')}
          subtitle={t('schedule.emptyEventsSubtitle')}
          actionLabel={t('home.seeAll')}
          onActionPress={() => navigation.navigate('Schedule')}
          icon="calendar-star"
        />
        {events.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {events.map((event) => (
              <TouchableOpacity
                key={event._id}
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetail', { eventId: event._id })}
                accessibilityRole="button"
                accessibilityLabel={`${event.eventName}, ${formatDate(event.eventDate)}`}
              >
                <SurfaceCard compact style={styles.eventCardSurface}>
                  <View style={styles.eventImagePlaceholder}>
                    {event.eventImage ? (
                      <Image source={{ uri: event.eventImage }} style={styles.eventImage} />
                    ) : (
                      <Icon name="calendar-star" size={32} color={colors.gold.main} />
                    )}
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventName} numberOfLines={2}>
                      {event.eventName}
                    </Text>
                    <View style={styles.metaRow}>
                      <Icon name="calendar" size={14} color={colors.text.secondary} />
                      <Text style={styles.metaText}>{formatDate(event.eventDate)}</Text>
                    </View>
                    {event.eventLocation ? (
                      <View style={styles.metaRow}>
                        <Icon name="map-marker" size={14} color={colors.text.secondary} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {event.eventLocation}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </SurfaceCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <EmptyStateCard
            icon="calendar-blank"
            title={t('home.noUpcomingEvents')}
            subtitle={t('schedule.emptyEventsSubtitle')}
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('home.latestArticles')}
          subtitle={t('explore.checkBackLater')}
          actionLabel={t('home.seeAll')}
          onActionPress={() => navigation.navigate('Explore', { category: 'Articles' })}
          icon="file-document-outline"
        />
        {articles.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {articles.map((article) => (
              <TouchableOpacity
                key={article._id}
                style={styles.articleCard}
                onPress={() => navigation.navigate('ArticleDetail', { articleId: article._id })}
                accessibilityRole="button"
                accessibilityLabel={article.title}
              >
                <SurfaceCard compact style={styles.articleCardSurface}>
                  <View style={styles.articleImagePlaceholder}>
                    {article.coverImage ? (
                      <Image source={{ uri: article.coverImage }} style={styles.articleImage} />
                    ) : (
                      <Icon name="file-document" size={28} color={colors.gold.main} />
                    )}
                  </View>
                  <Text style={styles.articleTitle} numberOfLines={2}>
                    {article.title}
                  </Text>
                  <Text style={styles.articleExcerpt} numberOfLines={2}>
                    {article.description || ''}
                  </Text>
                  <Text style={styles.articleDate}>{formatDate(article.publishedDate)}</Text>
                </SurfaceCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <EmptyStateCard
            icon="file-document-outline"
            title={t('home.noArticlesAvailable')}
            subtitle={t('explore.checkBackLater')}
          />
        )}
      </View>

      {featuredCampaign ? (
        <View style={styles.section}>
          <SectionHeader
            title={t('home.donationSpotlight')}
            subtitle={t('donate.supportMissionSubtitle')}
            icon="hand-heart"
          />
          <TouchableOpacity
            style={styles.donationCard}
            onPress={() => navigation.navigate('Donate')}
            accessibilityRole="button"
            accessibilityLabel={`${t('home.donationSpotlight')}: ${featuredCampaign.title}`}
          >
            <LinearGradient
              colors={[colors.gold.light, colors.gold.main]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.donationCardGradient}
            >
              <View style={styles.donationHeader}>
                <Icon name="hand-heart" size={24} color={colors.primary.maroon} />
                <Text style={styles.donationTitle}>{featuredCampaign.title}</Text>
              </View>
              {featuredCampaign.description ? (
                <Text style={styles.donationDescription} numberOfLines={2}>
                  {featuredCampaign.description}
                </Text>
              ) : null}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min((featuredCampaign.achieved / featuredCampaign.goal) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressText}>
                  <Text style={styles.progressAmount}>
                    ₹{featuredCampaign.achieved.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.progressGoal}>
                    {t('donate.goalValue', {
                      amount: `₹${featuredCampaign.goal.toLocaleString('en-IN')}`,
                    })}
                  </Text>
                </View>
              </View>
              <View style={styles.donateButtonContainer}>
                <Text style={styles.donateButtonText}>{t('donate.donateNow')}</Text>
                <Icon name="arrow-right" size={18} color={colors.text.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title={t('home.teachings.title')}
          subtitle={t('home.teachings.subtitle')}
          icon="lightbulb-on-outline"
        />
        {teachings.map((teaching) => (
          <SurfaceCard key={teaching.title} compact style={styles.teachingCard}>
            <View style={styles.teachingTopRow}>
              <View style={styles.teachingIconWrap}>
                <Icon name={teaching.icon} size={20} color={colors.primary.saffron} />
              </View>
              <Text style={styles.teachingTitle}>{teaching.title}</Text>
            </View>
            <Text style={styles.teachingBody}>{teaching.body}</Text>
          </SurfaceCard>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('home.initiativesTitle')}
          subtitle={t('home.initiativesSubtitle')}
          icon="seed-outline"
        />
        <SurfaceCard>
          {initiatives.map((initiative) => (
            <View key={initiative} style={styles.initiativeRow}>
              <Icon name="chevron-double-right" size={18} color={colors.gold.dark} />
              <Text style={styles.initiativeText}>{initiative}</Text>
            </View>
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('home.quickLinks')}
          subtitle={t('onboarding.welcomeSubtitle')}
          icon="apps"
        />
        <View style={styles.quickLinksGrid}>
          {quickLinks.map((item) => (
            <TouchableOpacity
              key={item.labelKey}
              style={styles.quickLinkItem}
              onPress={() => navigateToQuickLink(item)}
              accessibilityRole="button"
              accessibilityLabel={t(item.labelKey)}
            >
              <SurfaceCard compact style={styles.quickLinkCard}>
                <View style={styles.quickLinkIcon}>
                  <Icon name={item.icon} size={24} color={colors.primary.saffron} />
                </View>
                <Text style={styles.quickLinkLabel}>{t(item.labelKey)}</Text>
              </SurfaceCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: spacing.xxl }} />

      <LanguageDrawer visible={languageDrawerVisible} onClose={() => setLanguageDrawerVisible(false)} />
    </ScrollView>
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
    ...typography.bodySm,
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
  utilityRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF2DC',
    borderWidth: 1,
    borderColor: '#F0D3A2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  languageButtonText: {
    ...typography.bodySm,
    color: colors.primary.maroon,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  pathwaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pathwayItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  pathwayCard: {
    height: 160,
    justifyContent: 'flex-start',
  },
  pathwayIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF2DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pathwayTitle: {
    ...typography.title,
    color: colors.primary.maroon,
  },
  pathwaySubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  horizontalScroll: {
    paddingRight: spacing.lg,
  },
  eventCard: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
  },
  eventCardSurface: {
    height: 248,
    padding: 0,
    overflow: 'hidden',
  },
  eventImagePlaceholder: {
    height: 112,
    backgroundColor: colors.background.sandstone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventContent: {
    flex: 1,
    padding: spacing.md,
  },
  eventName: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  articleCard: {
    width: CARD_WIDTH * 0.78,
    marginRight: spacing.md,
  },
  articleCardSurface: {
    height: 248,
  },
  articleImagePlaceholder: {
    height: 96,
    backgroundColor: colors.background.sandstone,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  articleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: borderRadius.md,
  },
  articleTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  articleExcerpt: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  articleDate: {
    ...typography.caption,
    color: colors.gold.dark,
  },
  donationCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.temple,
  },
  donationCardGradient: {
    padding: spacing.lg,
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  donationTitle: {
    ...typography.h3,
    color: colors.primary.maroon,
    marginLeft: spacing.sm,
    flex: 1,
  },
  donationDescription: {
    ...typography.bodySm,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(128, 0, 32, 0.16)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.maroon,
    borderRadius: 4,
  },
  progressText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressAmount: {
    ...typography.title,
    color: colors.primary.maroon,
  },
  progressGoal: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  donateButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.maroon,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  donateButtonText: {
    ...typography.button,
    color: colors.text.white,
    marginRight: spacing.sm,
  },
  teachingCard: {
    marginBottom: spacing.md,
  },
  teachingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  teachingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF2DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  teachingTitle: {
    ...typography.title,
    color: colors.primary.maroon,
    flex: 1,
  },
  teachingBody: {
    ...typography.body,
    color: colors.text.secondary,
  },
  initiativeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  initiativeText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickLinkItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  quickLinkCard: {
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickLinkLabel: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
