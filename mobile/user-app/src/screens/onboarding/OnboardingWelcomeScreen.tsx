import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import LanguagePickerModal from '../../components/LanguagePickerModal';
import { useOnboarding } from '../../context/OnboardingContext';
import { borderRadius, spacing, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const SLIDE_HEIGHT = 468;
const LOGO_SOURCE = require('../../../assets/images/avdheshanandg-mission-logo.png');
const SWAMIJI_SOURCE = require('../../../assets/images/swamiji-onboarding.jpg');

type Slide = {
  icon: React.ComponentProps<typeof Icon>['name'];
  eyebrow: string;
  title: string;
  description: string;
};

export function OnboardingWelcomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { updateState } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [languageVisible, setLanguageVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const slides = useMemo<Slide[]>(
    () => [
      {
        icon: 'calendar-star',
        eyebrow: t('onboarding.slides.panchangEyebrow'),
        title: t('onboarding.slides.panchangTitle'),
        description: t('onboarding.slides.panchangDescription'),
      },
      {
        icon: 'calendar-clock',
        eyebrow: t('onboarding.slides.scheduleEyebrow'),
        title: t('onboarding.slides.scheduleTitle'),
        description: t('onboarding.slides.scheduleDescription'),
      },
      {
        icon: 'play-circle-outline',
        eyebrow: t('onboarding.slides.wisdomEyebrow'),
        title: t('onboarding.slides.wisdomTitle'),
        description: t('onboarding.slides.wisdomDescription'),
      },
      {
        icon: 'hand-heart',
        eyebrow: t('onboarding.slides.sevaEyebrow'),
        title: t('onboarding.slides.sevaTitle'),
        description: t('onboarding.slides.sevaDescription'),
      },
    ],
    [t]
  );

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(nextIndex);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.topBar}>
        <View style={styles.brandMark}>
          <Image source={LOGO_SOURCE} style={styles.brandLogo} />
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandText}>{t('onboarding.brand')}</Text>
            <Text style={styles.brandSubtext}>{t('onboarding.brandTagline')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguageVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.languageButtonText}>{t('onboarding.changeLanguage')}</Text>
          <Icon name="translate" size={18} color={colors.primary.maroon} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={styles.carousel}
      >
        {slides.map((slide, index) => (
          <View key={slide.title} style={styles.slide}>
            {index === 0 ? (
              <ImageBackground source={SWAMIJI_SOURCE} style={styles.heroPhotoCard} imageStyle={styles.heroPhotoImage}>
                <LinearGradient
                  colors={['rgba(55,28,10,0.02)', 'rgba(55,28,10,0.55)', 'rgba(55,28,10,0.88)']}
                  start={{ x: 0.5, y: 0.05 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.heroPhotoOverlay}
                >
                  <View style={styles.visualBrandChip}>
                    <Image source={LOGO_SOURCE} style={styles.visualBrandLogo} />
                    <Text style={styles.visualBrandText}>{t('onboarding.brand')}</Text>
                  </View>
                  <View style={styles.heroBottomCopy}>
                    <Text style={styles.heroPhotoEyebrow}>{slide.eyebrow}</Text>
                    <Text style={styles.heroPhotoTitle} numberOfLines={2}>{slide.title}</Text>
                    <Text style={styles.heroPhotoDescription} numberOfLines={3}>{slide.description}</Text>
                  </View>
                </LinearGradient>
              </ImageBackground>
            ) : (
              <LinearGradient
                colors={index % 2 === 0 ? ['#FFF4D8', '#FFE7B6'] : ['#FFE8D7', '#FFD2B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.visualCard}
              >
                <View style={styles.visualHalo} />
                <View style={styles.visualTopRow}>
                  <View style={styles.visualIconWrap}>
                    <Icon name={slide.icon} size={46} color={colors.primary.maroon} />
                  </View>
                  <View style={styles.visualSealWrap}>
                    <Image source={LOGO_SOURCE} style={styles.visualSeal} />
                  </View>
                </View>
                <Text style={styles.visualEyebrow}>{slide.eyebrow}</Text>
                <Text style={styles.visualTitle} numberOfLines={2}>{slide.title}</Text>
                <Text style={styles.visualDescription} numberOfLines={5}>{slide.description}</Text>
              </LinearGradient>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {slides.map((_, index) => (
          <View key={index} style={[styles.dot, currentIndex === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.contentBlock}>
        <Text style={styles.heading}>{t('onboarding.welcomeTitle')}</Text>
        <Text style={styles.subheading}>{t('onboarding.welcomeSubtitle')}</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('OnboardingNotifications')}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>{t('onboarding.getStarted')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>{t('onboarding.existingLogin')}</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>{t('onboarding.footer')}</Text>
      </View>

      </ScrollView>

      <LanguagePickerModal
        visible={languageVisible}
        onClose={() => setLanguageVisible(false)}
        onSelectLanguage={(languageCode) => updateState({ languageCode })}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  page: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  brandLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF9EF',
    borderWidth: 1,
    borderColor: '#F1DEC0',
  },
  brandTextWrap: {
    flex: 1,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  brandSubtext: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold.dark,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  languageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  carousel: {
    paddingBottom: spacing.md,
  },
  slide: {
    width,
    paddingHorizontal: spacing.lg,
  },
  heroPhotoCard: {
    height: SLIDE_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EBCB8F',
    ...shadows.temple,
  },
  heroPhotoImage: {
    borderRadius: 28,
    resizeMode: 'cover',
  },
  heroPhotoOverlay: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  visualBrandChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,249,239,0.88)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  visualBrandLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  visualBrandText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  heroBottomCopy: {
    paddingTop: spacing.xxl,
  },
  heroPhotoEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#FFE7B0',
    marginBottom: spacing.sm,
  },
  heroPhotoTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text.white,
  },
  heroPhotoDescription: {
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,249,239,0.92)',
  },
  visualCard: {
    height: SLIDE_HEIGHT,
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0D6A2',
    ...shadows.temple,
  },
  visualTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  visualHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.28)',
    top: -40,
    right: -40,
  },
  visualIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualSealWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,252,246,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240,214,162,0.65)',
  },
  visualSeal: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  visualEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.gold.dark,
    marginBottom: spacing.sm,
  },
  visualTitle: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.primary.maroon,
  },
  visualDescription: {
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 24,
    color: '#6A5445',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D7C9B4',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary.brand,
  },
  contentBlock: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  heading: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: colors.primary.maroon,
    textAlign: 'center',
  },
  subheading: {
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 24,
    color: '#6C5A4C',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButton: {
    width: '100%',
    marginTop: spacing.xl,
    backgroundColor: colors.primary.brand,
    borderRadius: 18,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.warm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.white,
  },
  secondaryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  footerText: {
    marginTop: spacing.md,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
