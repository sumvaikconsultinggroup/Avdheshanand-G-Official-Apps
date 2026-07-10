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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { FloatingInput } from '../../components/common';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type OccupationType = 'student' | 'employed' | 'self-employed' | 'unemployed' | 'retired';

interface FormData {
  name: string;
  email: string;
  phone: string;
  age: string;
  occupationType: OccupationType | '';
  occupation: string;
  city: string;
  state: string;
  country: string;
  skills: string;
  availability: string[];
  motivation: string;
  consent: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  age?: string;
  occupationType?: string;
  occupation?: string;
  skills?: string;
  availability?: string;
  motivation?: string;
  consent?: string;
}

const occupationOptions: { value: OccupationType; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'employed', label: 'Employed' },
  { value: 'self-employed', label: 'Self-employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
];

const availabilityOptions = ['Weekdays', 'Weekends', 'Mornings', 'Evenings', 'Flexible'];

// Occupation detail is needed unless the type already implies no current job.
const occupationNeedsDetail = (type: OccupationType | '') =>
  type === 'employed' || type === 'self-employed';

export function VolunteerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    age: '',
    occupationType: '',
    occupation: '',
    city: '',
    state: '',
    country: '',
    skills: '',
    availability: [],
    motivation: '',
    consent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof FormData, value: string | string[] | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleAvailability = (option: string) => {
    setFormData((prev) => {
      const exists = prev.availability.includes(option);
      return {
        ...prev,
        availability: exists
          ? prev.availability.filter((a) => a !== option)
          : [...prev.availability, option],
      };
    });
    if (errors.availability) setErrors((prev) => ({ ...prev, availability: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    const age = Number(formData.age);
    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else if (!Number.isFinite(age) || age < 18 || age > 100) {
      newErrors.age = 'Age must be between 18 and 100';
    }

    if (!formData.occupationType) {
      newErrors.occupationType = 'Please select your occupation type';
    } else if (occupationNeedsDetail(formData.occupationType) && !formData.occupation.trim()) {
      newErrors.occupation = 'Please mention your occupation';
    }

    if (formData.availability.length === 0) {
      newErrors.availability = 'Select at least one availability';
    }

    if (!formData.skills.trim()) {
      newErrors.skills = 'Please list at least one skill';
    }

    if (!formData.motivation.trim()) {
      newErrors.motivation = 'Please share why you wish to volunteer';
    } else if (formData.motivation.trim().length < 50) {
      newErrors.motivation = `Please write at least 50 characters (${formData.motivation.trim().length}/50)`;
    }

    if (!formData.consent) {
      newErrors.consent = 'Please provide consent to proceed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        age: Number(formData.age),
        occupationType: formData.occupationType,
        occupation: formData.occupation.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || undefined,
        skills: formData.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        availability: formData.availability,
        motivation: formData.motivation.trim(),
        consent: formData.consent,
      };

      await api.post('/volunteer', payload);

      Alert.alert(
        'Registration Successful',
        'Thank you for your generous heart! Your volunteer registration has been received. The Ashram team will reach out to you about the next steps.\n\nॐ सर्वे भवन्तु सुखिनः\n(May all beings be happy)',
        [{ text: 'Hari Om', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit registration';
      Alert.alert('Submission Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderInput = (
    field: keyof FormData,
    label: string,
    placeholder: string,
    icon: React.ComponentProps<typeof Icon>['name'],
    options?: {
      multiline?: boolean;
      keyboardType?: 'email-address' | 'phone-pad' | 'number-pad' | 'default';
      required?: boolean;
      maxLength?: number;
    }
  ) => {
    return (
      <FloatingInput
        label={options?.required ? `${label} *` : label}
        value={String(formData[field] ?? '')}
        onChangeText={(value) => updateField(field, value)}
        error={errors[field as keyof FormErrors]}
        leftIcon={icon}
        placeholder={placeholder}
        keyboardType={options?.keyboardType}
        multiline={options?.multiline}
        maxLength={options?.maxLength}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.primary.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volunteer Registration</Text>
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
          <View style={styles.introSection}>
            <View style={styles.iconCircle}>
              <Icon name="hand-heart" size={40} color={colors.primary.saffron} />
            </View>
            <Text style={styles.introTitle}>Join Our Seva Family</Text>
            <Text style={styles.introText}>
              Service to others is the highest form of devotion. Join us in spreading light and love.
            </Text>
          </View>

          <View style={styles.formSection}>
            {renderInput('name', 'Full Name', 'Enter your name', 'account', { required: true })}
            {renderInput('email', 'Email Address', 'your@email.com', 'email', {
              required: true,
              keyboardType: 'email-address',
            })}
            {renderInput('phone', 'Phone Number', '10-digit mobile number', 'phone', {
              required: true,
              keyboardType: 'phone-pad',
            })}
            {renderInput('age', 'Age', 'Your age (18+)', 'cake-variant-outline', {
              required: true,
              keyboardType: 'number-pad',
              maxLength: 3,
            })}

            {/* Occupation type */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Icon name="briefcase-outline" size={18} color={colors.gold.dark} />
                <Text style={styles.inputLabel}>
                  Occupation Type<Text style={styles.requiredStar}>*</Text>
                </Text>
              </View>
              <View style={styles.chipRow}>
                {occupationOptions.map((option) => {
                  const selected = formData.occupationType === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => updateField('occupationType', option.value)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.occupationType ? <Text style={styles.errorText}>{errors.occupationType}</Text> : null}
            </View>

            {occupationNeedsDetail(formData.occupationType)
              ? renderInput('occupation', 'Occupation', 'e.g., Teacher, Engineer', 'account-tie', {
                  required: true,
                })
              : null}

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>{renderInput('city', 'City', 'Your city', 'city')}</View>
              <View style={styles.halfInput}>{renderInput('state', 'State', 'Your state', 'map-marker')}</View>
            </View>
            {renderInput('country', 'Country', 'Your country', 'earth')}

            {renderInput('skills', 'Skills', 'e.g., Teaching, Event Management, IT', 'account-cog', {
              required: true,
            })}

            {/* Availability multi-select */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Icon name="clock-outline" size={18} color={colors.gold.dark} />
                <Text style={styles.inputLabel}>
                  Availability<Text style={styles.requiredStar}>*</Text>
                </Text>
              </View>
              <View style={styles.chipRow}>
                {availabilityOptions.map((option) => {
                  const selected = formData.availability.includes(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleAvailability(option)}
                      activeOpacity={0.85}
                    >
                      {selected ? (
                        <Icon name="check" size={14} color={colors.text.white} />
                      ) : null}
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.availability ? <Text style={styles.errorText}>{errors.availability}</Text> : null}
            </View>

            {renderInput(
              'motivation',
              'Why do you wish to volunteer?',
              'Share your motivation in at least 50 characters...',
              'message-text',
              { multiline: true, required: true }
            )}

            {/* Consent */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => updateField('consent', !formData.consent)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, formData.consent && styles.checkboxChecked]}>
                {formData.consent ? <Icon name="check" size={16} color={colors.text.white} /> : null}
              </View>
              <Text style={styles.consentText}>
                I consent to the Ashram storing my details and contacting me about volunteering.
              </Text>
            </TouchableOpacity>
            {errors.consent ? <Text style={styles.errorText}>{errors.consent}</Text> : null}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
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
                  <Text style={styles.submitButtonText}>Submit Registration</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footerQuote}>
            <Text style={styles.quoteText}>
              "The best way to find yourself is to lose yourself in the service of others."
            </Text>
            <Text style={styles.quoteAuthor}>- Mahatma Gandhi</Text>
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
    marginBottom: spacing.xl,
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
    paddingHorizontal: spacing.lg,
  },
  formSection: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.warm,
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
    minHeight: 100,
  },
  errorText: {
    fontSize: 12,
    color: colors.primary.vermillion,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
  },
  chipSelected: {
    backgroundColor: colors.primary.maroon,
    borderColor: colors.primary.maroon,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.maroon,
  },
  chipTextSelected: {
    color: colors.text.white,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.gold.dark,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.parchment,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.saffron,
    borderColor: colors.primary.saffron,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  submitButton: {
    marginTop: spacing.lg,
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
  footerQuote: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
  },
  quoteText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: 12,
    color: colors.gold.dark,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
});
