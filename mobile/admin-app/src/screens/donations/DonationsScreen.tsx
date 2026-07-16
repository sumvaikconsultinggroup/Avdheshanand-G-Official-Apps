import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  FAB,
  ActivityIndicator,
  ProgressBar,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, gradients, TAB_BAR_CLEARANCE } from '../../theme';
import { Badge, Avatar } from '../../components/common';
import api from '../../services/api';
import { DonationAnalytics, DonationCampaign, DonationRecord, LocalizedText } from '../../types';

type TabKey = 'campaigns' | 'records';
type AnalyticsRange = 'today' | '7d' | '30d' | 'custom';

const CONTENT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bangla' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'or', label: 'Odia' },
  { code: 'as', label: 'Assamese' },
] as const;

const createEmptyLocalizedText = (): LocalizedText =>
  CONTENT_LANGUAGES.reduce<LocalizedText>((acc, { code }) => {
    acc[code] = '';
    return acc;
  }, {});

const normalizeLocalizedText = (localized: LocalizedText): LocalizedText =>
  CONTENT_LANGUAGES.reduce<LocalizedText>((acc, { code }) => {
    const value = localized[code]?.trim();
    if (value) acc[code] = value;
    return acc;
  }, {});

const getPrimaryLocalizedValue = (localized?: LocalizedText, fallback = '') =>
  localized?.en?.trim() ||
  localized?.hi?.trim() ||
  Object.values(localized || {}).find((value) => value?.trim()) ||
  fallback;

interface CampaignFormData {
  titleTranslations: LocalizedText;
  descriptionTranslations: LocalizedText;
  additionalTextTranslations: LocalizedText;
  goal: string;
  totalDays: string;
  backgroundImage: string;
  isActive: boolean;
}

const EMPTY_FORM: CampaignFormData = {
  titleTranslations: createEmptyLocalizedText(),
  descriptionTranslations: createEmptyLocalizedText(),
  additionalTextTranslations: createEmptyLocalizedText(),
  goal: '',
  totalDays: '',
  backgroundImage: '',
  isActive: true,
};

