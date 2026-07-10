import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, type ColorPalette } from '../../theme';
import { AppButton, FloatingInput } from '../../components/common';

export function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const next: { fullName?: string; phone?: string } = {};
    if (!fullName.trim()) next.fullName = t('profile.errors.nameRequired');
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length !== 10) next.phone = t('profile.errors.phoneInvalid');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phoneDigits });
      Alert.alert(t('profile.updateSuccess'), '', [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      Alert.alert(
        t('profile.updateFailed'),
        error?.response?.data?.message || t('common.networkError')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.primary.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Icon name="account-circle" size={64} color={colors.primary.saffron} />
          </View>
        </View>

        <FloatingInput
          label={t('schedule.fullName')}
          leftIcon="account"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          autoCapitalize="words"
        />
        <FloatingInput
          label={t('schedule.phone')}
          leftIcon="phone"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
          error={errors.phone}
        />
        <FloatingInput
          label={t('schedule.email')}
          leftIcon="email"
          value={user?.email || ''}
          onChangeText={() => {}}
          editable={false}
        />
        <Text style={styles.lockedHint}>{t('profile.emailLocked')}</Text>

        <AppButton
          label={t('profile.saveChanges')}
          onPress={handleSave}
          loading={saving}
          icon="check"
          style={styles.saveButton}
        />
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
      paddingVertical: spacing.sm,
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
    avatarWrap: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.background.warmWhite,
      borderWidth: 1,
      borderColor: colors.border.gold as string,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockedHint: {
      ...typography.caption,
      color: colors.text.secondary,
      marginTop: -spacing.sm,
      marginLeft: spacing.xs,
      marginBottom: spacing.md,
    },
    saveButton: {
      marginTop: spacing.md,
    },
  });
