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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { borderRadius, spacing, shadows, type ColorPalette } from '../theme';
import { useTheme } from '../context/ThemeContext';

export const APP_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'অসমীয়া' },
] as const;

interface LanguagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage?: (languageCode: string) => void | Promise<void>;
}

export default function LanguagePickerModal({
  visible,
  onClose,
  onSelectLanguage,
}: LanguagePickerModalProps) {
  const { i18n, t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  const handleSelect = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    await onSelectLanguage?.(languageCode);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('onboarding.languageTitle')}</Text>
              <Text style={styles.subtitle}>{t('onboarding.languageSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
              <Icon name="close" size={20} color={colors.primary.maroon} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {APP_LANGUAGES.map((language) => {
              const active = currentLanguage === language.code;
              return (
                <TouchableOpacity
                  key={language.code}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => handleSelect(language.code)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.changeLanguageTo', { language: language.label })}
                >
                  <View style={styles.optionLeft}>
                    <Text style={[styles.optionCode, active && styles.optionCodeActive]}>
                      {language.code.toUpperCase()}
                    </Text>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {language.label}
                    </Text>
                  </View>
                  <Icon
                    name={active ? 'check-circle' : 'chevron-right'}
                    size={20}
                    color={active ? colors.primary.saffron : colors.text.secondary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(40, 22, 8, 0.35)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFBF3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderColor: '#F3DFC0',
    maxHeight: '72%',
    ...shadows.temple,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text.secondary,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF2DC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0D3A2',
  },
  list: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFCF6',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#F3DFC0',
  },
  optionActive: {
    backgroundColor: '#FFF1D6',
    borderColor: '#F2B04B',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  optionCode: {
    width: 44,
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold.dark,
  },
  optionCodeActive: {
    color: colors.primary.saffron,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  optionLabelActive: {
    color: colors.primary.maroon,
  },
});