export function DonationsScreen() {
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [records, setRecords] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('campaigns');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DonationCampaign | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState<DonationAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [resendingReceiptId, setResendingReceiptId] = useState<string | null>(null);

  // ── Fetch campaigns ──
  const fetchCampaigns = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/donate');
      const data = Array.isArray(response.data) ? response.data : [];
      setCampaigns(data.filter((c: DonationCampaign) => !c.isDeleted));
    } catch (err) {
      setError('Failed to load donation campaigns');
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch donation records ──
  const fetchRecords = useCallback(async () => {
    try {
      setRecordsLoading(true);
      const response = await api.get('/donationsRecord');
      // The interceptor already unwraps allPayments
      const data = Array.isArray(response.data) ? response.data : [];
      setRecords(data);
    } catch (err) {
      console.error('Error fetching donation records:', err);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const params =
        analyticsRange === 'custom' && customStartDate && customEndDate
          ? `range=custom&startDate=${encodeURIComponent(customStartDate)}&endDate=${encodeURIComponent(customEndDate)}`
          : `range=${analyticsRange}`;
      const response = await api.get(`/donations/analytics?${params}`);
      setAnalytics(response.data || null);
    } catch (err) {
      console.error('Error fetching donation analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsRange, customEndDate, customStartDate]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (activeTab === 'records' && records.length === 0) {
      fetchRecords();
    }
  }, [activeTab, records.length, fetchRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'campaigns') {
      fetchCampaigns();
    } else {
      fetchRecords().finally(() => setRefreshing(false));
    }
    fetchAnalytics();
  }, [activeTab, fetchAnalytics, fetchCampaigns, fetchRecords]);

  // ── CRUD helpers ──
  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormData(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (campaign: DonationCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      titleTranslations: {
        ...createEmptyLocalizedText(),
        ...(campaign.titleTranslations || {}),
        en: campaign.titleTranslations?.en || campaign.title || '',
      },
      descriptionTranslations: {
        ...createEmptyLocalizedText(),
        ...(campaign.descriptionTranslations || {}),
        en: campaign.descriptionTranslations?.en || campaign.description || '',
      },
      additionalTextTranslations: {
        ...createEmptyLocalizedText(),
        ...(campaign.additionalTextTranslations || {}),
        en: campaign.additionalTextTranslations?.en || campaign.additionalText || '',
      },
      goal: String(campaign.goal),
      totalDays: String(campaign.totalDays),
      backgroundImage: campaign.backgroundImage ?? '',
      isActive: campaign.isActive,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!getPrimaryLocalizedValue(formData.titleTranslations).trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    if (!formData.goal || isNaN(Number(formData.goal)) || Number(formData.goal) <= 0) {
      Alert.alert('Validation', 'Please enter a valid goal amount.');
      return;
    }

    const body = {
      title: getPrimaryLocalizedValue(formData.titleTranslations).trim(),
      description: getPrimaryLocalizedValue(formData.descriptionTranslations).trim(),
      titleTranslations: normalizeLocalizedText(formData.titleTranslations),
      descriptionTranslations: normalizeLocalizedText(formData.descriptionTranslations),
      additionalText:
        getPrimaryLocalizedValue(formData.additionalTextTranslations).trim() || undefined,
      additionalTextTranslations: normalizeLocalizedText(formData.additionalTextTranslations),
      goal: Number(formData.goal),
      totalDays: Number(formData.totalDays) || 30,
      backgroundImage: formData.backgroundImage.trim() || undefined,
      isActive: formData.isActive,
    };

    try {
      setSaving(true);
      if (editingCampaign) {
        await api.put(`/donate/${editingCampaign._id}`, body);
      } else {
        await api.post('/donate', body);
      }
      setModalVisible(false);
      fetchCampaigns();
    } catch (err) {
      console.error('Error saving campaign:', err);
      Alert.alert('Error', 'Failed to save campaign. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (campaign: DonationCampaign) => {
    Alert.alert(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/donate/${campaign._id}`);
              fetchCampaigns();
            } catch (err) {
              console.error('Error deleting campaign:', err);
              Alert.alert('Error', 'Failed to delete campaign.');
            }
          },
        },
      ],
    );
  };

  const handleResendReceipt = async (record: DonationRecord) => {
    try {
      setResendingReceiptId(record.id);
      const response = await api.post('/donations/resend-receipt', {
        paymentId: record.id,
      });
      const responseData = response.data;

      if (responseData?.success === false) {
        throw new Error(responseData?.message || 'Failed to resend donation receipt');
      }

      Alert.alert('Success', 'Donation receipt resend has been triggered.');
      fetchRecords();
    } catch (err: any) {
      console.error('Error resending donation receipt:', err);
      Alert.alert(
        'Receipt resend failed',
        err?.response?.data?.message || err?.message || 'Please try again.'
      );
    } finally {
      setResendingReceiptId(null);
    }
  };

  // ── Formatting helpers ──
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return colors.status.success;
    if (percentage >= 75) return colors.gold.main;
    if (percentage >= 50) return colors.primary.saffron;
    return colors.status.warning;
  };

  const formatUnixDate = (unix: number) => {
    const d = new Date(unix * 1000);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'captured':
      case 'paid':
        return colors.status.success;
      case 'failed':
        return colors.status.error;
      case 'refunded':
        return colors.status.warning;
      default:
        return colors.text.secondary;
    }
  };

  // ── Summary header ──
  const renderHeader = () => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.isActive).length;
    const totalRaised = campaigns.reduce((sum, c) => sum + (c.achieved || 0), 0);

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Campaign Summary</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.analyticsRangeRow}>
          {(['today', '7d', '30d', 'custom'] as AnalyticsRange[]).map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.rangeChip,
                analyticsRange === value && styles.rangeChipActive,
              ]}
              onPress={() => setAnalyticsRange(value)}
            >
              <Text
                style={[
                  styles.rangeChipText,
                  analyticsRange === value && styles.rangeChipTextActive,
                ]}
              >
                {value === 'today' ? 'Today' : value === '7d' ? '7 Days' : value === '30d' ? '30 Days' : 'Custom'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {analyticsRange === 'custom' ? (
          <View style={styles.customDateRow}>
            <TextInput
              style={[styles.textInput, styles.customDateInput]}
              value={customStartDate}
              onChangeText={setCustomStartDate}
              placeholder="Start YYYY-MM-DD"
              placeholderTextColor={colors.text.secondary}
            />
            <TextInput
              style={[styles.textInput, styles.customDateInput]}
              value={customEndDate}
              onChangeText={setCustomEndDate}
              placeholder="End YYYY-MM-DD"
              placeholderTextColor={colors.text.secondary}
            />
          </View>
        ) : null}

        {analyticsLoading ? (
          <View style={styles.analyticsLoader}>
            <ActivityIndicator size="small" color={colors.gold.light} />
          </View>
        ) : analytics ? (
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>
              {formatCurrency(analytics.totals.totalAmount)}
            </Text>
            <Text style={styles.analyticsLabel}>Collected in selected range</Text>
            <View style={styles.analyticsStatsGrid}>
              <Text style={styles.analyticsStatText}>Donations: {analytics.totals.donationsCount}</Text>
              <Text style={styles.analyticsStatText}>Unique donors: {analytics.totals.uniqueDonors}</Text>
              <Text style={styles.analyticsStatText}>Repeat donors: {analytics.totals.repeatDonors}</Text>
              <Text style={styles.analyticsStatText}>Average gift: {formatCurrency(analytics.totals.averageDonation)}</Text>
            </View>
            {analytics.topDonor ? (
              <View style={styles.topDonorCard}>
                <Text style={styles.topDonorTitle}>Top donor</Text>
                <Text style={styles.topDonorName}>{analytics.topDonor.name}</Text>
                <Text style={styles.topDonorMeta}>
                  {formatCurrency(analytics.topDonor.totalAmount)} across {analytics.topDonor.donationCount} donations
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalCampaigns}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activeCampaigns}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValueSmall}>{formatCurrency(totalRaised)}</Text>
            <Text style={styles.summaryLabel}>Raised</Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Campaign card ──
  const renderCampaignCard = ({ item }: { item: DonationCampaign }) => {
    const progress = item.goal > 0 ? Math.min(item.achieved / item.goal, 1) : 0;
    const percentage = Math.round(progress * 100);

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Avatar
              name={getPrimaryLocalizedValue(item.titleTranslations, item.title)}
              size={44}
            />
            <Text style={styles.campaignTitle} numberOfLines={2}>
              {getPrimaryLocalizedValue(item.titleTranslations, item.title)}
            </Text>
            <View style={styles.cardActions}>
              <Badge
                label={item.isActive ? 'Active' : 'Closed'}
                tone={item.isActive ? colors.status.success : colors.text.secondary}
                variant="soft"
                dot
              />
            </View>
          </View>

          {(item.description || item.descriptionTranslations) ? (
            <Text style={styles.description} numberOfLines={2}>
              {getPrimaryLocalizedValue(item.descriptionTranslations, item.description)}
            </Text>
          ) : null}

          <View style={styles.progressSection}>
            <View style={styles.amountRow}>
              <Text style={styles.achievedAmount}>{formatCurrency(item.achieved)}</Text>
              <Text style={styles.goalAmount}>of {formatCurrency(item.goal)}</Text>
            </View>

            <View style={styles.progressBarContainer}>
              <ProgressBar
                progress={progress}
                color={getProgressColor(percentage)}
                style={styles.progressBar}
              />
            </View>

            <View style={styles.statsRow}>
              <Text style={[styles.percentage, { color: getProgressColor(percentage) }]}>
                {percentage}% Complete
              </Text>
              <View style={styles.donorsRow}>
                <MaterialCommunityIcons
                  name="account-heart-outline"
                  size={14}
                  color={colors.primary.maroon}
                  style={styles.donorsIcon}
                />
                <Text style={styles.donorsText}>{item.donors || 0} donors</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <IconButton icon="pencil" iconColor={colors.primary.maroon} size={20} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
            >
              <IconButton icon="delete" iconColor={colors.status.error} size={20} />
              <Text style={[styles.actionButtonText, { color: colors.status.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // ── Donation record card ──
  const renderRecordCard = ({ item }: { item: DonationRecord }) => (
    <Card style={styles.recordCard}>
      <Card.Content style={styles.recordContent}>
        <View style={styles.recordLeft}>
          <Text style={styles.recordAmount}>
            {item.currency === 'INR' ? '\u20B9' : item.currency}{' '}
            {item.amount.toLocaleString('en-IN')}
          </Text>
          <View style={styles.recordMetaRow}>
            <MaterialCommunityIcons
              name="credit-card-outline"
              size={13}
              color={colors.primary.maroon}
              style={styles.recordMetaIcon}
            />
            <Text style={styles.recordMethod}>{item.method || 'N/A'}</Text>
          </View>
          {item.email ? (
            <View style={styles.recordMetaRow}>
              <MaterialCommunityIcons
                name="email-outline"
                size={13}
                color={colors.text.secondary}
                style={styles.recordMetaIcon}
              />
              <Text style={styles.recordContact} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
          ) : null}
          {item.contact ? (
            <View style={styles.recordMetaRow}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={13}
                color={colors.text.secondary}
                style={styles.recordMetaIcon}
              />
              <Text style={styles.recordContact}>{item.contact}</Text>
            </View>
          ) : null}
          {item.description ? (
            <Text style={styles.recordDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.receiptMetaBlock}>
            <View style={styles.recordMetaRow}>
              <MaterialCommunityIcons
                name="receipt"
                size={13}
                color={colors.primary.maroon}
                style={styles.recordMetaIcon}
              />
              <Text style={styles.receiptMetaTitle}>
                {item.receiptNumber || 'Receipt pending'}
              </Text>
            </View>
            <Text style={styles.receiptMetaText}>
              Email: {item.receiptEmailSentAt ? new Date(item.receiptEmailSentAt).toLocaleDateString('en-IN') : 'Pending'}
            </Text>
            <Text style={styles.receiptMetaText}>
              WhatsApp: {item.receiptWhatsappSentAt ? new Date(item.receiptWhatsappSentAt).toLocaleDateString('en-IN') : 'Pending'}
            </Text>
          </View>
        </View>
        <View style={styles.recordRight}>
          <Badge
            label={item.status}
            tone={getStatusColor(item.status)}
            variant="soft"
            dot
            style={styles.recordStatusBadge}
          />
          <Text style={styles.recordDate}>{formatUnixDate(item.created)}</Text>
          <TouchableOpacity
            style={[
              styles.resendButton,
              resendingReceiptId === item.id && styles.resendButtonDisabled,
            ]}
            onPress={() => handleResendReceipt(item)}
            disabled={resendingReceiptId === item.id}
          >
            {resendingReceiptId === item.id ? (
              <ActivityIndicator size="small" color={colors.text.white} />
            ) : (
              <Text style={styles.resendButtonText}>Resend Receipt</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  // ── Tab bar ──
  const renderTabBar = () => (
    <View style={styles.tabContainer}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
        buttons={[
          { value: 'campaigns', label: 'Campaigns' },
          { value: 'records', label: 'Payment Records' },
        ]}
        style={styles.segmentedButtons}
      />
    </View>
  );

  // ── Empty states ──
  const renderEmptyCampaigns = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>💰</Text>
      <Text style={styles.emptyStateText}>No donation campaigns</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap the + button to create your first campaign
      </Text>
    </View>
  );

  const renderEmptyRecords = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📋</Text>
      <Text style={styles.emptyStateText}>No payment records</Text>
      <Text style={styles.emptyStateSubtext}>
        Donation payments will appear here once received
      </Text>
    </View>
  );

  // ── Create / Edit modal ──
  const renderFormModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setModalVisible(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
            </Text>
            <IconButton
              icon="close"
              iconColor={colors.text.primary}
              size={24}
              onPress={() => setModalVisible(false)}
            />
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.translationSectionTitle}>Localized Titles</Text>
            {CONTENT_LANGUAGES.map(({ code, label }) => (
              <TextInput
                key={`campaign-title-${code}`}
                style={styles.textInput}
                value={formData.titleTranslations[code] || ''}
                onChangeText={(t) =>
                  setFormData((p) => ({
                    ...p,
                    titleTranslations: { ...p.titleTranslations, [code]: t },
                  }))
                }
                placeholder={`Title (${label})${code === 'en' ? ' *' : ''}`}
                placeholderTextColor={colors.text.secondary}
              />
            ))}

            <Text style={styles.translationSectionTitle}>Localized Descriptions</Text>
            {CONTENT_LANGUAGES.map(({ code, label }) => (
              <TextInput
                key={`campaign-description-${code}`}
                style={[styles.textInput, styles.textArea]}
                value={formData.descriptionTranslations[code] || ''}
                onChangeText={(t) =>
                  setFormData((p) => ({
                    ...p,
                    descriptionTranslations: { ...p.descriptionTranslations, [code]: t },
                  }))
                }
                placeholder={`Description (${label})${code === 'en' ? ' *' : ''}`}
                placeholderTextColor={colors.text.secondary}
                multiline
                numberOfLines={3}
              />
            ))}

            <Text style={styles.translationSectionTitle}>Localized Additional Text</Text>
            {CONTENT_LANGUAGES.map(({ code, label }) => (
              <TextInput
                key={`campaign-additional-${code}`}
                style={styles.textInput}
                value={formData.additionalTextTranslations[code] || ''}
                onChangeText={(t) =>
                  setFormData((p) => ({
                    ...p,
                    additionalTextTranslations: {
                      ...p.additionalTextTranslations,
                      [code]: t,
                    },
                  }))
                }
                placeholder={`Additional text (${label})`}
                placeholderTextColor={colors.text.secondary}
              />
            ))}

            <Text style={styles.inputLabel}>Goal Amount (INR) *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.goal}
              onChangeText={(t) => setFormData((p) => ({ ...p, goal: t }))}
              placeholder="e.g. 100000"
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Total Days</Text>
            <TextInput
              style={styles.textInput}
              value={formData.totalDays}
              onChangeText={(t) => setFormData((p) => ({ ...p, totalDays: t }))}
              placeholder="e.g. 30"
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Background Image URL</Text>
            <TextInput
              style={styles.textInput}
              value={formData.backgroundImage}
              onChangeText={(t) => setFormData((p) => ({ ...p, backgroundImage: t }))}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.text.secondary}
              autoCapitalize="none"
              keyboardType="url"
            />

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Active</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
                trackColor={{
                  false: colors.text.secondary,
                  true: colors.status.success,
                }}
                thumbColor={colors.text.white}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingCampaign ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ── Loading / error states ──
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading campaigns...</Text>
      </View>
    );
  }

  if (error && campaigns.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCampaigns}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ──
  return (
    <View style={styles.container}>
      {renderTabBar()}

      {activeTab === 'campaigns' ? (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item._id}
          renderItem={renderCampaignCard}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={campaigns.length > 0 ? renderHeader : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.maroon]}
              tintColor={colors.primary.maroon}
            />
          }
          ListEmptyComponent={renderEmptyCampaigns}
          showsVerticalScrollIndicator={false}
        />
      ) : recordsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.maroon} />
          <Text style={styles.loadingText}>Loading payment records...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.maroon]}
              tintColor={colors.primary.maroon}
            />
          }
          ListEmptyComponent={renderEmptyRecords}
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeTab === 'campaigns' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={openCreateModal}
          color={colors.text.white}
        />
      )}

      {renderFormModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.parchment,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 16,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary.saffron,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.text.white,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_CLEARANCE,
  },

  // ── Tab bar ──
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background.parchment,
  },
  segmentedButtons: {
    backgroundColor: colors.background.sandstone,
  },

  // ── Summary ──
  summaryCard: {
    backgroundColor: colors.primary.maroon,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    color: colors.gold.light,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  analyticsRangeRow: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rangeChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rangeChipActive: {
    backgroundColor: colors.gold.main,
    borderColor: colors.gold.main,
  },
  rangeChipText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '600',
  },
  rangeChipTextActive: {
    color: colors.primary.maroon,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customDateInput: {
    flex: 1,
    backgroundColor: colors.background.warmWhite,
  },
  analyticsLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  analyticsCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  analyticsValue: {
    color: colors.text.white,
    fontSize: 24,
    fontWeight: '700',
  },
  analyticsLabel: {
    color: colors.gold.light,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  analyticsStatsGrid: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  analyticsStatText: {
    color: colors.text.white,
    fontSize: 12,
  },
  topDonorCard: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  topDonorTitle: {
    color: colors.gold.light,
    fontSize: 12,
    fontWeight: '600',
  },
  topDonorName: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  topDonorMeta: {
    color: colors.text.white,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    color: colors.text.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  summaryValueSmall: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: colors.gold.light,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // ── Campaign card ──
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold,
    padding: spacing.xs,
    ...shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  description: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  progressSection: {
    backgroundColor: colors.background.sandstone,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  achievedAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gold.dark,
  },
  goalAmount: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  progressBarContainer: {
    marginVertical: spacing.sm,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border.gold,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  donorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donorsIcon: {
    marginRight: spacing.xs,
  },
  donorsText: {
    fontSize: 12,
    color: colors.primary.maroon,
    fontWeight: '500',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
    paddingTop: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    color: colors.primary.maroon,
    fontWeight: '500',
    marginLeft: -spacing.sm,
  },

  // ── Record card ──
  recordCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold,
    padding: spacing.xs,
    ...shadows.soft,
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  recordMetaIcon: {
    marginRight: spacing.xs,
  },
  recordContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  recordAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  recordMethod: {
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  recordContact: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  recordDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  receiptMetaBlock: {
    marginTop: spacing.sm,
  },
  receiptMetaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: 2,
  },
  receiptMetaText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordStatusBadge: {
    marginBottom: spacing.xs,
  },
  recordDate: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  resendButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary.maroon,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.7,
  },
  resendButtonText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary.maroon,
    ...shadows.maroonGlow,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.warmWhite,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary.maroon,
  },
  modalBody: {
    paddingBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  translationSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.text.secondary,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: colors.primary.saffron,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.text.white,
    fontWeight: '600',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },

  // ── Empty state ──
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    color: colors.text.secondary,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
