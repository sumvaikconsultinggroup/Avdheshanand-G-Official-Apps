import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { useI18n } from '../../i18n/I18nProvider';
import {
  AdminHero,
  AdminMetricCard,
  AdminSectionHeader,
  AdminSurface,
} from '../../components/common';
import type { ModuleId } from '../../context/PermissionContext';
import { borderRadius, colors, spacing, typography } from '../../theme';

interface StatCard {
  title: string;
  value: number;
  icon: React.ComponentProps<typeof Icon>['name'];
  color: string;
  route: string;
  module: ModuleId;
  meta?: string;
}

interface DashboardSnapshot {
  prayerRequests: number;
  appointments: number;
  smartNotes: number;
  sevaTasks: number;
}

interface FocusCard {
  label: string;
  count: number;
  icon: React.ComponentProps<typeof Icon>['name'];
  route: string;
  module: ModuleId;
  color: string;
  meta: string;
}

const DEFAULT_SNAPSHOT: DashboardSnapshot = {
  prayerRequests: 0,
  appointments: 0,
  smartNotes: 0,
  sevaTasks: 0,
};

export function DashboardScreen({ navigation }: any) {
  const { admin, logout } = useAuth();
  const { role, canAccessModule } = usePermissions();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatCard[]>([
    {
      title: t('admin.statUsers'),
      value: 0,
      icon: 'account-group-outline',
      color: colors.primary.saffron,
      route: 'UsersStack',
      module: 'users',
    },
    {
      title: t('admin.statEvents'),
      value: 0,
      icon: 'calendar-month-outline',
      color: colors.gold.dark,
      route: 'Events',
      module: 'events',
    },
    {
      title: t('admin.statDonations'),
      value: 0,
      icon: 'hand-heart-outline',
      color: colors.primary.maroon,
      route: 'Donations',
      module: 'donations',
    },
    {
      title: t('admin.statVolunteers'),
      value: 0,
      icon: 'account-heart-outline',
      color: colors.accent.sage,
      route: 'VolunteersStack',
      module: 'volunteers',
    },
  ]);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(DEFAULT_SNAPSHOT);

  const fetchOverview = useCallback(async () => {
    try {
      const [usersRes, eventsRes, donationsRes, volunteersRes, messagesRes, appointmentsRes, notesRes, sevaRes] =
        await Promise.allSettled([
          api.get('/users'),
          api.get('/events'),
          api.get('/donate'),
          api.get('/volunteer'),
          api.get('/connect'),
          api.get('/scheduleRegistration'),
          api.get('/smart-notes'),
          api.get('/seva-tasks'),
        ]);

      const topLevelResponses = [usersRes, eventsRes, donationsRes, volunteersRes];
      setStats((current) =>
        current.map((stat, index) => {
          const response = topLevelResponses[index];
          if (response.status === 'fulfilled') {
            const data = response.value.data;
            return {
              ...stat,
              value: Array.isArray(data) ? data.length : 0,
            };
          }
          return stat;
        }),
      );

      const countFulfilled = (result: PromiseSettledResult<any>) =>
        result.status === 'fulfilled' && Array.isArray(result.value.data) ? result.value.data : [];

      const messageItems = countFulfilled(messagesRes);
      const appointmentItems = countFulfilled(appointmentsRes);
      const noteItems = countFulfilled(notesRes);
      const sevaItems = countFulfilled(sevaRes);

      setSnapshot({
        prayerRequests: messageItems.filter((item: any) => (item.status || 'new') === 'new').length,
        appointments: appointmentItems.filter((item: any) => item.status === 'Pending').length,
        smartNotes: noteItems.filter((item: any) => item.assignmentStatus !== 'completed').length,
        sevaTasks: sevaItems.filter((item: any) => ['todo', 'in_progress', 'assigned'].includes(item.status)).length,
      });
    } catch {
      // Keep dashboard resilient if a slice fails.
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    setStats((current) => [
      { ...current[0], title: t('admin.statUsers') },
      { ...current[1], title: t('admin.statEvents') },
      { ...current[2], title: t('admin.statDonations') },
      { ...current[3], title: t('admin.statVolunteers') },
    ]);
  }, [t]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOverview();
    setRefreshing(false);
  };

  const focusCards = useMemo<FocusCard[]>(
    () => [
      {
        label: 'Prayer inbox',
        count: snapshot.prayerRequests,
        icon: 'hands-pray',
        route: 'MessagesStack',
        module: 'messages',
        color: colors.primary.saffron,
        meta: 'Fresh requests waiting for a reply',
      },
      {
        label: 'Appointments',
        count: snapshot.appointments,
        icon: 'clipboard-text-clock-outline',
        route: 'AppointmentInboxStack',
        module: 'schedule',
        color: colors.primary.saffron,
        meta: 'Pending approvals and follow-up',
      },
      {
        label: 'Smart notes',
        count: snapshot.smartNotes,
        icon: 'note-text-outline',
        route: 'SmartNotes',
        module: 'smartNotes',
        color: colors.primary.maroon,
        meta: 'Assigned work still open',
      },
      {
        label: 'Seva board',
        count: snapshot.sevaTasks,
        icon: 'clipboard-check-outline',
        route: 'SevaBoardStack',
        module: 'sevaBoard',
        color: colors.gold.dark,
        meta: 'Tasks due or in progress',
      },
    ],
    [snapshot],
  );

  const quickActions = [
    { label: 'Create event', subtitle: 'Add a public event quickly', route: 'Events', icon: 'calendar-plus' },
    { label: 'Send broadcast', subtitle: 'Push an urgent update', route: 'BroadcasterStack', icon: 'bullhorn-outline' },
    { label: 'Review schedule', subtitle: 'Edit travel and appointment windows', route: 'ScheduleStack', icon: 'calendar-clock' },
    { label: 'Open donations', subtitle: 'Check campaigns and receipts', route: 'Donations', icon: 'cash-multiple' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary.saffron}
          colors={[colors.primary.saffron]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <AdminHero
        eyebrow="Mission control"
        title={t('admin.welcome', { name: admin?.username || t('common.admin') })}
        subtitle="Daily approvals, content, tasks, and communications all move from here."
        badge={(role || admin?.role || 'admin').toUpperCase()}
        actions={[
          { label: 'Refresh', icon: 'refresh', onPress: onRefresh },
          { label: 'Logout', icon: 'logout', onPress: logout },
        ]}
      />

      <AdminSectionHeader
        title="Priority work"
        subtitle="These are the sections most likely to need attention today."
      />
      <View style={styles.metricGrid}>
        {focusCards
          .filter((item) => canAccessModule(item.module))
          .map((item) => (
            <AdminMetricCard
              key={item.label}
              label={item.label}
              value={item.count}
              icon={item.icon}
              tone={item.color}
              meta={item.meta}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
      </View>

      <AdminSectionHeader
        title="Platform snapshot"
        subtitle="Top-level counts across the modules your team uses most."
      />
      <View style={styles.metricGrid}>
        {stats
          .filter((item) => canAccessModule(item.module))
          .map((stat) => (
            <AdminMetricCard
              key={stat.title}
              label={stat.title}
              value={stat.value}
              icon={stat.icon}
              tone={stat.color}
              onPress={() => navigation.navigate(stat.route)}
            />
          ))}
      </View>

      <AdminSectionHeader
        title="Quick launch"
        subtitle="Jump into the most common daily actions without digging through menus."
      />
      {quickActions.map((action) => (
        <TouchableOpacity key={action.label} onPress={() => navigation.navigate(action.route)} activeOpacity={0.85}>
          <AdminSurface style={styles.quickActionCard}>
            <View style={[styles.quickIconWrap, { backgroundColor: `${colors.primary.saffron}14` }]}>
              <Icon name={action.icon as any} size={22} color={colors.primary.saffron} />
            </View>
            <View style={styles.quickCopy}>
              <Text style={styles.quickTitle}>{action.label}</Text>
              <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={colors.text.secondary} />
          </AdminSurface>
        </TouchableOpacity>
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
    paddingBottom: spacing.xxl,
  },
  languageWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  quickCopy: {
    flex: 1,
  },
  quickTitle: {
    ...typography.titleSm,
    color: colors.text.primary,
  },
  quickSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
