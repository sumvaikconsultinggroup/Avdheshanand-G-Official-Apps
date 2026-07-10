import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nProvider';

const LOGO_SOURCE = require('../../../assets/images/avdheshanandg-mission-logo.png');

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (error: any) {
      Alert.alert(t('auth.loginFailed'), error.response?.data?.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.background.parchment, colors.background.cream, colors.background.sandstone]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* soft decorative glows */}
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand header ── */}
          <View style={styles.header}>
            <View style={styles.logoHalo}>
              <Image source={LOGO_SOURCE} resizeMode="contain" style={styles.logo} />
            </View>
            <Text style={styles.title}>{t('auth.title')}</Text>
            <View style={styles.subtitleWrap}>
              <View style={styles.subtitleRule} />
              <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
              <View style={styles.subtitleRule} />
            </View>
          </View>

          {/* ── Sign-in card ── */}
          <View style={styles.formCard}>
            <Text style={styles.formHeading}>{t('auth.signIn')}</Text>

            <TextInput
              label={t('auth.username')}
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="account-outline" color={colors.gold.dark} />}
              outlineColor={colors.border.gold as string}
              activeOutlineColor={colors.primary.maroon}
              style={styles.input}
            />
            <TextInput
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock-outline" color={colors.gold.dark} />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  color={colors.text.secondary}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              outlineColor={colors.border.gold as string}
              activeOutlineColor={colors.primary.maroon}
              style={styles.input}
            />

            {/* Gradient (maroon → deep red) Sign-In button */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleLogin}
              disabled={loading}
              style={styles.buttonWrap}
            >
              <LinearGradient
                colors={[colors.primary.maroon, colors.primary.deepRed]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, loading && styles.buttonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>ॐ  Swami Avdheshanand G  •  Admin</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },

  // decorative glows
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  glowTop: {
    top: -120,
    right: -100,
    backgroundColor: 'rgba(212,160,23,0.12)',
  },
  glowBottom: {
    bottom: -140,
    left: -110,
    backgroundColor: 'rgba(128,0,32,0.08)',
  },

  // header
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logoHalo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.border.gold as string,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.raised,
  },
  logo: {
    width: 112,
    height: 112,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary.maroon,
    letterSpacing: 0.3,
  },
  subtitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  subtitleRule: {
    width: 24,
    height: 1,
    backgroundColor: colors.gold.main,
    opacity: 0.6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // language
  languageSection: {
    marginBottom: spacing.lg,
    ...shadows.soft,
    borderRadius: borderRadius.lg,
  },

  // form
  formCard: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.raised,
  },
  formHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
  },
  buttonWrap: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.soft,
    shadowColor: colors.primary.maroon,
  },
  button: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: colors.text.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.text.secondary,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
