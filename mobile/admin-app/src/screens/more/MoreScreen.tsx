import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePermissions } from '../../context/PermissionContext';
import type { ModuleId } from '../../context/PermissionContext';
import { useI18n } from '../../i18n/I18nProvider';
import { AdminHero, AdminSectionHeader, AdminSurface } from '../../components/common';
import { borderRadius, colors, spacing, typography, TAB_BAR_CLEARANCE } from '../../theme';

const MODULE_ICONS: Record<string, React.ComponentProps<typeof Icon>['name']> = {
  ScheduleStack: 'calendar-clock',
  AppointmentInboxStack: 'clipboard-list-outline',
  ArticlesStack: 'newspaper-variant-outline',
  VideosStack: 'video-outline',
  PodcastsStack: 'microphone-outline',
  BooksStack: 'book-open-page-variant-outline',
  RoomsStack: 'door-open',
  UsersStack: 'account-group-outline',
  VolunteersStack: 'hand-heart-outline',
  MessagesStack: 'message-text-outline',
  BroadcasterStack: 'bullhorn-outline',
  MantraDikshaStack: 'meditation',
  SevaBoardStack: 'clipboard-check-outline',
  TeamStack: 'shield-account-outline',
};

const SCREEN_TO_MODULE: Record<string, ModuleId> = {
  ScheduleStack: 'schedule',
  AppointmentInboxStack: 'schedule',
  ArticlesStack: 'articles',
  VideosStack: 'videos',
  PodcastsStack: 'podcasts',
  BooksStack: 'books',
  RoomsStack: 'rooms',
  UsersStack: 'users',
  VolunteersStack: 'volunteers',
  MessagesStack: 'messages',
  BroadcasterStack: 'notifications',
  MantraDikshaStack: 'mantraDiksha',
  SevaBoardStack: 'sevaBoard',
  SmartNotesStack: 'smartNotes',
  TeamStack: 'users',
};

export function MoreScreen({ navigation }: any) {
  const { t } = useI18n();
  const { role, canAccessModule } = usePermissions();
  const insets = useSafeAreaInsets();

  const allItems = [
    { label: t('tabs.schedule'), screen: 'ScheduleStack', group: 'Operations' },
    { label: t('admin.appointments'), screen: 'AppointmentInboxStack', group: 'Operations' },
    { label: t('admin.prayerInbox'), screen: 'MessagesStack', group: 'Operations' },
    { label: t('admin.broadcaster'), screen: 'BroadcasterStack', group: 'Operations' },
    { label: t('admin.sevaBoard'), screen: 'SevaBoardStack', group: 'Operations' },
    { label: t('admin.mantraDiksha'), screen: 'MantraDikshaStack', group: 'Operations' },
    { label: t('admin.articles'), screen: 'ArticlesStack', group: 'Content' },
    { label: t('admin.videos'), screen: 'VideosStack', group: 'Content' },
    { label: t('admin.podcasts'), screen: 'PodcastsStack', group: 'Content' },
    { label: t('admin.books'), screen: 'BooksStack', group: 'Content' },
    { label: t('admin.rooms'), screen: 'RoomsStack', group: 'Community' },
    { label: t('admin.users'), screen: 'UsersStack', group: 'Community' },
    { label: t('admin.volunteers'), screen: 'VolunteersStack', group: 'Community' },
    { label: 'Team', screen: 'TeamStack', group: 'Community' },
  ];

  const items = allItems.filter((item) => {
    const moduleId = SCREEN_TO_MODULE[item.screen];
    return moduleId ? canAccessModule(moduleId) : true;
  });

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <AdminHero
        eyebrow="All sections"
        title={t('admin.allSections')}
        subtitle="The rest of the admin workspace is grouped here so daily work stays easier to scan."
        badge={role.toUpperCase()}
      />

      {Object.entries(grouped).map(([group, groupItems]) => (
        <View key={group} style={styles.groupBlock}>
          <AdminSectionHeader
            title={group}
            subtitle={
              group === 'Operations'
                ? 'Approvals, responses, reminders, and on-the-go coordination.'
                : group === 'Content'
                  ? 'Library, teachings, and media updates.'
                  : 'People, rooms, and internal administration.'
            }
          />
          <View style={styles.grid}>
            {groupItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.gridItem}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.85}
              >
                <AdminSurface style={styles.card}>
                  <View style={styles.iconWrap}>
                    <Icon name={MODULE_ICONS[item.screen] || 'circle-outline'} size={24} color={colors.primary.saffron} />
                  </View>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                </AdminSurface>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  content: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  groupBlock: {
    marginTop: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  card: {
    minHeight: 132,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary.saffron}16`,
  },
  cardLabel: {
    ...typography.titleSm,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
});
