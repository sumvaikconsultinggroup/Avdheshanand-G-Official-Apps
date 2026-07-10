import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, FAB, Portal } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { SevaTask, Volunteer } from '../../types';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import { AdminHero, AdminMetricCard, AdminSectionHeader, Avatar, Badge } from '../../components/common';

type StatusKey = SevaTask['status'];
type Priority = SevaTask['priority'];
type SevaType = SevaTask['sevaType'];

const STATUS_TONE: Record<string, string> = {
  all: colors.primary.maroon,
  open: colors.gold.dark,
  assigned: colors.primary.maroon,
  in_progress: colors.primary.saffron,
  completed: colors.status.success,
  blocked: colors.status.error,
};

const PRIORITY_TONE: Record<string, string> = {
  low: colors.text.secondary,
  medium: colors.gold.dark,
  high: colors.status.error,
};

const SEVA_TYPES: SevaType[] = ['kitchen', 'cleaning', 'reception', 'social_media', 'event_support', 'travel', 'other'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const STATUS_FILTERS: (StatusKey | 'all')[] = ['all', 'open', 'assigned', 'in_progress', 'completed', 'blocked'];

const pretty = (s?: string) => (s || '').replace(/_/g, ' ');

interface TeamMember {
  _id: string;
  name?: string;
  username?: string;
  role?: string;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  sevaType: 'other' as SevaType,
  city: '',
  dueDate: '',
  shift: '',
  priority: 'medium' as Priority,
  assignedToType: 'team' as NonNullable<SevaTask['assignedToType']>,
  assignedToId: '',
  assignedToName: '',
};

export function SevaBoardScreen() {
  const { admin } = useAuth();
  const [tasks, setTasks] = useState<SevaTask[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<SevaTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusKey | 'all'>('all');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [taskRes, teamRes, volunteerRes] = await Promise.all([
        api.get('/seva-tasks'),
        api.get('/admin/team'),
        api.get('/volunteer?approved=true'),
      ]);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
      const teamData = teamRes.data?.data || teamRes.data || [];
      setTeam(Array.isArray(teamData) ? teamData : []);
      setVolunteers(Array.isArray(volunteerRes.data) ? volunteerRes.data : []);
    } catch (error) {
      console.error('Error fetching seva board data:', error);
      Alert.alert('Error', 'Failed to load seva board.');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const counts = useMemo(() => {
    const by = (s: string) => tasks.filter((t) => t.status === s).length;
    return {
      all: tasks.length,
      open: by('open'),
      assigned: by('assigned'),
      in_progress: by('in_progress'),
      completed: by('completed'),
      blocked: by('blocked'),
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks;
    return tasks.filter((task) => task.status === statusFilter);
  }, [statusFilter, tasks]);

  const openCreateModal = () => {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (task: SevaTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      sevaType: task.sevaType || 'other',
      city: task.city || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : '',
      shift: task.shift || '',
      priority: task.priority || 'medium',
      assignedToType: task.assignedToType || 'team',
      assignedToId: task.assignedToId || '',
      assignedToName: task.assignedToName || '',
    });
    setModalVisible(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) {
      Alert.alert('Title Required', 'Please add a seva title.');
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate || undefined,
      status: editingTask ? editingTask.status : form.assignedToId ? 'assigned' : 'open',
      createdById: admin?._id,
      createdByName: admin?.name || admin?.username,
    };

    try {
      setSaving(true);
      if (editingTask) {
        await api.put(`/seva-tasks/${editingTask._id}`, payload);
      } else {
        await api.post('/seva-tasks', payload);
      }
      setModalVisible(false);
      setEditingTask(null);
      fetchData();
      Alert.alert(
        editingTask ? 'Seva task updated' : 'Seva task created',
        form.assignedToName ? `Assigned to ${form.assignedToName}.` : 'Task added to the board — assign an owner any time.',
      );
    } catch (error) {
      console.error('Error saving seva task:', error);
      Alert.alert('Error', 'Unable to save seva task.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (task: SevaTask, status: StatusKey) => {
    try {
      await api.put(`/seva-tasks/${task._id}`, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating seva task status:', error);
      Alert.alert('Error', 'Unable to update task status.');
    }
  };

  const deleteTask = (task: SevaTask) => {
    Alert.alert('Delete Seva Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/seva-tasks/${task._id}`);
            fetchData();
          } catch (error) {
            console.error('Error deleting seva task:', error);
            Alert.alert('Error', 'Unable to delete task.');
          }
        },
      },
    ]);
  };

  const selectAssignee = (id: string, name: string) => {
    setForm((current) => ({ ...current, assignedToId: id, assignedToName: name }));
  };

  const formatDue = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <AdminHero
              eyebrow="Team execution"
              title="Seva Board"
              subtitle="Assign daily service tasks to team members or volunteers — admin & team only."
              badge={`${counts.open + counts.assigned + counts.in_progress} active`}
              actions={[{ label: 'New task', icon: 'plus', onPress: openCreateModal }]}
            />

            <View style={styles.metricGrid}>
              <AdminMetricCard label="Open" value={counts.open} icon="clipboard-text-outline" tone={colors.gold.dark} />
              <AdminMetricCard label="In progress" value={counts.in_progress} icon="progress-clock" tone={colors.primary.saffron} />
              <AdminMetricCard label="Completed" value={counts.completed} icon="check-decagram-outline" tone={colors.status.success} />
              <AdminMetricCard label="Blocked" value={counts.blocked} icon="alert-octagon-outline" tone={colors.status.error} />
            </View>

            <AdminSectionHeader title="Task board" subtitle="Filter by state and keep the seva moving." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {STATUS_FILTERS.map((item) => (
                <TouchableOpacity key={item} onPress={() => setStatusFilter(item)} activeOpacity={0.8}>
                  <Badge
                    label={pretty(item)}
                    tone={STATUS_TONE[item] || colors.primary.maroon}
                    variant={statusFilter === item ? 'solid' : 'outline'}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWell}>
              <Icon name="hand-heart-outline" size={34} color={colors.primary.saffron} />
            </View>
            <Text style={styles.emptyTitle}>No seva tasks{statusFilter !== 'all' ? ' in this state' : ''}</Text>
            <Text style={styles.emptySub}>Create a task and assign it to a team member or volunteer.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Avatar name={item.assignedToName || undefined} size={44} />
              <View style={styles.cardTopText}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.metaInline}>
                  <Icon name="account-outline" size={13} color={colors.text.secondary} />
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.assignedToName || 'Unassigned'}{item.assignedToType ? ` · ${item.assignedToType}` : ''}
                  </Text>
                </View>
              </View>
              <Badge label={pretty(item.status)} tone={STATUS_TONE[item.status] || colors.primary.maroon} variant="soft" dot />
            </View>

            {item.description ? <Text style={styles.description} numberOfLines={3}>{item.description}</Text> : null}

            <View style={styles.metaRow}>
              <Badge label={pretty(item.sevaType)} tone={colors.primary.maroon} variant="soft" icon="tag-outline" />
              <Badge label={`${item.priority} priority`} tone={PRIORITY_TONE[item.priority] || colors.gold.dark} variant="soft" icon="flag-outline" />
              {item.city ? <Badge label={item.city} tone={colors.gold.dark} variant="soft" icon="map-marker-outline" /> : null}
              {item.linkedNoteId ? <Badge label="From smart note" tone={colors.primary.maroon} variant="soft" icon="note-text-outline" /> : null}
            </View>

            {item.dueDate || item.shift ? (
              <View style={styles.metaRow}>
                {item.dueDate ? (
                  <View style={styles.metaInline}>
                    <Icon name="calendar-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.meta}>Due {formatDue(item.dueDate)}</Text>
                  </View>
                ) : null}
                {item.shift ? (
                  <View style={styles.metaInline}>
                    <Icon name="clock-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.meta}>{item.shift}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                <Icon name="pencil-outline" size={15} color={colors.primary.maroon} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              {item.status !== 'in_progress' && item.status !== 'completed' ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item, 'in_progress')}>
                  <Icon name="play-circle-outline" size={15} color={colors.primary.saffron} />
                  <Text style={styles.actionText}>Start</Text>
                </TouchableOpacity>
              ) : null}
              {item.status !== 'completed' ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item, 'completed')}>
                  <Icon name="check-decagram-outline" size={15} color={colors.status.success} />
                  <Text style={styles.actionText}>Done</Text>
                </TouchableOpacity>
              ) : null}
              {item.status !== 'blocked' && item.status !== 'completed' ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item, 'blocked')}>
                  <Icon name="alert-octagon-outline" size={15} color={colors.status.error} />
                  <Text style={styles.actionText}>Block</Text>
                </TouchableOpacity>
              ) : null}
              {item.status === 'completed' || item.status === 'blocked' ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item, item.assignedToId ? 'assigned' : 'open')}>
                  <Icon name="refresh" size={15} color={colors.primary.maroon} />
                  <Text style={styles.actionText}>Reopen</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.actionBtnDanger} onPress={() => deleteTask(item)}>
                <Icon name="delete-outline" size={15} color={colors.status.error} />
                <Text style={[styles.actionText, { color: colors.status.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Portal>
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{editingTask ? 'Edit Seva Task' : 'Create Seva Task'}</Text>
                <Text style={styles.modalSubtitle}>Assign a task to a team member or approved volunteer and track it to completion.</Text>

                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput value={form.title} onChangeText={(v) => setForm((c) => ({ ...c, title: v }))} placeholder="Seva title" placeholderTextColor={colors.text.secondary} style={styles.input} />

                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput value={form.description} onChangeText={(v) => setForm((c) => ({ ...c, description: v }))} placeholder="What needs to be done" placeholderTextColor={colors.text.secondary} style={[styles.input, styles.multilineInput]} multiline />

                {/* Seva type */}
                <Text style={styles.fieldLabel}>Seva type</Text>
                <View style={styles.chipWrapRow}>
                  {SEVA_TYPES.map((t) => {
                    const selected = form.sevaType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.selectChip, selected && styles.selectChipActive]}
                        onPress={() => setForm((c) => ({ ...c, sevaType: t }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.selectChipText, selected && styles.selectChipTextActive]}>{pretty(t)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Priority */}
                <Text style={styles.fieldLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.map((p) => {
                    const selected = form.priority === p;
                    const tone = PRIORITY_TONE[p];
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[styles.priorityChip, selected && { backgroundColor: `${tone}1A`, borderColor: tone }]}
                        onPress={() => setForm((c) => ({ ...c, priority: p }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.priorityText, selected && { color: tone, fontWeight: '800' }]}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Due date + shift + city */}
                <Text style={styles.fieldLabel}>Due date</Text>
                <TouchableOpacity style={styles.dateField} onPress={() => setDatePickerVisible(true)} activeOpacity={0.8}>
                  <Icon name="calendar-month-outline" size={20} color={colors.primary.maroon} />
                  <Text style={[styles.dateValue, !form.dueDate && styles.datePlaceholder]}>
                    {form.dueDate ? formatDue(form.dueDate) : 'Tap to select a date (optional)'}
                  </Text>
                  {form.dueDate ? (
                    <TouchableOpacity onPress={() => setForm((c) => ({ ...c, dueDate: '' }))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="close-circle" size={18} color={colors.text.secondary} />
                    </TouchableOpacity>
                  ) : (
                    <Icon name="chevron-down" size={20} color={colors.gold.dark} />
                  )}
                </TouchableOpacity>
                {datePickerVisible ? (
                  <DateTimePicker
                    value={form.dueDate ? new Date(form.dueDate) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(e, date) => {
                      setDatePickerVisible(false);
                      if (e.type === 'set' && date) setForm((c) => ({ ...c, dueDate: date.toISOString() }));
                    }}
                  />
                ) : null}

                <Text style={styles.fieldLabel}>Shift / time window</Text>
                <TextInput value={form.shift} onChangeText={(v) => setForm((c) => ({ ...c, shift: v }))} placeholder="e.g. Morning 6–9 AM" placeholderTextColor={colors.text.secondary} style={styles.input} />

                <Text style={styles.fieldLabel}>City</Text>
                <TextInput value={form.city} onChangeText={(v) => setForm((c) => ({ ...c, city: v }))} placeholder="City (optional)" placeholderTextColor={colors.text.secondary} style={styles.input} />

                {/* Assignee */}
                <Text style={styles.fieldLabel}>Assign to</Text>
                <View style={styles.toggleRow}>
                  {(['team', 'volunteer'] as const).map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.toggleButton, form.assignedToType === item && styles.toggleButtonActive]}
                      onPress={() => setForm((c) => ({ ...c, assignedToType: item, assignedToId: '', assignedToName: '' }))}
                    >
                      <Text style={[styles.toggleText, form.assignedToType === item && styles.toggleTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {form.assignedToType === 'team'
                  ? team.map((m) => {
                      const selected = form.assignedToId === m._id;
                      const name = m.name || m.username || 'Team Member';
                      return (
                        <TouchableOpacity key={m._id} style={[styles.assigneeRow, selected && styles.assigneeRowActive]} onPress={() => selectAssignee(m._id, name)} activeOpacity={0.8}>
                          <Avatar name={name} size={34} />
                          <View style={styles.assigneeCopy}>
                            <Text style={styles.assigneeName} numberOfLines={1}>{name}{m.role ? `  ·  ${m.role}` : ''}</Text>
                            {m.username ? <Text style={styles.assigneeSub} numberOfLines={1}>@{m.username}</Text> : null}
                          </View>
                          {selected ? <Icon name="check-circle" size={20} color={colors.primary.maroon} /> : null}
                        </TouchableOpacity>
                      );
                    })
                  : volunteers.map((v) => {
                      const selected = form.assignedToId === v._id;
                      return (
                        <TouchableOpacity key={v._id} style={[styles.assigneeRow, selected && styles.assigneeRowActive]} onPress={() => selectAssignee(v._id, v.fullName)} activeOpacity={0.8}>
                          <Avatar name={v.fullName} size={34} />
                          <View style={styles.assigneeCopy}>
                            <Text style={styles.assigneeName} numberOfLines={1}>{v.fullName}</Text>
                            {v.location ? <Text style={styles.assigneeSub} numberOfLines={1}>{v.location}</Text> : null}
                          </View>
                          {selected ? <Icon name="check-circle" size={20} color={colors.primary.maroon} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                {(form.assignedToType === 'team' ? team.length : volunteers.length) === 0 ? (
                  <Text style={styles.emptyAssignee}>
                    No {form.assignedToType === 'team' ? 'team members' : 'approved volunteers'} available yet.
                  </Text>
                ) : null}

                <View style={styles.modalActions}>
                  <Button mode="outlined" onPress={() => setModalVisible(false)} textColor={colors.primary.maroon}>Cancel</Button>
                  <Button mode="contained" onPress={saveTask} loading={saving} buttonColor={colors.primary.maroon}>
                    {editingTask ? 'Update task' : 'Create task'}
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
  content: { padding: spacing.md, paddingBottom: 96 },
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
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    padding: spacing.lg,
    ...shadows.soft,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTopText: { flex: 1 },
  cardTitle: { ...typography.title, color: colors.primary.maroon },
  metaInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexShrink: 1 },
  meta: { ...typography.bodySm, color: colors.text.secondary, flexShrink: 1 },
  description: { ...typography.body, marginTop: spacing.md, color: colors.text.primary, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.md, gap: spacing.sm },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.background.cream,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: `${colors.status.error}12`,
    borderWidth: 1,
    borderColor: `${colors.status.error}44`,
  },
  actionText: { ...typography.label, color: colors.primary.maroon, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIconWell: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(163,18,58,0.08)',
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.title, color: colors.primary.maroon },
  emptySub: { ...typography.body, color: colors.text.secondary, marginTop: spacing.sm, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,8,2,0.5)', justifyContent: 'flex-end' },
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
  multilineInput: { minHeight: 90, textAlignVertical: 'top' },
  chipWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  selectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
  },
  selectChipActive: { backgroundColor: colors.primary.maroon, borderColor: colors.primary.maroon },
  selectChipText: { ...typography.label, color: colors.text.secondary, textTransform: 'capitalize' },
  selectChipTextActive: { color: colors.text.white, fontWeight: '700' },
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
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateValue: { ...typography.body, flex: 1, color: colors.text.primary, fontWeight: '600' },
  datePlaceholder: { color: colors.text.secondary, fontWeight: '400' },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.full,
  },
  toggleButtonActive: { backgroundColor: `${colors.primary.maroon}12`, borderColor: colors.primary.maroon },
  toggleText: { ...typography.label, color: colors.text.secondary, textTransform: 'capitalize' },
  toggleTextActive: { color: colors.primary.maroon, fontWeight: '800' },
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
  assigneeRowActive: { borderColor: colors.primary.maroon, backgroundColor: 'rgba(128,0,32,0.05)' },
  assigneeCopy: { flex: 1 },
  assigneeName: { ...typography.titleSm, color: colors.text.primary },
  assigneeSub: { ...typography.bodySm, color: colors.text.secondary, marginTop: 1 },
  emptyAssignee: { ...typography.bodySm, color: colors.text.secondary, fontStyle: 'italic', marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, backgroundColor: colors.primary.maroon, ...shadows.maroonGlow },
});
