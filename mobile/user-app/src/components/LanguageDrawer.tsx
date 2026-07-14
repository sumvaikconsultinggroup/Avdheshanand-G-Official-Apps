import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { borderRadius, spacing, typography, type ColorPalette } from '../theme';
import { useTheme } from '../context/ThemeContext';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
];

interface LanguageDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguageDrawer({ visible, onClose }: LanguageDrawerProps) {
  const { i18n, t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  const handleSelect = async (code: string) => {
    try {
      await i18n.changeLanguage(code); // persisted via the i18n languageDetector cache
    } finally {
      onClose();
    }
  };

  return (
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
            <View style={styles.heroRow}>
              <View style={styles.heroTitleWrap}>
                <View style={styles.heroIcon}>
                  <Icon name="translate" size={20} color={colors.text.white} />
                </View>
                <Text style={styles.title}>{t('profile.language')}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
                <Icon name="close" size={18} color={colors.primary.maroon} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            <View style={styles.optionsCard}>
              {LANGUAGES.map((language, index) => {
                const active = currentLanguage === language.code;
                return (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.option,
                      index < LANGUAGES.length - 1 && styles.optionDivider,
                      active && styles.optionActive,
                    ]}
                    onPress={() => handleSelect(language.code)}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.changeLanguageTo', { language: language.native })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.codeBadge, active && styles.codeBadgeActive]}>
                      <Text style={[styles.codeText, active && styles.codeTextActive]}>
                        {language.code.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={[styles.optionNative, active && styles.optionNativeActive]}>
                        {language.native}
                      </Text>
                      <Text style={styles.optionLabel}>{language.label}</Text>
                    </View>
                    {active ? (
                      <Icon name="check-circle" size={22} color={colors.primary.saffron} />
                    ) : (
                      <Icon name="chevron-right" size={18} color={colors.gold.dark} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(46, 27, 10, 0.32)',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    width: '100%',
    backgroundColor: '#FFF8EB',
    overflow: 'hidden',
  },
  hero: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.text.white,
  },
  subtitle: {
    ...typography.bodySm,
    color: 'rgba(255,249,239,0.85)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,245,231,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  optionsCard: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,160,23,0.16)',
  },
  optionActive: {
    backgroundColor: '#FFF4DC',
  },
  codeBadge: {
    width: 44,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.sandstone,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  codeBadgeActive: {
    backgroundColor: colors.primary.maroon,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold.dark,
  },
  codeTextActive: {
    color: colors.text.white,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionNative: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  optionNativeActive: {
    color: colors.primary.maroon,
  },
  optionLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },
});
