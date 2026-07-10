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

export function ForgotPasswordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { t } = useTranslation();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.forgot.errors.enterEmail'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('common.error'), t('auth.forgot.errors.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/user/generate-otp', { email: email.trim() });
      navigation.navigate('OTPVerification', { email: email.trim(), purpose: 'reset' });
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('auth.forgot.errors.sendFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.title}>{t('auth.forgot.checkEmailTitle')}</Text>
            <Text style={styles.successMessage}>
              {t('auth.forgot.sentInstructions')}
            </Text>
            <Text style={styles.emailHighlight}>{email}</Text>
            <Text style={styles.instructionText}>
              {t('auth.forgot.checkInboxInstruction')}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login')}
              buttonColor={colors.primary.saffron}
              textColor={colors.text.white}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {t('auth.backToLogin')}
            </Button>

            <TouchableOpacity
              style={styles.resendContainer}
              onPress={() => setEmailSent(false)}
            >
              <Text style={styles.resendText}>
                {t('auth.forgot.didNotReceiveTryAgain')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Om Symbol Header */}
        <View style={styles.header}>
          <Text style={styles.omSymbol}>ॐ</Text>
          <Text style={styles.title}>{t('auth.forgot.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.forgot.subtitle')}
          </Text>
        </View>

        {/* Reset Form */}
        <View style={styles.formCard}>
          <TextInput
            label={t('auth.forgot.emailAddress')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            outlineColor={colors.border.gold as string}
            activeOutlineColor={colors.gold.main}
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <Button
            mode="contained"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading}
            buttonColor={colors.primary.saffron}
            textColor={colors.text.white}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {t('auth.sendResetLink')}
          </Button>
        </View>

        {/* Back to Login */}
        <TouchableOpacity
          style={styles.backContainer}
          onPress={() => navigation.navigate('Login')}
        >
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
  checkIcon: {
    fontSize: 64,
    color: colors.accent.peacock,
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    width: 100,
    height: 100,
    lineHeight: 100,
    textAlign: 'center',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.accent.peacock,
    overflow: 'hidden',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  successMessage: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emailHighlight: {
    fontSize: 16,
    color: colors.primary.saffron,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  instructionText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  formCard: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    shadowColor: colors.gold.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    marginBottom: spacing.lg,
    backgroundColor: colors.background.cream,
  },
  button: {
    borderRadius: borderRadius.md,
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
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    color: colors.primary.saffron,
    fontSize: 14,
    fontWeight: '500',
  },
});
