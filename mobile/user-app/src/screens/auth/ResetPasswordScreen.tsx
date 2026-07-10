import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export function ResetPasswordScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const email = route?.params?.email || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert(t('common.error'), t('auth.errors.fillAllFields'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.reset.errors.passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.registerFlow.errors.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/user/reset-password', { email, newPassword: password });
      Alert.alert(t('auth.reset.successTitle'), t('auth.reset.successMessage'), [
        { text: t('donate.alerts.ok'), onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      Alert.alert(
        t('auth.reset.failedTitle'),
        error.response?.data?.message || t('auth.reset.failedMessage')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.omSymbol}>ॐ</Text>
          <Text style={styles.title}>{t('auth.reset.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.reset.forAccount', { account: email || t('auth.reset.yourAccount') })}
          </Text>
        </View>

        <View style={styles.formCard}>
          <TextInput
            label={t('auth.reset.newPassword')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            outlineColor={colors.border.gold as string}
            activeOutlineColor={colors.gold.main}
            style={styles.input}
          />

          <TextInput
            label={t('auth.reset.confirmNewPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
            outlineColor={colors.border.gold as string}
            activeOutlineColor={colors.gold.main}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            buttonColor={colors.primary.saffron}
            textColor={colors.text.white}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {t('auth.reset.updatePassword')}
          </Button>
        </View>

        <TouchableOpacity style={styles.backContainer} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backText}>← {t('auth.backToLogin')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  omSymbol: {
    fontSize: 56,
    color: colors.gold.main,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  formCard: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.cream,
  },
  button: {
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
});
