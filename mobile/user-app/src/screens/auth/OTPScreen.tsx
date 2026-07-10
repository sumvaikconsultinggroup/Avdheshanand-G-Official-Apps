import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export function OTPScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const email = route?.params?.email || '';
  const purpose = route?.params?.purpose || 'register';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const { verifyOtp, generateOtp } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert(t('common.error'), t('auth.otp.errors.enterCompleteCode'));
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, otpString);
      Alert.alert(t('auth.otp.successTitle'), t('auth.otp.successMessage'), [
        {
          text: t('donate.alerts.ok'),
          onPress: () =>
            purpose === 'reset'
              ? navigation.navigate('ResetPassword', { email })
              : navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        t('auth.otp.failedTitle'),
        error.response?.data?.message || t('auth.otp.errors.invalidOtp')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await generateOtp(email);
      setResendTimer(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      Alert.alert(t('auth.otp.successTitle'), t('auth.otp.newOtpSent'));
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('auth.otp.errors.resendFailed')
      );
    }
  };

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
          <Text style={styles.title}>{t('auth.otpTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.otp.sentCodeTo')}
          </Text>
          <Text style={styles.emailText}>{email || t('auth.otp.yourEmail')}</Text>
        </View>

        {/* OTP Form */}
        <View style={styles.formCard}>
          <Text style={styles.otpLabel}>{t('auth.otp.enterCode')}</Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <RNTextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <Button
            mode="contained"
            onPress={handleVerify}
            loading={loading}
            disabled={loading || otp.join('').length !== 6}
            buttonColor={colors.primary.saffron}
            textColor={colors.text.white}
            style={styles.verifyButton}
            contentStyle={styles.buttonContent}
          >
            {t('auth.verifyOtp')}
          </Button>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>{t('auth.otp.didNotReceiveCode')} </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>{t('auth.resendOtp')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                {t('auth.otp.resendIn', { seconds: resendTimer })}
              </Text>
            )}
          </View>
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
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 15,
    color: colors.primary.saffron,
    fontWeight: '600',
    marginTop: spacing.xs,
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
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.cream,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  otpInputFilled: {
    borderColor: colors.gold.main,
    backgroundColor: colors.background.warmWhite,
  },
  verifyButton: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  resendLink: {
    color: colors.primary.saffron,
    fontSize: 14,
    fontWeight: '600',
  },
  timerText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
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
