import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, FAB, Portal } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { SmartNote } from '../../types';
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
import { borderRadius, colors, shadows, spacing, typography, TAB_BAR_CLEARANCE } from '../../theme';

type FilterKey = 'all' | 'open' | 'assigned' | 'auto_assigned' | 'acknowledged' | 'completed';
type Priority = 'low' | 'medium' | 'high';

interface TeamMember {
  _id: string;
  name?: string;
  username?: string;
  role?: string;
}

interface NoteForm {
  title: string;
  body: string;
  tags: string;
  city: string;
  priority: Priority;
  createTask: boolean;
  assigneeId: string;
  assigneeName: string;
}

const EMPTY_FORM: NoteForm = {
  title: '',
  body: '',
  tags: '',
  city: '',
  priority: 'medium',
  createTask: true,
  assigneeId: '',
  assigneeName: '',
};

const FILTERS: FilterKey[] = ['all', 'open', 'assigned', 'auto_assigned', 'acknowledged', 'completed'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

const priorityTone = (priority?: Priority) => {
  switch (priority) {
    case 'high':
      return colors.status.error;
    case 'low':
      return colors.text.secondary;
    default:
      return colors.gold.dark;
  }
};

export function SmartNotesScreen() {
  const { admin } = useAuth();
  const [notes, setNotes] = useState<SmartNote[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<SmartNote | null>(null);
  const [form, setForm] = useState<NoteForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const fetchNotes = useCallback(async () => {
    try {
      const response = await api.get('/smart-notes');
      setNotes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching smart notes:', error);
      Alert.alert('Error', 'Failed to load smart notes.');
    }
  }, []);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await api.get('/admin/team');
      const data = res.data?.data || res.data || [];
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    fetchTeam();
  }, [fetchNotes, fetchTeam]);

  const openCreateModal = () => {
    setEditingNote(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (note: SmartNote) => {
    setEditingNote(note);
    setForm({
      title: note.title || '',
      body: note.body || '',
      tags: (note.tags || []).join(', '),
      city: note.city || '',
      priority: note.priority || 'medium',
      createTask: note.createTask ?? true,
      assigneeId: note.assignedToId || '',
      assigneeName: note.assignedToName || '',
    });
    setModalVisible(true);
  };

  const saveNote = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert('Missing Details', 'Please add both a title and note body.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
      city: form.city.trim() || undefined,
      priority: form.priority,
      createTask: form.createTask,
      assignedToId: form.assigneeId || undefined,
      assignedToName: form.assigneeName || undefined,
      createdById: admin?._id,
      createdByName: admin?.name || admin?.username,
    };

    try {
      setSaving(true);
      if (editingNote) {
        await api.put(`/smart-notes/${editingNote._id}`, payload);
      } else {
        await api.post('/smart-notes', payload);
      }
      setModalVisible(false);
      setForm(EMPTY_FORM);
      setEditingNote(null);
      fetchNotes();
      Alert.alert(
        editingNote ? 'Note updated' : 'Note saved',
        form.assigneeName
          ? `Assigned to ${form.assigneeName}.`
          : 'Mentioned team members were auto-detected from the text.',
      );
    } catch (error) {
      console.error('Error saving smart note:', error);
      Alert.alert('Error', 'Failed to save smart note.');
    } finally {
      setSaving(false);
    }
  };

  const updateAssignmentStatus = async (
    note: SmartNote,
    assignmentStatus: SmartNote['assignmentStatus'],
  ) => {
    try {
      await api.put(`/smart-notes/${note._id}`, { assignmentStatus });
      fetchNotes();
    } catch (error) {
      console.error('Error updating smart note:', error);
      Alert.alert('Error', 'Failed to update smart note.');
    }
  };

  const deleteNote = (note: SmartNote) => {
    Alert.alert('Delete note', `Delete "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/smart-notes/${note._id}`);
            fetchNotes();
          } catch (error) {
            console.error('Error deleting smart note:', error);
            Alert.alert('Error', 'Failed to delete smart note.');
          }
        },
      },
    ]);
  };

  const counts = useMemo(() => {
    const by = (status: string) => notes.filter((note) => note.assignmentStatus === status).length;
    const completed = by('completed');
    return {
      all: notes.length,
      open: notes.length - completed,
      assigned: by('assigned'),
      auto_assigned: by('auto_assigned'),
      acknowledged: by('acknowledged'),
      completed,
    };
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (activeFilter === 'all') return notes;
    if (activeFilter === 'open') return notes.filter((note) => note.assignmentStatus !== 'completed');
    return notes.filter((note) => note.assignmentStatus === activeFilter);
  }, [activeFilter, notes]);

  const statusTone = (status?: SmartNote['assignmentStatus']) => {
    switch (status) {
      case 'completed':
        return colors.status.success;
      case 'acknowledged':
      case 'assigned':
        return colors.primary.maroon;
      case 'auto_assigned':
        return colors.primary.saffron;
      default:
        return colors.gold.dark;
    }
  };

  const selectAssignee = (member: TeamMember | null) => {
    if (!member) {
      setForm((current) => ({ ...current, assigneeId: '', assigneeName: '' }));
      return;
    }
    setForm((current) => ({
      ...current,
      assigneeId: member._id,
      assigneeName: member.name || member.username || 'Team Member',
    }));
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <AdminHero
              eyebrow="Operational memory"
              title="Smart Notes"
              subtitle="Capture an instruction, pick who owns it, and it becomes a tracked seva task — admin & team only."
              badge={`${counts.open} open`}
              actions={[{ label: 'New note', icon: 'plus', onPress: openCreateModal }]}
            />

            <View style={styles.metricGrid}>
              <AdminMetricCard label="Open notes" value={counts.open} icon="note-multiple-outline" />
              <AdminMetricCard
                label="Assigned"
                value={counts.assigned + counts.auto_assigned}
                icon="account-check-outline"
                tone={colors.primary.saffron}
              />
              <AdminMetricCard
                label="Acknowledged"
                value={counts.acknowledged}
                icon="progress-check"
                tone={colors.primary.maroon}
              />
              <AdminMetricCard
                label="Completed"
                value={counts.completed}
                icon="check-decagram-outline"
                tone={colors.status.success}
              />
            </View>

            <AdminSectionHeader
              title="Active notes"
              subtitle="Filter by workflow state and keep execution moving."
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((filter) => (
                <AdminPill
                  key={filter}
                  label={`${filter.replace('_', ' ')} (${counts[filter]})`}
                  selected={filter === activeFilter}
                  onPress={() => setActiveFilter(filter)}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <AdminEmptyState
            icon="note-outline"
            title="No smart notes yet"
            message="Create a note, assign an owner, and a trackable seva task is created automatically."
            actionLabel="Create note"
            onAction={openCreateModal}
          />
        }
        renderItem={({ item }) => (
          <AdminSurface style={styles.noteCard}>
            <View style={styles.noteTopRow}>
              <View style={styles.noteCopy}>
                <Text style={styles.noteTitle}>{item.title}</Text>
                <Text style={styles.noteMeta}>
                  {item.createdByName || 'Team'} • {new Date(item.createdAt).toLocaleString('en-IN')}
                </Text>
              </View>
              <Badge
                label={(item.assignmentStatus || 'unassigned').replace('_', ' ')}
                tone={statusTone(item.assignmentStatus)}
                variant="soft"
                dot
              />
            </View>

            <Text style={styles.noteBody}>{item.body}</Text>

            <View style={styles.metaBadges}>
              <Badge label={`${item.priority || 'medium'} priority`} tone={priorityTone(item.priority)} variant="soft" icon="flag-outline" />
              {item.city ? <Badge label={item.city} tone={colors.gold.dark} variant="soft" icon="map-marker-outline" /> : null}
              {item.linkedSevaTaskId ? (
                <Badge label="Seva task created" tone={colors.primary.maroon} variant="soft" icon="clipboard-check-outline" />
              ) : null}
            </View>

            {item.assignedToName ? (
              <View style={styles.assignmentRow}>
                <Avatar name={item.assignedToName} size={26} />
                <Icon name="account-arrow-right-outline" size={16} color={colors.primary.maroon} />
                <Text style={styles.assignmentText} numberOfLines={1}>
                  Assigned to {item.assignedToName}
                </Text>
              </View>
            ) : null}

            {item.tags?.length ? (
              <View style={styles.chipWrap}>
                {item.tags.map((tag, index) => (
                  <Badge key={`${tag}-${index}`} label={tag} tone={colors.gold.dark} variant="outline" />
                ))}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                <Icon name="pencil-outline" size={16} color={colors.primary.maroon} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              {item.assignmentStatus !== 'acknowledged' && item.assignmentStatus !== 'completed' ? (
                <TouchableOpacity style={styles.actionButton} onPress={() => updateAssignmentStatus(item, 'acknowledged')}>
                  <Icon name="check-circle-outline" size={16} color={colors.primary.maroon} />
                  <Text style={styles.actionText}>Acknowledge</Text>
                </TouchableOpacity>
              ) : null}
              {item.assignmentStatus !== 'completed' ? (
                <TouchableOpacity style={styles.actionButton} onPress={() => updateAssignmentStatus(item, 'completed')}>
                  <Icon name="check-decagram-outline" size={16} color={colors.status.success} />
                  <Text style={styles.actionText}>Complete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.actionButtonDanger} onPress={() => deleteNote(item)}>
                <Icon name="delete-outline" size={16} color={colors.status.error} />
                <Text style={[styles.actionText, { color: colors.status.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </AdminSurface>
        )}
      />

      <Portal>
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{editingNote ? 'Edit Smart Note' : 'Create Smart Note'}</Text>
                <Text style={styles.modalSubtitle}>
                  Assign an owner directly, or leave it to auto-detect a mentioned team member.
                </Text>

                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput
                  value={form.title}
                  onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
                  placeholder="Short title"
                  placeholderTextColor={colors.text.secondary}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Note *</Text>
                <TextInput
                  value={form.body}
                  onChangeText={(value) => setForm((current) => ({ ...current, body: value }))}
                  placeholder="Example: Swami ji wants a social media post on x, y, z — needed today."
                  placeholderTextColor={colors.text.secondary}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                />

                {/* Assignee picker */}
                <Text style={styles.fieldLabel}>Assign to</Text>
                <TouchableOpacity
                  style={[styles.assigneeRow, !form.assigneeId && styles.assigneeRowActive]}
                  onPress={() => selectAssignee(null)}
                  activeOpacity={0.8}
                >
                  <View style={styles.autoIcon}>
                    <Icon name="auto-fix" size={18} color={colors.gold.dark} />
                  </View>
                  <View style={styles.assigneeCopy}>
                    <Text style={styles.assigneeName}>Auto-detect from text</Text>
                    <Text style={styles.assigneeSub}>Pick up a mentioned team member automatically</Text>
                  </View>
                  {!form.assigneeId ? <Icon name="check-circle" size={20} color={colors.primary.maroon} /> : null}
                </TouchableOpacity>
                {teamMembers.map((member) => {
                  const selected = form.assigneeId === member._id;
                  return (
                    <TouchableOpacity
                      key={member._id}
                      style={[styles.assigneeRow, selected && styles.assigneeRowActive]}
                      onPress={() => selectAssignee(member)}
                      activeOpacity={0.8}
                    >
                      <Avatar name={member.name || member.username} size={34} />
                      <View style={styles.assigneeCopy}>
                        <Text style={styles.assigneeName} numberOfLines={1}>
                          {member.name || member.username}
                          {member.role ? `  ·  ${member.role}` : ''}
                        </Text>
                        {member.username ? (
                          <Text style={styles.assigneeSub} numberOfLines={1}>@{member.username}</Text>
                        ) : null}
                      </View>
                      {selected ? <Icon name="check-circle" size={20} color={colors.primary.maroon} /> : null}
                    </TouchableOpacity>
                  );
                })}

                {/* Priority */}
                <Text style={styles.fieldLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.map((p) => {
                    const selected = form.priority === p;
                    const tone = priorityTone(p);
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityChip,
                          selected && { backgroundColor: `${tone}1A`, borderColor: tone },
                        ]}
                        onPress={() => setForm((current) => ({ ...current, priority: p }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.priorityText, selected && { color: tone, fontWeight: '800' }]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Tags</Text>
                <TextInput
                  value={form.tags}
                  onChangeText={(value) => setForm((current) => ({ ...current, tags: value }))}
                  placeholder="Comma separated (e.g. media, urgent)"
                  placeholderTextColor={colors.text.secondary}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>City (optional)</Text>
                <TextInput
                  value={form.city}
                  onChangeText={(value) => setForm((current) => ({ ...current, city: value }))}
                  placeholder="City context"
                  placeholderTextColor={colors.text.secondary}
                  style={styles.input}
                />

                <View style={styles.switchCard}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Create linked seva task</Text>
                    <Text style={styles.switchSubtitle}>
                      Makes a trackable task on the Seva Board for the assigned owner.
                    </Text>
                  </View>
                  <Switch
                    value={form.createTask}
                    onValueChange={(value) => setForm((current) => ({ ...current, createTask: value }))}
                    trackColor={{ false: colors.text.secondary, true: colors.status.success }}
                    thumbColor={colors.text.white}
                  />
                </View>

                <View style={styles.modalActions}>
                  <Button mode="outlined" onPress={() => setModalVisible(false)} textColor={colors.primary.maroon}>
                    Cancel
                  </Button>
                  <Button mode="contained" onPress={saveNote} loading={saving} buttonColor={colors.primary.maroon}>
                    {editingNote ? 'Update note' : 'Save note'}
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Portal>

      <FAB icon="plus" color={colors.text.white} style={styles.fab} onPress={openCreateModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.parchment },
  content: { padding: spacing.md, paddingBottom: TAB_BAR_CLEARANCE },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  filterRow: { gap: spacing.sm, paddingBottom: spacing.md, marginBottom: spacing.sm },
  noteCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    padding: spacing.lg,
    ...shadows.soft,
  },
  noteTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  noteCopy: { flex: 1 },
  noteTitle: { ...typography.title, color: colors.primary.maroon },
  noteMeta: { ...typography.bodySm, color: colors.text.secondary, marginTop: spacing.xs },
  noteBody: { ...typography.body, color: colors.text.primary, marginTop: spacing.md },
  metaBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  assignmentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  assignmentText: { ...typography.label, color: colors.primary.maroon, flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.cream,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  actionButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.status.error}12`,
    borderWidth: 1,
    borderColor: `${colors.status.error}44`,
  },
  actionText: { ...typography.label, color: colors.primary.maroon, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 8, 2, 0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background.warmWhite,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '92%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border.gold as string,
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.titleLg, color: colors.primary.maroon },
  modalSubtitle: { ...typography.bodySm, color: colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  fieldLabel: {
    ...typography.micro,
    color: colors.gold.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text.primary,
    fontSize: 15,
  },
  multilineInput: { minHeight: 110, textAlignVertical: 'top' },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.warmWhite,
    marginBottom: spacing.sm,
  },
  assigneeRowActive: {
    borderColor: colors.primary.maroon,
    backgroundColor: 'rgba(128,0,32,0.05)',
  },
  autoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.cream,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  assigneeCopy: { flex: 1 },
  assigneeName: { ...typography.titleSm, color: colors.text.primary },
  assigneeSub: { ...typography.bodySm, color: colors.text.secondary, marginTop: 1 },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
  },
  priorityText: { ...typography.label, color: colors.text.secondary, textTransform: 'capitalize' },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
  },
  switchCopy: { flex: 1 },
  switchTitle: { ...typography.titleSm, color: colors.text.primary },
  switchSubtitle: { ...typography.bodySm, color: colors.text.secondary, marginTop: spacing.xs },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary.maroon,
    ...shadows.maroonGlow,
  },
});
