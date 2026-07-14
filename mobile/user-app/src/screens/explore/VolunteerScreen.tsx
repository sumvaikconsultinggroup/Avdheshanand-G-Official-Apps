import React, { useState, useMemo, useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { FloatingInput } from '../../components/common';
import { spacing, borderRadius, shadows, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

/** Animated selectable chip — smooth fill + spring "pop" on selection. */
function OptionChip({
  label,
  icon,
  selected,
  onPress,
  showCheck,
  colors,
  styles,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Icon>['name'];
  selected: boolean;
  onPress: () => void;
  showCheck?: boolean;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  const progress = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 190 });
    scale.value = withSequence(
      withTiming(selected ? 1.06 : 0.97, { duration: 110 }),
      withSpring(1, { damping: 12, stiffness: 160 })
    );
  }, [selected, progress, scale]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.background.parchment, colors.primary.maroon]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [String(colors.border.gold), colors.primary.maroon]
    ),
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity style={styles.chipTouchable} onPress={onPress} activeOpacity={0.9}>
      <Animated.View style={[styles.chip, animStyle]}>
        {selected && showCheck ? (
          <Icon name="check-circle" size={16} color={colors.text.white} />
        ) : icon ? (
          <Icon name={icon} size={16} color={selected ? colors.text.white : colors.primary.maroon} />
        ) : null}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

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

const occupationOptions: {
  value: OccupationType;
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
}[] = [
  { value: 'student', label: 'Student', icon: 'school-outline' },
  { value: 'employed', label: 'Employed', icon: 'briefcase-outline' },
  { value: 'self-employed', label: 'Self-employed', icon: 'store-outline' },
  { value: 'unemployed', label: 'Unemployed', icon: 'account-search-outline' },
  { value: 'retired', label: 'Retired', icon: 'account-clock-outline' },
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
    let next = value;
    // Phone: digits only, hard-capped at 10 so it can never exceed while typing.
    if (field === 'phone' && typeof value === 'string') {
      next = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'age' && typeof value === 'string') {
      next = value.replace(/\D/g, '').slice(0, 3);
    }
    setFormData((prev) => ({ ...prev, [field]: next }));
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
    } else if (phoneDigits.length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
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
            <LinearGradient
              colors={[colors.gold.main, colors.primary.vermillion, colors.primary.maroon]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.iconCircle}
            >
              <Icon name="hand-heart" size={40} color={colors.text.white} />
            </LinearGradient>
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
              maxLength: 10,
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
                {occupationOptions.map((option) => (
                  <OptionChip
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    selected={formData.occupationType === option.value}
                    onPress={() => updateField('occupationType', option.value)}
                    colors={colors}
                    styles={styles}
                  />
                ))}
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
                {availabilityOptions.map((option) => (
                  <OptionChip
                    key={option}
                    label={option}
                    selected={formData.availability.includes(option)}
                    onPress={() => toggleAvailability(option)}
                    showCheck
                    colors={colors}
                    styles={styles}
                  />
                ))}
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
              colors={[colors.primary.maroon, colors.primary.deepRed]}
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
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.warm,
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
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  chipTouchable: {
    width: '48%',
    marginBottom: spacing.sm + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '700',
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
