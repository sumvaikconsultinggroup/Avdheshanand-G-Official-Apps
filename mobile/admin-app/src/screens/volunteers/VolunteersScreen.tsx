import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {
  ActivityIndicator,
  Portal,
  Modal,
  Button,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, gradients, shadows, typography } from '../../theme';
import api from '../../services/api';
import { Volunteer } from '../../types';

export function VolunteersScreen() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailVolunteer, setDetailVolunteer] = useState<Volunteer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVolunteers = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/volunteer');
      const data = Array.isArray(response.data) ? response.data : [];
      setVolunteers(data.filter((v: Volunteer) => !v.isDeleted));
    } catch (err) {
      setError('Failed to load volunteers');
      console.error('Error fetching volunteers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVolunteers();
  }, [fetchVolunteers]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleApprove = async (volunteer: Volunteer) => {
    setActionLoading(true);
    try {
      await api.put(`/volunteer/${volunteer._id}`, { isApproved: true });
      fetchVolunteers();
      if (detailVolunteer?._id === volunteer._id) {
        setDetailVolunteer({ ...volunteer, isApproved: true });
      }
    } catch (err) {
      console.error('Error approving volunteer:', err);
      Alert.alert('Error', 'Failed to approve volunteer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (volunteer: Volunteer) => {
    setActionLoading(true);
    try {
      await api.put(`/volunteer/${volunteer._id}`, { isApproved: false });
      fetchVolunteers();
      if (detailVolunteer?._id === volunteer._id) {
        setDetailVolunteer({ ...volunteer, isApproved: false });
      }
    } catch (err) {
      console.error('Error rejecting volunteer:', err);
      Alert.alert('Error', 'Failed to reject volunteer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (volunteer: Volunteer) => {
    Alert.alert(
      'Delete Volunteer',
      `Are you sure you want to delete "${volunteer.fullName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/volunteer/${volunteer._id}`);
              if (detailVolunteer?._id === volunteer._id) {
                setDetailVolunteer(null);
              }
              fetchVolunteers();
            } catch (err) {
              console.error('Error deleting volunteer:', err);
              Alert.alert('Error', 'Failed to delete volunteer.');
            }
          },
        },
      ],
    );
  };

  const StatusBadge = ({ approved }: { approved: boolean }) => {
    const tone = approved ? colors.status.success : colors.status.warning;
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${tone}1A`, borderColor: `${tone}55` }]}>
        <View style={[styles.statusDot, { backgroundColor: tone }]} />
        <Text style={[styles.statusBadgeText, { color: tone }]}>
          {approved ? 'Approved' : 'Pending'}
        </Text>
      </View>
    );
  };

  const SkillPill = ({ label }: { label: string }) => (
    <View style={styles.skillPill}>
      <Text style={styles.skillPillText}>{label}</Text>
    </View>
  );

  const renderVolunteerCard = ({ item }: { item: Volunteer }) => {
    const isApproved = item.isApproved === true;

    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => setDetailVolunteer(item)} style={styles.card}>
        {/* Header: avatar + identity + status */}
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={gradients.hero as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{item.fullName?.charAt(0)?.toUpperCase() || '?'}</Text>
          </LinearGradient>

          <View style={styles.volunteerInfo}>
            <Text style={styles.volunteerName} numberOfLines={1}>{item.fullName}</Text>
            {item.location ? (
              <View style={styles.metaRow}>
                <Icon name="map-marker" size={13} color={colors.primary.saffron} />
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <Icon name="email-outline" size={13} color={colors.gold.dark} />
              <Text style={styles.metaText} numberOfLines={1}>{item.email}</Text>
            </View>
          </View>

          <StatusBadge approved={isApproved} />
        </View>

        {/* Skills */}
        {item.skills && item.skills.length > 0 && (
          <View style={styles.skillsSection}>
            <Text style={styles.sectionEyebrow}>Skills</Text>
            <View style={styles.skillsContainer}>
              {item.skills.slice(0, 4).map((skill, index) => (
                <SkillPill key={index} label={skill} />
              ))}
              {item.skills.length > 4 && (
                <Text style={styles.moreSkills}>+{item.skills.length - 4} more</Text>
              )}
            </View>
          </View>
        )}

        {/* Footer: applied date + actions */}
        <View style={styles.cardActions}>
          <View style={styles.metaRow}>
            <Icon name="calendar-check-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.actionButtons}>
            {!isApproved && (
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                <Icon name="check" size={15} color={colors.text.white} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteBtnSmall} onPress={() => handleDelete(item)}>
              <Icon name="trash-can-outline" size={15} color={colors.status.error} />
              <Text style={styles.deleteBtnSmallText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Icon name="hand-heart-outline" size={30} color={colors.primary.saffron} />
      </View>
      <Text style={styles.emptyStateText}>No volunteers yet</Text>
      <Text style={styles.emptyStateSubtext}>Volunteer applications will appear here</Text>
    </View>
  );

  const renderHeader = () => {
    const total = volunteers.length;
    const approved = volunteers.filter((v) => v.isApproved === true).length;
    const pending = volunteers.filter((v) => !v.isApproved).length;

    return (
      <LinearGradient
        colors={gradients.hero as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryTitle}>Volunteer Overview</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#7BE5A0' }]}>{approved}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.gold.light }]}>{pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderDetailField = (label: string, value?: string | number | boolean | null) => {
    if (value === undefined || value === null || value === '') return null;
    const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    return (
      <View style={styles.detailField}>
        <Text style={styles.detailFieldLabel}>{label}</Text>
        <Text style={styles.detailFieldValue}>{display}</Text>
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!detailVolunteer) return null;
    const v = detailVolunteer;
    const isApproved = v.isApproved === true;

    return (
      <Portal>
        <Modal
          visible={!!detailVolunteer}
          onDismiss={() => setDetailVolunteer(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={gradients.hero as unknown as readonly [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarLarge}
              >
                <Text style={styles.avatarTextLarge}>{v.fullName?.charAt(0)?.toUpperCase() || '?'}</Text>
              </LinearGradient>
              <Text style={styles.modalName}>{v.fullName}</Text>
              <StatusBadge approved={isApproved} />
            </View>

            {renderDetailField('Email', v.email)}
            {renderDetailField('Phone', v.phone)}
            {renderDetailField('Location', v.location)}
            {renderDetailField('Age', v.age)}
            {renderDetailField('Occupation Type', v.occupationType)}
            {renderDetailField('Occupation', v.occupation)}
            {renderDetailField('Available From', v.availableFrom ? formatDate(v.availableFrom) : undefined)}
            {renderDetailField('Available Until', v.availableUntil ? formatDate(v.availableUntil) : undefined)}
            {renderDetailField('Motivation', v.motivation)}
            {renderDetailField('Experience', v.experience)}
            {renderDetailField('Consent', v.consent)}

            {v.availability && v.availability.length > 0 && (
              <View style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Availability</Text>
                <View style={styles.tagRow}>
                  {v.availability.map((a, i) => (
                    <SkillPill key={i} label={a} />
                  ))}
                </View>
              </View>
            )}

            {v.skills && v.skills.length > 0 && (
              <View style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Skills</Text>
                <View style={styles.tagRow}>
                  {v.skills.map((s, i) => (
                    <SkillPill key={i} label={s} />
                  ))}
                </View>
              </View>
            )}

            {renderDetailField('Applied', formatDate(v.createdAt))}

            <View style={styles.modalActions}>
              {!isApproved && (
                <Button
                  mode="contained"
                  onPress={() => handleApprove(v)}
                  loading={actionLoading}
                  disabled={actionLoading}
                  buttonColor={colors.status.success}
                  style={styles.modalActionBtn}
                >
                  Approve
                </Button>
              )}
              {isApproved && (
                <Button
                  mode="contained"
                  onPress={() => handleReject(v)}
                  loading={actionLoading}
                  disabled={actionLoading}
                  buttonColor={colors.status.warning}
                  style={styles.modalActionBtn}
                >
                  Reject
                </Button>
              )}
              <Button
                mode="contained"
                onPress={() => handleDelete(v)}
                buttonColor={colors.status.error}
                style={styles.modalActionBtn}
              >
                Delete
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading volunteers...</Text>
      </View>
    );
  }

  if (error && volunteers.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVolunteers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={volunteers}
        keyExtractor={(item) => item._id}
        renderItem={renderVolunteerCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={volunteers.length > 0 ? renderHeader : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.maroon]}
            tintColor={colors.primary.maroon}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {renderDetailModal()}
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
    backgroundColor: colors.primary.maroon,
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
    paddingBottom: spacing.xxl,
  },

  // Summary
  summaryCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.maroonGlow,
  },
  summaryTitle: {
    color: colors.gold.light,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
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
    fontSize: 30,
    fontWeight: '800',
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Card
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    padding: spacing.md,
    ...shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.gold.main,
  },
  avatarText: {
    color: colors.text.white,
    fontSize: 21,
    fontWeight: '800',
  },
  volunteerInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  volunteerName: {
    ...typography.title,
    color: colors.primary.maroon,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.secondary,
    flexShrink: 1,
  },

  // Status badge (custom — no clipping)
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Skills
  skillsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold.dark,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  skillPill: {
    backgroundColor: colors.background.cream,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  skillPillText: {
    color: colors.primary.maroon,
    fontSize: 12,
    fontWeight: '600',
  },
  moreSkills: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Footer actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.status.success,
  },
  approveBtnText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.status.error}14`,
    borderWidth: 1,
    borderColor: `${colors.status.error}44`,
  },
  deleteBtnSmallText: {
    color: colors.status.error,
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal
  modalContainer: {
    backgroundColor: colors.background.warmWhite,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gold.main,
  },
  avatarTextLarge: {
    color: colors.text.white,
    fontSize: 28,
    fontWeight: '800',
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
  },
  detailField: {
    marginBottom: spacing.md,
  },
  detailFieldLabel: {
    fontSize: 12,
    color: colors.gold.dark,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailFieldValue: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
  },
  modalActionBtn: {
    flex: 1,
  },

  // Empty
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: `${colors.primary.saffron}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyStateText: {
    color: colors.primary.maroon,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateSubtext: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
