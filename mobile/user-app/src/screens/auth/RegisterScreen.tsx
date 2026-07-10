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
import { useAuth } from '../../context/AuthContext';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';

export function RegisterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, googleLogin } = useAuth();
  const { t } = useTranslation();

  const { signIn: googleSignIn } = useGoogleSignIn(
    async (idToken) => {
      setGoogleLoading(true);
      try {
        await googleLogin(idToken);
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } catch (error: any) {
        Alert.alert(
          t('auth.registerFlow.errors.failedTitle'),
          error?.response?.data?.message || t('common.networkError')
        );
      } finally {
        setGoogleLoading(false);
      }
    },
    (message) => Alert.alert(t('auth.registerFlow.errors.failedTitle'), message)
  );

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.registerFlow.errors.fillRequired'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.registerFlow.errors.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.registerFlow.errors.passwordMin'));
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      // Registration logs the user in; dismiss the auth modal (and any
      // onboarding screens beneath it) by resetting the stack to the app home.
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message;
      const isUnreachable = error?.isApiUnavailable || !error?.response;
      Alert.alert(
        t('auth.registerFlow.errors.failedTitle'),
        backendMessage ||
          (isUnreachable
            ? t('common.networkError')
            : t('auth.registerFlow.errors.failedMessage'))
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Om Symbol Header */}
        <View style={styles.header}>
          <Text style={styles.omSymbol}>ॐ</Text>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>{t('auth.registerFlow.subtitle')}</Text>
        </View>

        {/* Register Form */}
        <View style={styles.formCard}>
          <TextInput
            label={t('auth.registerFlow.fullNameRequired')}
            value={name}
            onChangeText={setName}
            mode="outlined"
            autoCapitalize="words"
            outlineColor={colors.border.gold as string}
            activeOutlineColor={colors.gold.main}
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label={t('auth.registerFlow.emailRequired')}
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

          <TextInput
            label={t('auth.registerFlow.phoneOptional')}
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            outlineColor={colors.border.gold as string}
            activeOutlineColor={colors.gold.main}
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
          />

          <TextInput
            label={t('auth.registerFlow.passwordRequired')}
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
            left={<TextInput.Icon icon="lock" />}
            outlineColor={colors.border.gold as string}
            activeOutlineColor={colors.gold.main}
            style={styles.input}
          />

          <TextInput
            label={t('auth.registerFlow.confirmPasswordRequired')}
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
            left={<TextInput.Icon icon="lock-check" />}
            outlineColor={colors.border.gold as string}
            activeOutlineColor={colors.gold.main}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            buttonColor={colors.primary.saffron}
            textColor={colors.text.white}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
          >
            {t('auth.createAccount')}
          </Button>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('common.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            mode="outlined"
            onPress={googleSignIn}
            loading={googleLoading}
            disabled={googleLoading}
            textColor={colors.primary.maroon}
            style={styles.googleButton}
            contentStyle={styles.buttonContent}
            icon="google"
          >
            {t('auth.continueWithGoogle')}
          </Button>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
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
    fontSize: 15,
    color: colors.text.secondary,
    fontStyle: 'italic',
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
    marginBottom: spacing.md,
    backgroundColor: colors.background.cream,
  },
  registerButton: {
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.gold as string,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    color: colors.text.secondary,
    fontSize: 14,
  },
  googleButton: {
    borderRadius: borderRadius.md,
    borderColor: colors.primary.maroon,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary.saffron,
    fontSize: 14,
    fontWeight: '600',
  },
});
