import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, SectionHeader, SurfaceCard } from '../../components/common';
import { spacing, typography, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function MissionScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const teachings = [
    { icon: 'book-open-page-variant-outline', title: t('missionScreen.teachings.one.title'), description: t('missionScreen.teachings.one.description') },
    { icon: 'meditation', title: t('missionScreen.teachings.two.title'), description: t('missionScreen.teachings.two.description') },
    { icon: 'hand-heart-outline', title: t('missionScreen.teachings.three.title'), description: t('missionScreen.teachings.three.description') },
  ];

  const initiatives = [
    t('missionScreen.initiatives.one'),
    t('missionScreen.initiatives.two'),
    t('missionScreen.initiatives.three'),
    t('missionScreen.initiatives.four'),
  ];

  const presence = [
    t('missionScreen.presence.one'),
    t('missionScreen.presence.two'),
    t('missionScreen.presence.three'),
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        eyebrow={t('missionScreen.eyebrow')}
        title={t('missionScreen.title')}
        subtitle={t('missionScreen.subtitle')}
        icon="book-heart-outline"
      />

      <View style={styles.section}>
        <SectionHeader
          title={t('missionScreen.teachingsTitle')}
          subtitle={t('missionScreen.teachingsSubtitle')}
          icon="book-heart-outline"
        />
        {teachings.map((item) => (
          <SurfaceCard key={item.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Icon name={item.icon as any} size={22} color={colors.primary.saffron} />
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureText}>{item.description}</Text>
            </View>
          </SurfaceCard>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('missionScreen.initiativesTitle')}
          subtitle={t('missionScreen.initiativesSubtitle')}
          icon="seed-outline"
        />
        <SurfaceCard>
          {initiatives.map((initiative) => (
            <View key={initiative} style={styles.listRow}>
              <Icon name="chevron-double-right" size={18} color={colors.gold.dark} />
              <Text style={styles.listText}>{initiative}</Text>
            </View>
          ))}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('missionScreen.presenceTitle')}
          subtitle={t('missionScreen.presenceSubtitle')}
          icon="earth"
        />
        <SurfaceCard>
          {presence.map((item) => (
            <View key={item} style={styles.listRow}>
              <Icon name="map-marker-radius-outline" size={18} color={colors.gold.dark} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </SurfaceCard>
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
  featureCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF2DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    ...typography.title,
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  featureText: {
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
});
