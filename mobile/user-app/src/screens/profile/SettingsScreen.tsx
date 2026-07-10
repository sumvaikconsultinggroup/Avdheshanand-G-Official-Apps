import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { borderRadius, spacing, typography, type ColorPalette } from '../../theme';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const themeOptions: { value: ThemeMode; label: string; icon: React.ComponentProps<typeof Icon>['name'] }[] = [
    { value: 'light', label: t('settings.theme.light'), icon: 'white-balance-sunny' },
    { value: 'dark', label: t('settings.theme.dark'), icon: 'weather-night' },
    { value: 'system', label: t('settings.theme.system'), icon: 'cellphone-cog' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.primary.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{t('settings.appearance')}</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Icon name="theme-light-dark" size={20} color={colors.primary.saffron} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('settings.theme.title')}</Text>
              <Text style={styles.cardSubtitle}>{t('settings.theme.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.segment}>
            {themeOptions.map((option) => {
              const active = mode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => setMode(option.value)}
                  activeOpacity={0.85}
                >
                  <Icon
                    name={option.icon}
                    size={20}
                    color={active ? colors.text.white : colors.primary.maroon}
                  />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.parchment,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.background.warmWhite,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.gold as string,
    },
    headerBackButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background.sandstone,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary.maroon,
    },
    content: {
      padding: spacing.lg,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.gold.dark,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    card: {
      backgroundColor: colors.background.warmWhite,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border.gold as string,
      padding: spacing.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background.cream,
      borderWidth: 1,
      borderColor: colors.border.gold as string,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      ...typography.title,
      color: colors.text.primary,
    },
    cardSubtitle: {
      ...typography.bodySm,
      color: colors.text.secondary,
      marginTop: 2,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.background.sandstone,
      borderRadius: borderRadius.full,
      padding: 5,
      gap: 6,
    },
    segmentItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.sm + 2,
      borderRadius: borderRadius.full,
    },
    segmentItemActive: {
      backgroundColor: colors.primary.maroon,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary.maroon,
    },
    segmentTextActive: {
      color: colors.text.white,
    },
  });
