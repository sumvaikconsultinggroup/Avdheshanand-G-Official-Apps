import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { useI18n } from '../i18n/I18nProvider';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { MoreScreen } from '../screens/more/MoreScreen';
import { UsersScreen } from '../screens/users/UsersScreen';
import { EventsScreen } from '../screens/events/EventsScreen';
import { DonationsScreen } from '../screens/donations/DonationsScreen';
import { ScheduleScreen } from '../screens/schedule/ScheduleScreen';
import { AppointmentInboxScreen } from '../screens/schedule/AppointmentInboxScreen';
import { ArticlesScreen } from '../screens/content/ArticlesScreen';
import { VideosScreen } from '../screens/content/VideosScreen';
import { PodcastsScreen } from '../screens/content/PodcastsScreen';
import { BooksScreen } from '../screens/books/BooksScreen';
import { RoomBookingScreen } from '../screens/rooms/RoomBookingScreen';
import { VolunteersScreen } from '../screens/volunteers/VolunteersScreen';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { TeamManagementScreen } from '../screens/team/TeamManagementScreen';
import { NotificationBroadcasterScreen } from '../screens/notifications/NotificationBroadcasterScreen';
import { MantraDikshaScreen } from '../screens/diksha/MantraDikshaScreen';
import { SevaBoardScreen } from '../screens/seva/SevaBoardScreen';
import { SmartNotesScreen } from '../screens/notes/SmartNotesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking: LinkingOptions<any> = {
  prefixes: [Linking.createURL('/'), 'https://admin.avdheshanandg.org'],
  config: {
    screens: {
      AdminMain: {
        screens: {
          Dashboard: '',
          Events: 'events',
          Donations: 'donations',
          SmartNotes: 'smart-notes',
          More: 'more',
        },
      },
      ScheduleStack: 'schedule',
      AppointmentInboxStack: 'appointments',
      ArticlesStack: 'articles',
      VideosStack: 'videos',
      PodcastsStack: 'podcasts',
      BooksStack: 'books',
      RoomsStack: 'rooms',
      UsersStack: 'users',
      VolunteersStack: 'volunteers',
      MessagesStack: 'messages',
      BroadcasterStack: 'broadcaster',
      MantraDikshaStack: 'mantra-diksha',
      SevaBoardStack: 'seva-board',
      SmartNotesStack: 'smart-notes',
      AdminLogin: 'login',
    },
  },
};

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  const icons: Record<string, React.ComponentProps<typeof Icon>['name']> = {
    Dashboard: 'view-dashboard',
    Events: 'calendar-month',
    Donations: 'hand-heart',
    SmartNotes: 'note-text-outline',
    More: 'apps',
  };
  return (
    <View
      style={{
        width: 46,
        height: 30,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? 'rgba(163,18,58,0.13)' : 'transparent',
      }}
    >
      <Icon name={icons[label] || 'circle'} size={focused ? 22 : 21} color={color} />
    </View>
  );
}

// Wrap each screen in its own stack for proper header
function makeStack(name: string, Component: React.ComponentType<any>, titleKey: string) {
  return function WrappedStack() {
    const { t } = useI18n();
    return (
      <Stack.Navigator>
        <Stack.Screen name={name} component={Component} options={{
          title: t(titleKey),
          headerStyle: { backgroundColor: colors.background.warmWhite },
          headerTintColor: colors.primary.maroon,
          headerTitleStyle: { fontWeight: '600' },
        }} />
      </Stack.Navigator>
    );
  };
}

const ScheduleStack = makeStack('Schedule', ScheduleScreen, 'tabs.schedule');
const AppointmentInboxStack = makeStack('Appointments', AppointmentInboxScreen, 'admin.appointments');
const ArticlesStack = makeStack('Articles', ArticlesScreen, 'admin.articles');
const VideosStack = makeStack('Videos', VideosScreen, 'admin.videos');
const PodcastsStack = makeStack('Podcasts', PodcastsScreen, 'admin.podcasts');
const BooksStack = makeStack('Books', BooksScreen, 'admin.books');
const RoomsStack = makeStack('Rooms', RoomBookingScreen, 'admin.rooms');
const UsersStack = makeStack('Users', UsersScreen, 'admin.users');
const VolunteersStack = makeStack('Volunteers', VolunteersScreen, 'admin.volunteers');
const MessagesStack = makeStack('Messages', MessagesScreen, 'admin.prayerInbox');
const BroadcasterStack = makeStack('Broadcaster', NotificationBroadcasterScreen, 'admin.broadcaster');
const MantraDikshaStack = makeStack('MantraDiksha', MantraDikshaScreen, 'admin.mantraDiksha');
const SevaBoardStack = makeStack('SevaBoard', SevaBoardScreen, 'admin.sevaBoard');
const SmartNotesStack = makeStack('SmartNotes', SmartNotesScreen, 'admin.smartNotes');
const TeamStack = makeStack('Team', TeamManagementScreen, 'admin.users');

function AdminTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 6);
  const { t } = useI18n();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary.saffron,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.background.warmWhite,
          borderTopColor: colors.border.gold as string,
          borderTopWidth: 1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingBottom: bottomPad,
          paddingTop: 8,
          height: 66 + bottomPad,
          shadowColor: '#2F1505',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 16,
        },
        tabBarIcon: ({ focused, color }) => (
          <TabIcon label={route.name} focused={focused} color={color} />
        ),
        headerStyle: {
          backgroundColor: colors.background.warmWhite,
          shadowColor: '#2F1505',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        headerTintColor: colors.primary.maroon,
        headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 3,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('tabs.dashboard') }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: t('tabs.events') }} />
      <Tab.Screen name="Donations" component={DonationsScreen} options={{ title: t('tabs.donations') }} />
      <Tab.Screen name="SmartNotes" component={SmartNotesScreen} options={{ title: t('admin.smartNotes'), tabBarLabel: t('tabs.notes') }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: t('tabs.more'), headerShown: false }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.parchment }}>
        <ActivityIndicator size="large" color={colors.primary.saffron} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="AdminMain" component={AdminTabs} />
            <Stack.Screen name="ScheduleStack" component={ScheduleStack} />
            <Stack.Screen name="AppointmentInboxStack" component={AppointmentInboxStack} />
            <Stack.Screen name="ArticlesStack" component={ArticlesStack} />
            <Stack.Screen name="VideosStack" component={VideosStack} />
            <Stack.Screen name="PodcastsStack" component={PodcastsStack} />
            <Stack.Screen name="BooksStack" component={BooksStack} />
            <Stack.Screen name="RoomsStack" component={RoomsStack} />
            <Stack.Screen name="UsersStack" component={UsersStack} />
            <Stack.Screen name="VolunteersStack" component={VolunteersStack} />
            <Stack.Screen name="MessagesStack" component={MessagesStack} />
            <Stack.Screen name="BroadcasterStack" component={BroadcasterStack} />
            <Stack.Screen name="MantraDikshaStack" component={MantraDikshaStack} />
            <Stack.Screen name="SevaBoardStack" component={SevaBoardStack} />
            <Stack.Screen name="SmartNotesStack" component={SmartNotesStack} />
            <Stack.Screen name="TeamStack" component={TeamStack} />
          </>
        ) : (
          <Stack.Screen name="AdminLogin" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
