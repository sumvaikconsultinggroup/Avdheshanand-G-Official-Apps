import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import LanguageDrawer from './LanguageDrawer';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { borderRadius, shadows, spacing, typography, type ColorPalette } from '../theme';
import { useTheme } from '../context/ThemeContext';

const LOGO_SOURCE = require('../../assets/images/avdheshanandg-mission-logo.png');
const SWAMIJI_SOURCE = require('../../assets/images/swamiji-onboarding.jpg');

type DrawerTarget =
  | { type: 'tab'; name: 'Home' | 'Explore' | 'Schedule' | 'Donate' | 'Profile' }
  | {
      type: 'screen';
      name:
        | 'AboutSwami'
        | 'Mission'
        | 'MantraDiksha'
        | 'ContactForm'
        | 'VolunteerForm'
        | 'PrivacyPolicy'
        | 'TermsOfService';
      params?: RootStackParamList[keyof RootStackParamList];
    }
  | { type: 'language' };

type DrawerItem = {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  target: DrawerTarget;
};

interface PublicAppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function PublicAppDrawer({ visible, onClose }: PublicAppDrawerProps) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [languageVisible, setLanguageVisible] = useState(false);

  const primaryItems = useMemo(
    (): DrawerItem[] => [
      { icon: 'home-variant', label: t('tabs.home'), target: { type: 'tab', name: 'Home' } as DrawerTarget },
      { icon: 'compass', label: t('tabs.explore'), target: { type: 'tab', name: 'Explore' } as DrawerTarget },
      { icon: 'calendar', label: t('tabs.schedule'), target: { type: 'tab', name: 'Schedule' } as DrawerTarget },
      { icon: 'hand-heart', label: t('tabs.donate'), target: { type: 'tab', name: 'Donate' } as DrawerTarget },
      { icon: 'account-circle', label: t('tabs.profile'), target: { type: 'tab', name: 'Profile' } as DrawerTarget },
    ],
    [t]
  );

  const missionItems = useMemo(
    (): DrawerItem[] => [
      {
        icon: 'account-star-outline',
        label: t('appDrawer.items.aboutSwami'),
        target: { type: 'screen', name: 'AboutSwami' } as DrawerTarget,
      },
      {
        icon: 'book-heart-outline',
        label: t('appDrawer.items.missionTeachings'),
        target: { type: 'screen', name: 'Mission' } as DrawerTarget,
      },
      {
        icon: 'om',
        label: t('appDrawer.items.mantraDiksha'),
        target: { type: 'screen', name: 'MantraDiksha' } as DrawerTarget,
      },
      {
        icon: 'email-heart-outline',
        label: t('appDrawer.items.writeToSwami'),
        target: {
          type: 'screen',
          name: 'ContactForm',
          params: {
            prefillSubject: 'Message for Swami Ji',
            titleOverride: t('appDrawer.items.writeToSwami'),
            introTitleOverride: t('contact.writeToSwamiTitle'),
            introTextOverride: t('contact.writeToSwamiSubtitle'),
            messagePlaceholder: t('contact.placeholders.writeToSwami'),
          },
        } as DrawerTarget,
      },
      {
        icon: 'hand-heart-outline',
        label: t('home.quickLinksItems.volunteer'),
        target: { type: 'screen', name: 'VolunteerForm' } as DrawerTarget,
      },
    ],
    [t]
  );

  const policyItems = useMemo(
    (): DrawerItem[] => [
      {
        icon: 'shield-check-outline',
        label: t('appDrawer.items.privacy'),
        target: { type: 'screen', name: 'PrivacyPolicy' } as DrawerTarget,
      },
      {
        icon: 'scale-balance',
        label: t('appDrawer.items.terms'),
        target: { type: 'screen', name: 'TermsOfService' } as DrawerTarget,
      },
      {
        icon: 'translate',
        label: t('profile.language'),
        target: { type: 'language' } as DrawerTarget,
      },
    ],
    [t]
  );

  const handleSelect = (target: DrawerTarget) => {
    if (target.type === 'language') {
      setLanguageVisible(true);
      return;
    }

    onClose();

    if (target.type === 'tab') {
      navigation.navigate('Main', { screen: target.name });
      return;
    }

    navigation.navigate(target.name, target.params as any);
  };

  const renderSection = (
    title: string,
    items: DrawerItem[]
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={`${title}-${item.label}`}
            style={[styles.item, index < items.length - 1 && styles.itemDivider]}
            onPress={() => handleSelect(item.target)}
            activeOpacity={0.7}
          >
            <View style={styles.itemIconWrap}>
              <Icon name={item.icon} size={19} color={colors.primary.maroon} />
            </View>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Icon name="chevron-right" size={18} color={colors.gold.dark} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={styles.drawer}>
            <LinearGradient
              colors={[colors.primary.brand, colors.primary.maroon, colors.primary.deepRed]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.brandSeal}>
                  <Image source={LOGO_SOURCE} style={styles.brandLogo} />
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                  <Icon name="close" size={18} color={colors.primary.maroon} />
                </TouchableOpacity>
              </View>
              <View style={styles.heroProfile}>
                <View style={styles.avatarRing}>
                  <Image source={SWAMIJI_SOURCE} style={styles.avatar} />
                </View>
                <Text style={styles.heroTitle}>{t('appDrawer.eyebrow')}</Text>
                <Text style={styles.heroTagline}>Hari Om Tat Sat</Text>
              </View>
            </LinearGradient>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {renderSection(t('appDrawer.sections.browse'), primaryItems)}
              {renderSection(t('appDrawer.sections.mission'), missionItems)}
              {renderSection(t('appDrawer.sections.policies'), policyItems)}
              <View style={styles.footerCard}>
                <Text style={styles.footerTitle}>{t('appDrawer.footerTitle')}</Text>
                <Text style={styles.footerText}>{t('appDrawer.footerText')}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <LanguageDrawer visible={languageVisible} onClose={() => setLanguageVisible(false)} />
    </>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(46, 27, 10, 0.3)',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    width: '100%',
    backgroundColor: '#FFF8EB',
    overflow: 'hidden',
    ...shadows.temple,
  },
  hero: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandSeal: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,245,231,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProfile: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    resizeMode: 'cover',
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text.white,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  heroTagline: {
    ...typography.bodySm,
    color: 'rgba(255,249,239,0.9)',
    fontStyle: 'italic',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.gold.dark,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    overflow: 'hidden',
    ...shadows.warm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,160,23,0.16)',
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF2DB',
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  footerCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: '#FFF2DB',
    borderWidth: 1,
    borderColor: '#F0D29D',
    padding: spacing.lg,
  },
  footerTitle: {
    ...typography.title,
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
  },
  footerText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
