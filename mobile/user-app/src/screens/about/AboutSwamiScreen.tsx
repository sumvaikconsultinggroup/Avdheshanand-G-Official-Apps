import React, { useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, ScreenHeader, SectionHeader, SurfaceCard } from '../../components/common';
import { borderRadius, spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const SWAMIJI_SOURCE = require('../../../assets/images/swamiji-onboarding.jpg');

export function AboutSwamiScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const milestones = [
    {
      icon: 'star-four-points',
      title: t('aboutSwami.milestones.early.title'),
      description: t('aboutSwami.milestones.early.description'),
    },
    {
      icon: 'terrain',
      title: t('aboutSwami.milestones.himalaya.title'),
      description: t('aboutSwami.milestones.himalaya.description'),
    },
    {
      icon: 'fire',
      title: t('aboutSwami.milestones.lineage.title'),
      description: t('aboutSwami.milestones.lineage.description'),
    },
    {
      icon: 'earth',
      title: t('aboutSwami.milestones.global.title'),
      description: t('aboutSwami.milestones.global.description'),
    },
  ];

  const recognitions = [
    t('aboutSwami.recognitions.one'),
    t('aboutSwami.recognitions.two'),
    t('aboutSwami.recognitions.three'),
    t('aboutSwami.recognitions.four'),
  ];

  const thoughts = [
    t('aboutSwami.thoughts.one'),
    t('aboutSwami.thoughts.two'),
    t('aboutSwami.thoughts.three'),
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        eyebrow={t('aboutSwami.eyebrow')}
        title={t('aboutSwami.title')}
        subtitle={t('aboutSwami.subtitle')}
        icon="account-star-outline"
      />

      <View style={styles.section}>
        <SurfaceCard style={styles.heroCard}>
          <Image source={SWAMIJI_SOURCE} style={styles.heroImage} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('aboutSwami.heroTitle')}</Text>
            <Text style={styles.heroText}>{t('aboutSwami.heroText')}</Text>
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('aboutSwami.biographyTitle')}
          subtitle={t('aboutSwami.biographySubtitle')}
          icon="timeline-text-outline"
        />
        {milestones.map((item) => (
          <SurfaceCard key={item.title} style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Icon name={item.icon as any} size={22} color={colors.primary.saffron} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoDescription}>{item.description}</Text>
            </View>
          </SurfaceCard>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('aboutSwami.recognitionsTitle')}
          subtitle={t('aboutSwami.recognitionsSubtitle')}
          icon="medal-outline"
        />
        <SurfaceCard>
          {recognitions.map((recognition) => (
            <View key={recognition} style={styles.listRow}>
              <Icon name="check-decagram" size={18} color={colors.gold.dark} />
              <Text style={styles.listText}>{recognition}</Text>
            </View>
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('aboutSwami.thoughtsTitle')}
          subtitle={t('aboutSwami.thoughtsSubtitle')}
          icon="lightbulb-on-outline"
        />
        {thoughts.map((thought) => (
          <SurfaceCard key={thought} compact style={styles.quoteCard}>
            <Text style={styles.quoteText}>{thought}</Text>
          </SurfaceCard>
        ))}
      </View>

      <View style={styles.section}>
        <AppButton
          label={t('aboutSwami.cta')}
          onPress={() =>
            navigation.navigate('ContactForm', {
              prefillSubject: 'Message for Swami Ji',
              titleOverride: t('appDrawer.items.writeToSwami'),
              introTitleOverride: t('contact.writeToSwamiTitle'),
              introTextOverride: t('contact.writeToSwamiSubtitle'),
              messagePlaceholder: t('contact.placeholders.writeToSwami'),
            })
          }
          icon="email-heart-outline"
        />
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  heroCard: {
    padding: spacing.md,
  },
  heroImage: {
    width: '100%',
    height: 320,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  heroCopy: {
    gap: spacing.sm,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.primary.maroon,
  },
  heroText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  infoCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF2DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    ...typography.title,
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  infoDescription: {
    ...typography.body,
    color: colors.text.secondary,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  listText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  quoteCard: {
    marginBottom: spacing.md,
    backgroundColor: '#FFF2DB',
  },
  quoteText: {
    ...typography.body,
    color: colors.primary.maroon,
  },
});
