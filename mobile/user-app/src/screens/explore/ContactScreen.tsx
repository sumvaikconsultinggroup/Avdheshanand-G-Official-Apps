import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { FloatingInput } from '../../components/common';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const contactInfo = {
  address: 'Harihar Ashram, Kankhal\nHaridwar, Uttarakhand, India',
  phone: '+91 94101 60022',
  email: 'office@avdheshanandg.org',
  website: 'www.avdheshanandg.org',
};

export function ContactScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const routeParams = route.params || {};
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: routeParams.prefillSubject || 'General Message',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('contact.errors.nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('contact.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('contact.errors.emailValid');
    }

    if (!routeParams.prefillSubject && !formData.subject.trim()) {
      newErrors.subject = t('contact.errors.subjectRequired');
    }

    if (!formData.message.trim()) {
      newErrors.message = t('contact.errors.messageRequired');
    } else if (formData.message.trim().length < 10) {
      newErrors.message = t('contact.errors.messageMin');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await api.post('/connect', {
        fullName: formData.name,
        email: formData.email,
        subject: formData.subject || routeParams.prefillSubject || 'General Message',
        message: formData.message,
      });

      Alert.alert(
        t('contact.successTitle'),
        t('contact.successMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              setFormData({
                name: '',
                email: '',
                subject: routeParams.prefillSubject || 'General Message',
                message: '',
              });
            },
          },
        ]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || t('contact.errors.submitFailed');
      Alert.alert(t('contact.submissionFailedTitle'), message);
    } finally {
      setSubmitting(false);
    }
  };

  const openLink = async (type: 'phone' | 'email' | 'website') => {
    let url = '';
    switch (type) {
      case 'phone':
        url = `tel:${contactInfo.phone.replace(/\s/g, '')}`;
        break;
      case 'email':
        url = `mailto:${contactInfo.email}`;
        break;
      case 'website':
        url = `https://${contactInfo.website}`;
        break;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const renderInput = (
    field: keyof FormData,
    label: string,
    placeholder: string,
    icon: React.ComponentProps<typeof Icon>['name'],
    options?: {
      multiline?: boolean;
      keyboardType?: 'email-address' | 'default';
    }
  ) => {
    return (
      <FloatingInput
        label={`${label} *`}
        value={formData[field]}
        onChangeText={(value) => updateField(field, value)}
        error={errors[field]}
        leftIcon={icon}
        placeholder={placeholder}
        keyboardType={options?.keyboardType}
        multiline={options?.multiline}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.primary.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{routeParams.titleOverride || t('contact.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <View style={styles.introSection}>
            <View style={styles.iconCircle}>
              <Icon name="email-heart-outline" size={40} color={colors.primary.saffron} />
            </View>
            <Text style={styles.introTitle}>{routeParams.introTitleOverride || t('contact.introTitle')}</Text>
            <Text style={styles.introText}>{routeParams.introTextOverride || t('contact.introText')}</Text>
          </View>

          {/* Contact Info Cards */}
          <View style={styles.contactCards}>
            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => openLink('phone')}
            >
              <View style={styles.contactCardIcon}>
                <Icon name="phone" size={24} color={colors.primary.saffron} />
              </View>
              <View style={styles.contactCardContent}>
                <Text style={styles.contactCardLabel}>{t('contact.phone')}</Text>
                <Text style={styles.contactCardValue}>{contactInfo.phone}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => openLink('email')}
            >
              <View style={styles.contactCardIcon}>
                <Icon name="email" size={24} color={colors.primary.saffron} />
              </View>
              <View style={styles.contactCardContent}>
                <Text style={styles.contactCardLabel}>{t('contact.email')}</Text>
                <Text style={styles.contactCardValue}>{contactInfo.email}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={styles.contactCard}>
              <View style={styles.contactCardIcon}>
                <Icon name="map-marker" size={24} color={colors.primary.saffron} />
              </View>
              <View style={styles.contactCardContent}>
                <Text style={styles.contactCardLabel}>{t('contact.address')}</Text>
                <Text style={styles.contactCardValue}>{contactInfo.address}</Text>
              </View>
            </View>
          </View>

          {/* Contact Form */}
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <View style={styles.goldAccent} />
              <Text style={styles.formTitle}>{t('contact.formTitle')}</Text>
            </View>

            {renderInput('name', t('contact.yourName'), t('contact.placeholders.name'), 'account')}

            {renderInput('email', t('contact.emailAddress'), t('contact.placeholders.email'), 'email', {
              keyboardType: 'email-address',
            })}

            {!routeParams.prefillSubject
              ? renderInput('subject', t('contact.subject'), t('contact.placeholders.subject'), 'tag-outline')
              : null}

            {renderInput(
              'message',
              t('contact.yourMessage'),
              routeParams.messagePlaceholder || t('contact.placeholders.message'),
              'message-text',
              { multiline: true }
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <LinearGradient
                colors={[colors.primary.saffron, colors.primary.vermillion]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <>
                    <Icon name="send" size={20} color={colors.text.white} />
                    <Text style={styles.submitButtonText}>{t('contact.sendMessage')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ॐ सर्वे भवन्तु सुखिनः
            </Text>
            <Text style={styles.footerSubtext}>
              {t('contact.footerSubtext')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.cream,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gold.main,
    marginBottom: spacing.md,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
  },
  introText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  contactCards: {
    marginBottom: spacing.lg,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  contactCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contactCardContent: {
    flex: 1,
  },
  contactCardLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  contactCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  formSection: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.warm,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  goldAccent: {
    width: 4,
    height: 24,
    backgroundColor: colors.gold.main,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.maroon,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  requiredStar: {
    color: colors.primary.vermillion,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.parchment,
    paddingHorizontal: spacing.md,
  },
  inputWrapperError: {
    borderColor: colors.primary.vermillion,
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 120,
  },
  errorText: {
    fontSize: 12,
    color: colors.primary.vermillion,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.warm,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.white,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  footerText: {
    fontSize: 20,
    color: colors.gold.main,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
