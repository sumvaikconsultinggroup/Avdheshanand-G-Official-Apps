import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { ContactMessage } from '../../types';
import {
  AdminEmptyState,
  AdminHero,
  AdminMetricCard,
  AdminPill,
  AdminSectionHeader,
  AdminSurface,
  Avatar,
  Badge,
} from '../../components/common';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';

type MessageFilter = 'all' | 'new' | 'in_review' | 'responded' | 'archived';

const FILTERS: MessageFilter[] = ['all', 'new', 'in_review', 'responded', 'archived'];

const STATUS_LABELS: Record<Exclude<MessageFilter, 'all'>, string> = {
  new: 'New',
  in_review: 'In review',
  responded: 'Responded',
  archived: 'Archived',
};

const STATUS_COLORS: Record<Exclude<MessageFilter, 'all'>, string> = {
  new: colors.primary.saffron,
  in_review: colors.gold.dark,
  responded: colors.status.success,
  archived: colors.text.secondary,
};

const STATUS_ICONS: Record<Exclude<MessageFilter, 'all'>, string> = {
  new: 'email-open-outline',
  in_review: 'progress-clock',
  responded: 'reply-outline',
  archived: 'archive-outline',
};

export function MessagesScreen() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [internalNotes, setInternalNotes] = useState('');
  const [responseText, setResponseText] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.get('/connect');
      const data = Array.isArray(response.data) ? response.data : [];
      setMessages(data.filter((item: ContactMessage) => !item.isDeleted));
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load prayer requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (selectedMessage) {
      setInternalNotes(selectedMessage.internalNotes || '');
      setResponseText(selectedMessage.responseText || '');
      setAssignedToName(selectedMessage.assignedToName || '');
    }
  }, [selectedMessage]);

  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages;
    return messages.filter((message) => (message.status || 'new') === filter);
  }, [filter, messages]);

  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<string, number>>((acc, key) => {
        acc[key] =
          key === 'all'
            ? messages.length
            : messages.filter((message) => (message.status || 'new') === key).length;
        return acc;
      }, {}),
    [messages],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages();
  }, [fetchMessages]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const persistMessage = async (status?: ContactMessage['status'], sendResponse?: boolean) => {
    if (!selectedMessage) return;
    try {
      setSaving(true);
      const response = await api.put(`/connect/${selectedMessage._id}`, {
        status: status || selectedMessage.status || 'new',
        internalNotes,
        responseText,
        assignedToName,
        sendResponse: Boolean(sendResponse && responseText.trim()),
      });

      const updated = response.data as ContactMessage & { _emailSent?: boolean; _emailError?: string };
      setMessages((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setSelectedMessage(updated);

      const triedToSend = Boolean(sendResponse && responseText.trim());
      if (!triedToSend) {
        Alert.alert('Saved', 'Prayer request updated successfully.');
      } else if (updated._emailSent) {
        Alert.alert('Reply sent', `The response email has been delivered to ${updated.email}.`);
      } else {
        Alert.alert(
          'Saved — but email not sent',
          updated._emailError ||
            'The reply was saved, but the email could not be delivered. Check the Resend configuration.',
        );
      }
    } catch (error) {
      console.error('Error updating prayer request:', error);
      Alert.alert('Error', 'Unable to update this prayer request right now.');
    } finally {
      setSaving(false);
    }
  };

  const archiveMessage = (message: ContactMessage) => {
    Alert.alert('Archive request', `Archive ${message.fullName}'s request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/connect/${message._id}`);
            setMessages((current) => current.filter((item) => item._id !== message._id));
            setSelectedMessage(null);
          } catch (error) {
            console.error('Error archiving prayer request:', error);
            Alert.alert('Error', 'Failed to archive the prayer request.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading prayer requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMessages}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.maroon]}
            tintColor={colors.primary.maroon}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <AdminHero
              eyebrow="Prayer inbox"
              title="Prayer Requests"
              subtitle="Read with context, assign follow-up, and respond from wherever the team is."
            />
            <View style={styles.metricGrid}>
              <AdminMetricCard label="All requests" value={counts.all || 0} icon="hands-pray" />
              <AdminMetricCard label="New" value={counts.new || 0} icon="email-open-outline" tone={colors.primary.saffron} />
              <AdminMetricCard label="In review" value={counts.in_review || 0} icon="progress-clock" tone={colors.gold.dark} />
              <AdminMetricCard label="Responded" value={counts.responded || 0} icon="reply-outline" tone={colors.status.success} />
            </View>
            <AdminSectionHeader
              title="Inbox"
              subtitle="Filter by status and open any request to assign or respond."
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((item) => (
                <AdminPill
                  key={item}
                  label={item === 'all' ? `All (${counts[item] || 0})` : `${STATUS_LABELS[item]} (${counts[item] || 0})`}
                  selected={filter === item}
                  onPress={() => setFilter(item)}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <AdminEmptyState
            icon="hands-pray"
            title="No prayer requests"
            message="Requests will appear here as devotees write in."
          />
        }
        renderItem={({ item }) => {
          const status = (item.status || 'new') as Exclude<MessageFilter, 'all'>;
          return (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectedMessage(item)}>
              <AdminSurface style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Avatar name={item.fullName} size={46} />
                  <View style={styles.messageCopy}>
                    <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
                    <Text style={styles.metaText} numberOfLines={1}>{item.email}</Text>
                    {item.subject ? <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text> : null}
                  </View>
                  <Badge
                    label={STATUS_LABELS[status]}
                    tone={STATUS_COLORS[status]}
                    variant="soft"
                    icon={STATUS_ICONS[status] as never}
                  />
                </View>
                <Text style={styles.preview} numberOfLines={3}>{item.message}</Text>
                <View style={styles.footerRow}>
                  <View style={styles.footerMeta}>
                    <Icon name="clock-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.metaText} numberOfLines={1}>{formatDate(item.createdAt)}</Text>
                  </View>
                  {item.assignedToName ? (
                    <Badge
                      label={item.assignedToName}
                      tone={colors.primary.maroon}
                      variant="outline"
                      icon="account-check-outline"
                    />
                  ) : null}
                </View>
              </AdminSurface>
            </TouchableOpacity>
          );
        }}
      />

      <Portal>
        <Modal visible={!!selectedMessage} onDismiss={() => setSelectedMessage(null)} contentContainerStyle={styles.modalContainer}>
          {selectedMessage ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selectedMessage.fullName}</Text>
              <Text style={styles.modalMeta}>{selectedMessage.email}</Text>
              {selectedMessage.phone ? <Text style={styles.modalMeta}>{selectedMessage.phone}</Text> : null}
              <Text style={styles.modalMeta}>{formatDate(selectedMessage.createdAt)}</Text>

              {selectedMessage.subject ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Subject</Text>
                  <Text style={styles.sectionValue}>{selectedMessage.subject}</Text>
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Prayer request</Text>
                <Text style={styles.sectionValue}>{selectedMessage.message}</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
                {(['new', 'in_review', 'responded'] as const).map((item) => (
                  <AdminPill
                    key={item}
                    label={STATUS_LABELS[item]}
                    selected={(selectedMessage.status || 'new') === item}
                    onPress={() => persistMessage(item)}
                  />
                ))}
              </ScrollView>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Assigned to</Text>
                <TextInput
                  value={assignedToName}
                  onChangeText={setAssignedToName}
                  placeholder="Enter team member name"
                  style={styles.input}
                  placeholderTextColor={colors.text.secondary}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Internal notes</Text>
                <TextInput
                  value={internalNotes}
                  onChangeText={setInternalNotes}
                  placeholder="Add context, follow-up, or next step"
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  placeholderTextColor={colors.text.secondary}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Response to devotee</Text>
                <TextInput
                  value={responseText}
                  onChangeText={setResponseText}
                  placeholder="Type the reply that should go on email"
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  placeholderTextColor={colors.text.secondary}
                />
              </View>

              <View style={styles.actionRow}>
                <Button mode="outlined" onPress={() => persistMessage(undefined, false)} disabled={saving}>
                  Save
                </Button>
                <Button mode="contained" onPress={() => persistMessage('responded', true)} loading={saving}>
                  Send Reply
                </Button>
              </View>

              <View style={styles.secondaryActions}>
                <Button mode="text" textColor={colors.text.secondary} onPress={() => setSelectedMessage(null)}>
                  Close
                </Button>
                <Button mode="text" textColor={colors.status.error} onPress={() => archiveMessage(selectedMessage)}>
                  Archive
                </Button>
              </View>
            </ScrollView>
          ) : null}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.parchment },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.parchment },
  loadingText: { marginTop: spacing.md, color: colors.text.secondary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  filterRow: { gap: spacing.sm, paddingBottom: spacing.md, marginBottom: spacing.sm },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    padding: spacing.lg,
    ...shadows.soft,
  },
  cardTopRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  messageCopy: { flex: 1 },
  name: { ...typography.titleSm, color: colors.text.primary },
  metaText: { ...typography.bodySm, color: colors.text.secondary, flexShrink: 1 },
  subject: { marginTop: 2, color: colors.primary.maroon, fontWeight: '600' },
  preview: { ...typography.body, color: colors.text.primary, marginTop: spacing.md },
  footerRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  modalContainer: {
    backgroundColor: colors.background.warmWhite,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    maxHeight: '88%',
  },
  modalTitle: { ...typography.titleLg, color: colors.primary.maroon },
  modalMeta: { marginTop: 4, color: colors.text.secondary },
  section: { marginTop: spacing.lg },
  sectionLabel: { ...typography.micro, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.text.secondary, marginBottom: spacing.xs },
  sectionValue: { ...typography.body, color: colors.text.primary },
  statusRow: { gap: spacing.sm, marginTop: spacing.lg },
  input: {
    backgroundColor: colors.background.parchment,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xl },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
});
