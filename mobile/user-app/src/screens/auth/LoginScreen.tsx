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

export function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const { t } = useTranslation();

  const { signIn: googleSignIn } = useGoogleSignIn(
    async (idToken) => {
      setGoogleLoading(true);
      try {
        await googleLogin(idToken);
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } catch (error: any) {
        Alert.alert(
          t('auth.errors.loginFailedTitle'),
          error?.response?.data?.message || t('common.networkError')
        );
      } finally {
        setGoogleLoading(false);
      }
    },
    (message) => Alert.alert(t('auth.errors.loginFailedTitle'), message)
  );

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.errors.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Dismiss the login modal (and any onboarding screens beneath it) by
      // resetting the stack to the app home now that the user is authenticated.
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message;
      const isUnreachable = error?.isApiUnavailable || !error?.response;
      Alert.alert(
        t('auth.errors.loginFailedTitle'),
        backendMessage ||
          (isUnreachable
            ? t('common.networkError')
            : t('auth.errors.invalidCredentials'))
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
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('auth.spiritualGreeting')}</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formCard}>
          <TextInput
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            outlineColor={colors.border.gold as string}
            activeOutlineColor={colors.gold.main}
            style={styles.input}
          />
          <TextInput
            label={t('auth.password')}
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

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            accessibilityRole="button"
            accessibilityLabel={t('auth.forgotPassword')}
          >
            <Text style={styles.forgotPassword}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            buttonColor={colors.primary.saffron}
            textColor={colors.text.white}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
          >
            {t('auth.signIn')}
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

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>{t('auth.noAccount')} </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
            accessibilityLabel={t('auth.register')}
          >
            <Text style={styles.registerLink}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>

        {/* Skip Link for browsing without auth */}
        <TouchableOpacity
          style={styles.skipContainer}
          onPress={() => navigation.navigate('Main')}
          accessibilityRole="button"
          accessibilityLabel={t('auth.browseWithoutSignIn')}
        >
          <Text style={styles.skipText}>{t('auth.browseWithoutSignIn')}</Text>
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
    fontSize: 64,
    color: colors.gold.main,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
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
  forgotPassword: {
    textAlign: 'right',
    color: colors.primary.saffron,
    marginBottom: spacing.lg,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: borderRadius.md,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  registerLink: {
    color: colors.primary.saffron,
    fontSize: 14,
    fontWeight: '600',
  },
  skipContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
