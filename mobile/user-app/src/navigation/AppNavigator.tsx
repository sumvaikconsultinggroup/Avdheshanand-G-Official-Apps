import React, { useState } from 'react';
import { NavigationContainer, DefaultTheme, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import { AppShellProvider, useAppShell } from '../context/AppShellContext';
import { useTheme } from '../context/ThemeContext';
import PublicAppDrawer from '../components/PublicAppDrawer';

// Auth screens
import {
  LoginScreen,
  RegisterScreen,
  OTPScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
} from '../screens/auth';
import {
  OnboardingLocationScreen,
  OnboardingNotificationsScreen,
  OnboardingWelcomeScreen,
} from '../screens/onboarding';

// Tab screens
import { HomeScreen } from '../screens/home';
import {
  ExploreScreen,
  EventDetailScreen,
  ArticleDetailScreen,
  VideoSeriesScreen,
  BookDetailScreen,
  PodcastDetailScreen,
  GalleryScreen,
  VolunteerScreen,
  ContactScreen,
} from '../screens/explore';
import { ScheduleScreen } from '../screens/schedule';
import { DonateScreen } from '../screens/donate';
import { DonationHistoryScreen, ProfileLoginPrompt, ProfileScreen } from '../screens/profile';
import { MyRegistrationsScreen } from '../screens/profile/MyRegistrationsScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import LiveStreamScreen from '../screens/live/LiveStreamScreen';
import PanchangScreen from '../screens/panchang/PanchangScreen';
import PanchangCalendarScreen from '../screens/panchang/PanchangCalendarScreen';
import NotificationPreferencesScreen from '../screens/panchang/NotificationPreferencesScreen';
import { AboutSwamiScreen } from '../screens/about/AboutSwamiScreen';
import { MissionScreen } from '../screens/about/MissionScreen';
import { PrivacyPolicyScreen } from '../screens/legal/PrivacyPolicyScreen';
import { TermsScreen } from '../screens/legal/TermsScreen';
import { MantraDikshaScreen } from '../screens/spiritual/MantraDikshaScreen';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  OTPVerification: { email: string; purpose?: 'register' | 'reset' };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  EventDetail: { eventId: string };
  ArticleDetail: { articleId: string };
  VideoSeries: { seriesId: string };
  BookDetail: { bookId: string };
  PodcastDetail: { podcastId: string };
  GalleryFull: undefined;
  VolunteerForm: undefined;
  ContactForm:
    | {
        prefillSubject?: string;
        titleOverride?: string;
        introTitleOverride?: string;
        introTextOverride?: string;
        messagePlaceholder?: string;
      }
    | undefined;
  LiveStream: undefined;
  Panchang: undefined;
  PanchangCalendar: { lat?: number; lng?: number; cityName?: string; timezone?: string };
  NotificationPreferences: undefined;
  DonationHistory: undefined;
  MyRegistrations: undefined;
  Settings: undefined;
  EditProfile: undefined;
  AboutSwami: undefined;
  Mission: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  MantraDiksha: undefined;
  OnboardingWelcome: undefined;
  OnboardingNotifications: undefined;
  OnboardingLocation: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Schedule: undefined;
  Donate: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function DrawerButton() {
  const { t } = useTranslation();
  const { openDrawer } = useAppShell();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={openDrawer}
      activeOpacity={0.85}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF4DE',
        borderWidth: 1,
        borderColor: colors.border.gold as string,
      }}
      accessibilityRole="button"
      accessibilityLabel={t('appDrawer.openMenu')}
    >
      <Icon name="menu" size={20} color={colors.primary.maroon} />
    </TouchableOpacity>
  );
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'https://www.avdheshanandg.org'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: '',
          Explore: 'explore',
          Schedule: 'schedule',
          Donate: 'donate',
          Profile: 'profile',
        },
      },
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
      EventDetail: 'events/:eventId',
      ArticleDetail: 'articles/:articleId',
      VideoSeries: 'videos/:seriesId',
      BookDetail: 'books/:bookId',
      PodcastDetail: 'podcasts/:podcastId',
      GalleryFull: 'gallery',
      VolunteerForm: 'volunteer',
      ContactForm: 'contact',
      LiveStream: 'live',
      Panchang: 'panchang',
      PanchangCalendar: 'panchang/calendar',
      NotificationPreferences: 'panchang/notifications',
      DonationHistory: 'profile/donations',
    },
  },
};

function ProfileTabScreen({ navigation }: any) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <ProfileLoginPrompt navigation={navigation} />;
  }

  return <ProfileScreen />;
}

const PILL_HEIGHT = 66;

/**
 * Fully custom bottom tab bar rendered as a floating "pill".
 * Replaces React Navigation's default bar so there is NO opaque background
 * behind it — the pill floats over the scrolling content. Icons + labels are
 * centered inside the pill so nothing spills past its rounded edges.
 */
function FloatingPillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const pillBottom = Math.max(insets.bottom, 12);

  return (
    <View pointerEvents="box-none" style={pillStyles.wrap}>
      <View
        style={[
          pillStyles.pill,
          {
            marginBottom: pillBottom,
            backgroundColor: colors.background.warmWhite,
            borderColor: colors.border.gold as string,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
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
              {options.tabBarIcon?.({ focused: isFocused, color: tint, size: 24 })}
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
    paddingHorizontal: 6,
    // Detached shadow so the pill floats above the content.
    shadowColor: '#3A1210',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});

function MainTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // The floating pill is a fully custom `tabBar` (see FloatingPillTabBar) with a
  // transparent scene behind it, so it floats directly over the live content.

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingPillTabBar {...props} />}
      screenOptions={({ route }) => ({
        // Transparent scene so the floating pill sits directly over the live
        // content — nothing reserved/opaque behind it. Content scrolls under it.
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: colors.primary.saffron,
        tabBarInactiveTintColor: colors.text.secondary,
        headerStyle: {
          backgroundColor: colors.background.warmWhite,
        },
        headerTintColor: colors.primary.maroon,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: () => <DrawerButton />,
        tabBarIcon: ({ color, size }) => {
          let iconName: React.ComponentProps<typeof Icon>['name'];
          switch (route.name) {
            case 'Home':
              iconName = 'home-variant';
              break;
            case 'Explore':
              iconName = 'compass';
              break;
            case 'Schedule':
              iconName = 'calendar';
              break;
            case 'Donate':
              iconName = 'hand-heart';
              break;
            case 'Profile':
              iconName = 'account-circle';
              break;
            default:
              iconName = 'circle';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('tabs.home'), headerShown: false }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: t('tabs.explore') }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: t('tabs.schedule') }}
      />
      <Tab.Screen
        name="Donate"
        component={DonateScreen}
        options={{ title: t('tabs.donate'), headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTabScreen}
        options={{ title: t('tabs.profile'), headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth();
  const { isLoading: onboardingLoading, hasCompletedOnboarding } = useOnboarding();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Root navigation theme: use the page background instead of RN's default white
  // so no white ever shows behind scenes or the floating pill tab bar.
  const navTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background.parchment,
      card: colors.background.parchment,
    },
  };

  if (isLoading || onboardingLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background.parchment,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary.saffron} />
      </View>
    );
  }

  const showOnboarding = !hasCompletedOnboarding && !isAuthenticated;

  return (
    <AppShellProvider value={{ openDrawer: () => setDrawerVisible(true), closeDrawer: () => setDrawerVisible(false) }}>
      <NavigationContainer linking={linking} theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* Onboarding screens only exist for first-run, unauthenticated users.
              When onboarding finishes (or the user authenticates) these are
              removed and the navigator falls through to "Main". "Main" is always
              registered so auth modals can reliably reset to it after sign-in. */}
          {showOnboarding && (
            <>
              <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
              <Stack.Screen
                name="OnboardingNotifications"
                component={OnboardingNotificationsScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="OnboardingLocation"
                component={OnboardingLocationScreen}
                options={{ animation: 'slide_from_right' }}
              />
            </>
          )}
          <Stack.Screen name="Main" component={MainTabs} />

          {/* Auth screens as modals */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="OTPVerification"
            component={OTPScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />

          {/* Detail Screens */}
          <Stack.Screen
            name="EventDetail"
            component={EventDetailScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="ArticleDetail"
            component={ArticleDetailScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="VideoSeries"
            component={VideoSeriesScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="BookDetail"
            component={BookDetailScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="PodcastDetail"
            component={PodcastDetailScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="GalleryFull"
            component={GalleryScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="VolunteerForm"
            component={VolunteerScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="ContactForm"
            component={ContactScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="AboutSwami"
            component={AboutSwamiScreen}
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Mission"
            component={MissionScreen}
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="TermsOfService"
            component={TermsScreen}
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MantraDiksha"
            component={MantraDikshaScreen}
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="LiveStream"
            component={LiveStreamScreen}
            options={{
              title: 'Live Satsang',
              headerShown: true,
              animation: 'slide_from_right',
            }}
          />

          {/* Panchang Screens */}
          <Stack.Screen
            name="Panchang"
            component={PanchangScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="PanchangCalendar"
            component={PanchangCalendarScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="NotificationPreferences"
            component={NotificationPreferencesScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="DonationHistory"
            component={DonationHistoryScreen}
            options={{
              headerShown: true,
              title: t('profile.menu.donations.title'),
              animation: 'slide_from_right',
              headerStyle: { backgroundColor: colors.background.warmWhite },
              headerTintColor: colors.primary.maroon,
            }}
          />
          <Stack.Screen
            name="MyRegistrations"
            component={MyRegistrationsScreen}
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
        <PublicAppDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      </NavigationContainer>
    </AppShellProvider>
  );
}
