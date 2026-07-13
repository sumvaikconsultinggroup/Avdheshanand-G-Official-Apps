import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
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
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.picture || null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('profile.photoPermissionTitle'), t('profile.photoPermissionMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      setAvatarBase64(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
    }
  };

  const handleSave = async () => {
    const next: { fullName?: string; phone?: string } = {};
    if (!fullName.trim()) next.fullName = t('profile.errors.nameRequired');
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length !== 10) next.phone = t('profile.errors.phoneInvalid');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phoneDigits,
        profileImageBase64: avatarBase64 || undefined,
      });
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
          <TouchableOpacity style={styles.avatar} onPress={handlePickImage} activeOpacity={0.85}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Icon name="account-circle" size={64} color={colors.primary.saffron} />
            )}
            <View style={styles.avatarEditBadge}>
              <Icon name="camera" size={15} color={colors.text.white} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
            <Text style={styles.avatarHint}>{t('profile.changePhoto')}</Text>
          </TouchableOpacity>
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
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary.maroon,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background.parchment,
    },
    avatarHint: {
      ...typography.caption,
      color: colors.primary.maroon,
      fontWeight: '700',
      marginTop: spacing.sm,
      textAlign: 'center',
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
