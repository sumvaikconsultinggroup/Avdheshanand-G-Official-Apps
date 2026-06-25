import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

type Gender = 'Male' | 'Female' | 'Other';
type UploadField = 'aadhaarDocument' | 'passportDocument' | 'recentPhoto';

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
}

interface FormDataState {
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality: string;
  mobileNumber: string;
  email: string;
  whatsappNumber: string;
  aadhaarNumber: string;
  passportNumber: string;
  spiritualIntent: string;
  spiritualPath: string;
  previousDiksha: string;
}

interface FormErrors {
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  mobileNumber?: string;
  email?: string;
  aadhaarNumber?: string;
  passportNumber?: string;
  spiritualIntent?: string;
  aadhaarDocument?: string;
  passportDocument?: string;
  recentPhoto?: string;
}

const INITIAL_FORM: FormDataState = {
  fullName: '',
  dateOfBirth: '',
  gender: 'Male',
  nationality: 'Indian',
  mobileNumber: '',
  email: '',
  whatsappNumber: '',
  aadhaarNumber: '',
  passportNumber: '',
  spiritualIntent: '',
  spiritualPath: '',
  previousDiksha: '',
};

const GENDER_OPTIONS: Gender[] = ['Male', 'Female', 'Other'];

export function MantraDikshaScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isHindi = (i18n.resolvedLanguage || i18n.language || 'en').startsWith('hi');

  const copy = useMemo(
    () =>
      isHindi
        ? {
            title: 'मंत्र दीक्षा',
            subtitle: 'मोबाइल से सीधे पंजीकरण करें। आपका आवेदन वेब और मोबाइल एडमिन पैनल दोनों में दिखेगा।',
            inPersonOnly: 'दीक्षा केवल व्यक्तिगत उपस्थिति में दी जाती है। पंजीकरण अनुमोदन की गारंटी नहीं है।',
            personalDetails: 'व्यक्तिगत विवरण',
            spiritualDetails: 'आध्यात्मिक विवरण',
            documents: 'दस्तावेज़ अपलोड',
            uploadHint: 'फोटो या स्कैन दोनों मान्य हैं।',
            fullName: 'पूरा नाम',
            dob: 'जन्म तिथि',
            dobPlaceholder: 'YYYY-MM-DD',
            gender: 'लिंग',
            nationality: 'राष्ट्रीयता',
            mobile: 'मोबाइल नंबर',
            email: 'ईमेल',
            whatsapp: 'व्हाट्सऐप नंबर',
            aadhaar: 'आधार नंबर',
            passport: 'पासपोर्ट नंबर',
            spiritualIntent: 'दीक्षा लेने का आध्यात्मिक भाव',
            spiritualPath: 'अब तक की साधना / आध्यात्मिक पथ',
            previousDiksha: 'पूर्व दीक्षा या आध्यात्मिक परंपरा',
            aadhaarDocument: 'आधार दस्तावेज़',
            passportDocument: 'पासपोर्ट दस्तावेज़',
            recentPhoto: 'हाल का फोटो',
            pickImage: 'गैलरी से चुनें',
            changeImage: 'बदलें',
            removeImage: 'हटाएं',
            indian: 'भारतीय',
            international: 'अंतरराष्ट्रीय',
            submit: 'पंजीकरण भेजें',
            submitting: 'भेजा जा रहा है...',
            successTitle: 'पंजीकरण सफल',
            successMessage: 'आपका मंत्र दीक्षा आवेदन सफलतापूर्वक भेज दिया गया है। अब यह वेब और मोबाइल एडमिन पैनल दोनों में समीक्षा के लिए उपलब्ध है।',
            validationRequired: 'यह फ़ील्ड आवश्यक है',
            validationEmail: 'कृपया सही ईमेल दर्ज करें',
            validationPhone: 'कृपया सही मोबाइल नंबर दर्ज करें',
            validationDob: 'जन्म तिथि YYYY-MM-DD प्रारूप में दर्ज करें',
            validationDobPast: 'जन्म तिथि भविष्य की नहीं हो सकती',
            validationAadhaar: 'कृपया 12 अंकों का आधार नंबर दर्ज करें',
            validationPassport: 'कृपया पासपोर्ट नंबर दर्ज करें',
            validationIntent: 'कृपया कम से कम 20 अक्षरों में अपना भाव लिखें',
            validationDocument: 'यह दस्तावेज़ आवश्यक है',
            uploadPermission: 'मीडिया लाइब्रेरी की अनुमति आवश्यक है',
            uploadFailed: 'दस्तावेज़ चुनने में समस्या हुई',
            submitFailed: 'पंजीकरण भेजने में समस्या हुई',
          }
        : {
            title: 'Mantra Diksha',
            subtitle: 'Register directly from mobile. Your application will sync with both the web and mobile admin panels.',
            inPersonOnly: 'Diksha is offered only in person. Registration does not guarantee approval.',
            personalDetails: 'Personal Details',
            spiritualDetails: 'Spiritual Details',
            documents: 'Document Uploads',
            uploadHint: 'Photos or scans are both accepted.',
            fullName: 'Full Name',
            dob: 'Date of Birth',
            dobPlaceholder: 'YYYY-MM-DD',
            gender: 'Gender',
            nationality: 'Nationality',
            mobile: 'Mobile Number',
            email: 'Email Address',
            whatsapp: 'WhatsApp Number',
            aadhaar: 'Aadhaar Number',
            passport: 'Passport Number',
            spiritualIntent: 'Spiritual Intent for Seeking Diksha',
            spiritualPath: 'Current Spiritual Path / Practice',
            previousDiksha: 'Previous Diksha or Spiritual Lineage',
            aadhaarDocument: 'Aadhaar Document',
            passportDocument: 'Passport Document',
            recentPhoto: 'Recent Photo',
            pickImage: 'Choose from Gallery',
            changeImage: 'Change',
            removeImage: 'Remove',
            indian: 'Indian',
            international: 'International',
            submit: 'Submit Registration',
            submitting: 'Submitting...',
            successTitle: 'Registration Submitted',
            successMessage: 'Your Mantra Diksha application has been submitted successfully and is now visible in both the web and mobile admin panels for review.',
            validationRequired: 'This field is required',
            validationEmail: 'Please enter a valid email address',
            validationPhone: 'Please enter a valid mobile number',
            validationDob: 'Use YYYY-MM-DD format',
            validationDobPast: 'Date of birth cannot be in the future',
            validationAadhaar: 'Please enter a valid 12-digit Aadhaar number',
            validationPassport: 'Please enter your passport number',
            validationIntent: 'Please share at least 20 characters about your spiritual intent',
            validationDocument: 'This document is required',
            uploadPermission: 'Media library access is required to upload documents',
            uploadFailed: 'Unable to select file',
            submitFailed: 'Unable to submit registration',
          },
    [isHindi]
  );

  const [formData, setFormData] = useState<FormDataState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<Record<UploadField, SelectedFile | null>>({
    aadhaarDocument: null,
    passportDocument: null,
    recentPhoto: null,
  });

  const isIndian = formData.nationality.trim().toLowerCase().includes('india');

  const updateField = (field: keyof FormDataState, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const setNationalityMode = (mode: 'Indian' | 'International') => {
    setFormData((current) => ({
      ...current,
      nationality: mode === 'Indian' ? 'Indian' : current.nationality === 'Indian' ? 'International' : current.nationality,
      aadhaarNumber: mode === 'Indian' ? current.aadhaarNumber : '',
      passportNumber: mode === 'Indian' ? '' : current.passportNumber,
    }));
    setFiles((current) => ({
      ...current,
      aadhaarDocument: mode === 'Indian' ? current.aadhaarDocument : null,
      passportDocument: mode === 'Indian' ? null : current.passportDocument,
    }));
    setErrors((current) => ({
      ...current,
      aadhaarNumber: undefined,
      passportNumber: undefined,
      aadhaarDocument: undefined,
      passportDocument: undefined,
    }));
  };

  const pickImage = async (field: UploadField) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(copy.uploadFailed, copy.uploadPermission);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileName = asset.fileName || `${field}-${Date.now()}.jpg`;
      const fileType = asset.mimeType || 'image/jpeg';

      setFiles((current) => ({
        ...current,
        [field]: {
          uri: asset.uri,
          name: fileName,
          type: fileType,
        },
      }));

      if (errors[field]) {
        setErrors((current) => ({ ...current, [field]: undefined }));
      }
    } catch (error) {
      Alert.alert(copy.uploadFailed, copy.uploadFailed);
    }
  };

  const removeFile = (field: UploadField) => {
    setFiles((current) => ({ ...current, [field]: null }));
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!formData.fullName.trim()) nextErrors.fullName = copy.validationRequired;

    const dob = formData.dateOfBirth.trim();
    if (!dob) {
      nextErrors.dateOfBirth = copy.validationRequired;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      nextErrors.dateOfBirth = copy.validationDob;
    } else {
      const parsed = new Date(`${dob}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        nextErrors.dateOfBirth = copy.validationDob;
      } else if (parsed > new Date()) {
        nextErrors.dateOfBirth = copy.validationDobPast;
      }
    }

    if (!formData.nationality.trim()) nextErrors.nationality = copy.validationRequired;

    if (!formData.mobileNumber.trim()) {
      nextErrors.mobileNumber = copy.validationRequired;
    } else if (!/^\+?[\d\s\-()]{10,}$/.test(formData.mobileNumber.trim())) {
      nextErrors.mobileNumber = copy.validationPhone;
    }

    if (!formData.email.trim()) {
      nextErrors.email = copy.validationRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = copy.validationEmail;
    }

    if (!formData.spiritualIntent.trim()) {
      nextErrors.spiritualIntent = copy.validationRequired;
    } else if (formData.spiritualIntent.trim().length < 20) {
      nextErrors.spiritualIntent = copy.validationIntent;
    }

    if (isIndian) {
      if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\D/g, ''))) {
        nextErrors.aadhaarNumber = copy.validationAadhaar;
      }
      if (!files.aadhaarDocument) {
        nextErrors.aadhaarDocument = copy.validationDocument;
      }
    } else {
      if (!formData.passportNumber.trim()) {
        nextErrors.passportNumber = copy.validationPassport;
      }
      if (!files.passportDocument) {
        nextErrors.passportDocument = copy.validationDocument;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = new FormData();
      payload.append('fullName', formData.fullName.trim());
      payload.append('dateOfBirth', formData.dateOfBirth.trim());
      payload.append('gender', formData.gender);
      payload.append('nationality', formData.nationality.trim());
      payload.append('mobileNumber', formData.mobileNumber.trim());
      payload.append('email', formData.email.trim());

      if (formData.whatsappNumber.trim()) payload.append('whatsappNumber', formData.whatsappNumber.trim());
      if (formData.spiritualIntent.trim()) payload.append('spiritualIntent', formData.spiritualIntent.trim());
      if (formData.spiritualPath.trim()) payload.append('spiritualPath', formData.spiritualPath.trim());
      if (formData.previousDiksha.trim()) payload.append('previousDiksha', formData.previousDiksha.trim());

      if (isIndian) {
        payload.append('aadhaarNumber', formData.aadhaarNumber.replace(/\D/g, ''));
        if (files.aadhaarDocument) {
          payload.append('aadhaarDocument', files.aadhaarDocument as any);
        }
      } else {
        payload.append('passportNumber', formData.passportNumber.trim());
        if (files.passportDocument) {
          payload.append('passportDocument', files.passportDocument as any);
        }
      }

      if (files.recentPhoto) {
        payload.append('recentPhoto', files.recentPhoto as any);
      }

      await api.post('/mantra-diksha', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFormData(INITIAL_FORM);
      setFiles({
        aadhaarDocument: null,
        passportDocument: null,
        recentPhoto: null,
      });
      setErrors({});

      Alert.alert(copy.successTitle, copy.successMessage, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error || copy.submitFailed;
      Alert.alert(copy.submitFailed, message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderInput = (
    field: keyof FormDataState,
    label: string,
    options?: {
      placeholder?: string;
      multiline?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
    }
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, options?.multiline && styles.multilineInput]}
        placeholder={options?.placeholder}
        placeholderTextColor={colors.text.secondary}
        keyboardType={options?.keyboardType || 'default'}
        autoCapitalize={options?.autoCapitalize || 'sentences'}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 5 : 1}
        textAlignVertical={options?.multiline ? 'top' : 'center'}
        value={formData[field]}
        onChangeText={(value) => updateField(field, value)}
      />
      {errors[field as keyof FormErrors] ? <Text style={styles.errorText}>{errors[field as keyof FormErrors]}</Text> : null}
    </View>
  );

  const renderUploadCard = (field: UploadField, label: string, required: boolean) => {
    const selected = files[field];
    return (
      <View style={styles.uploadCard}>
        <View style={styles.uploadHeader}>
          <Text style={styles.uploadTitle}>
            {label}
            {required ? <Text style={styles.requiredStar}> *</Text> : null}
          </Text>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(field)} activeOpacity={0.85}>
            <Icon name={selected ? 'image-edit-outline' : 'image-plus-outline'} size={18} color={colors.text.white} />
            <Text style={styles.uploadButtonText}>{selected ? copy.changeImage : copy.pickImage}</Text>
          </TouchableOpacity>
        </View>

        {selected ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: selected.uri }} style={styles.previewImage} />
            <View style={styles.previewMeta}>
              <Text style={styles.previewName} numberOfLines={1}>{selected.name}</Text>
              <TouchableOpacity onPress={() => removeFile(field)} activeOpacity={0.8} style={styles.removeButton}>
                <Icon name="close-circle-outline" size={16} color={colors.primary.vermillion} />
                <Text style={styles.removeButtonText}>{copy.removeImage}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.uploadPlaceholder}>{copy.uploadHint}</Text>
        )}

        {errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="arrow-left" size={22} color={colors.primary.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Icon name="meditation" size={28} color={colors.primary.saffron} />
            </View>
            <Text style={styles.heroTitle}>{copy.title}</Text>
            <Text style={styles.heroSubtitle}>{copy.subtitle}</Text>
            <View style={styles.noticeBanner}>
              <Icon name="alert-circle-outline" size={16} color={colors.primary.vermillion} />
              <Text style={styles.noticeText}>{copy.inPersonOnly}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.personalDetails}</Text>
            {renderInput('fullName', copy.fullName, { placeholder: copy.fullName, autoCapitalize: 'words' })}
            {renderInput('dateOfBirth', copy.dob, { placeholder: copy.dobPlaceholder, autoCapitalize: 'none' })}

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{copy.gender}</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((option) => {
                  const selected = formData.gender === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                      onPress={() => setFormData((current) => ({ ...current, gender: option }))}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{copy.nationality}</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.choiceChip, isIndian && styles.choiceChipSelected]}
                  onPress={() => setNationalityMode('Indian')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.choiceChipText, isIndian && styles.choiceChipTextSelected]}>{copy.indian}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choiceChip, !isIndian && styles.choiceChipSelected]}
                  onPress={() => setNationalityMode('International')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.choiceChipText, !isIndian && styles.choiceChipTextSelected]}>{copy.international}</Text>
                </TouchableOpacity>
              </View>
              {renderInput('nationality', copy.nationality, {
                placeholder: isIndian ? 'Indian' : 'United States / Nepal / Other',
                autoCapitalize: 'words',
              })}
            </View>

            {renderInput('mobileNumber', copy.mobile, {
              placeholder: '+91 XXXXX XXXXX',
              keyboardType: 'phone-pad',
              autoCapitalize: 'none',
            })}
            {renderInput('email', copy.email, {
              placeholder: 'name@example.com',
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            })}
            {renderInput('whatsappNumber', copy.whatsapp, {
              placeholder: '+91 XXXXX XXXXX',
              keyboardType: 'phone-pad',
              autoCapitalize: 'none',
            })}

            {isIndian
              ? renderInput('aadhaarNumber', copy.aadhaar, {
                  placeholder: '123412341234',
                  keyboardType: 'phone-pad',
                  autoCapitalize: 'none',
                })
              : renderInput('passportNumber', copy.passport, {
                  placeholder: 'Passport Number',
                  autoCapitalize: 'characters',
                })}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.spiritualDetails}</Text>
            {renderInput('spiritualIntent', copy.spiritualIntent, {
              placeholder: copy.spiritualIntent,
              multiline: true,
            })}
            {renderInput('spiritualPath', copy.spiritualPath, {
              placeholder: copy.spiritualPath,
              multiline: true,
            })}
            {renderInput('previousDiksha', copy.previousDiksha, {
              placeholder: copy.previousDiksha,
              multiline: true,
            })}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.documents}</Text>
            <Text style={styles.sectionSubtitle}>{copy.uploadHint}</Text>
            {isIndian
              ? renderUploadCard('aadhaarDocument', copy.aadhaarDocument, true)
              : renderUploadCard('passportDocument', copy.passportDocument, true)}
            {renderUploadCard('recentPhoto', copy.recentPhoto, false)}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.88}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color={colors.text.white} />
                <Text style={styles.submitButtonText}>{copy.submitting}</Text>
              </>
            ) : (
              <>
                <Icon name="check-decagram-outline" size={18} color={colors.text.white} />
                <Text style={styles.submitButtonText}>{copy.submit}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background.warmWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold as string,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.parchment,
  },
  headerTitle: {
    ...typography.title,
    flex: 1,
    textAlign: 'center',
    color: colors.primary.maroon,
    marginHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.warm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.cream,
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.primary.maroon,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  noticeBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(227, 66, 52, 0.08)',
  },
  noticeText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.primary.deepRed,
  },
  sectionCard: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary.maroon,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  fieldBlock: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
  },
  requiredStar: {
    color: colors.primary.vermillion,
  },
  input: {
    minHeight: 50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
    paddingHorizontal: spacing.md,
    color: colors.text.primary,
    ...typography.body,
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: spacing.md,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.primary.vermillion,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  choiceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
  },
  choiceChipSelected: {
    backgroundColor: colors.primary.saffron,
    borderColor: colors.primary.saffron,
  },
  choiceChipText: {
    ...typography.bodySm,
    color: colors.primary.maroon,
    fontWeight: '600',
  },
  choiceChipTextSelected: {
    color: colors.text.white,
  },
  uploadCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadTitle: {
    ...typography.title,
    flex: 1,
    color: colors.primary.maroon,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.saffron,
  },
  uploadButtonText: {
    ...typography.bodySm,
    color: colors.text.white,
    fontWeight: '700',
  },
  uploadPlaceholder: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  previewWrap: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.sandstone,
  },
  previewMeta: {
    flex: 1,
    gap: spacing.sm,
  },
  previewName: {
    ...typography.bodySm,
    color: colors.text.primary,
    fontWeight: '600',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  removeButtonText: {
    ...typography.bodySm,
    color: colors.primary.vermillion,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
});
