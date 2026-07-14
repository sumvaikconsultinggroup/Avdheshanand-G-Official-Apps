import React from 'react';
import { NavigationContainer, DefaultTheme, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const PILL_HEIGHT = 66;

/**
 * Fully custom bottom tab bar rendered as a floating "pill" (mirrors the user
 * app). Replaces React Navigation's default bar so there is NO opaque background
 * behind it — the pill floats over the content. Icons + labels centered inside.
 */
function FloatingPillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pillBottom = Math.max(insets.bottom, 12);

  return (
    <View pointerEvents="box-none" style={pillStyles.wrap}>
      <View style={[pillStyles.pill, { marginBottom: pillBottom }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : ((options.title ?? route.name) as string);
          const isFocused = state.index === index;
          const tint = isFocused ? colors.primary.saffron : colors.text.secondary;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
              style={pillStyles.item}
            >
              <TabIcon label={route.name} focused={isFocused} color={tint} />
              <Text numberOfLines={1} style={[pillStyles.label, { color: tint }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.warmWhite,
    paddingHorizontal: 6,
    // Detached shadow so the pill floats above the content.
    shadowColor: '#2F1505',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 5,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});

function AdminTabs() {
  const { t } = useI18n();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingPillTabBar {...props} />}
      screenOptions={({ route }) => ({
        // Transparent scene so the floating pill sits directly over the content.
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: colors.primary.saffron,
        tabBarInactiveTintColor: colors.text.secondary,
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

  // Use the page background instead of RN's default white so no white shows
  // behind scenes or the floating pill tab bar.
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background.parchment,
      card: colors.background.parchment,
    },
  };

  return (
    <NavigationContainer linking={linking} theme={navTheme}>
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
