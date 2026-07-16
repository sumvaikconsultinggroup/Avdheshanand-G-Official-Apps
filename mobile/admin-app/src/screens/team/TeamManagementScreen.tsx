/**
 * Team Management Screen for Admin Mobile App
 *
 * A SUPER ADMIN can:
 *   - add / deactivate / reactivate team members
 *   - assign a role (Admin / Editor / Moderator / Viewer)
 *   - and, per module, dial the exact access level: None / View / Edit / Full
 *
 * The permission map saved here is stored on the member's record AND baked into
 * their JWT, and `dashboard-next` middleware enforces it on every single API
 * request. So this screen is not cosmetic — it is the real access control.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, Alert, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, spacing, borderRadius, TAB_BAR_CLEARANCE } from '../../theme';
import { Badge } from '../../components/common';
import api from '../../services/api';
import {
  usePermissions,
  ROLE_TEMPLATES,
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ACCESS_LEVELS,
  MODULE_GROUPS,
  MODULE_LABELS,
  ALL_MODULE_IDS,
  mapToAccessLevels,
  accessLevelsToMap,
  countVisibleModules,
  type AccessLevel,
} from '../../context/PermissionContext';
import type { ModuleId, PermissionMap, RoleName } from '../../context/PermissionContext';

interface TeamMember {
  _id: string;
  name: string;
  username: string;
  email?: string;
  role?: RoleName;
  permissions?: PermissionMap;
  isActive?: boolean;
  createdAt?: string;
}

const ROLE_COLORS: Record<RoleName, string> = {
  superadmin: colors.primary.maroon,
  admin: colors.primary.saffron,
  editor: colors.gold.dark,
  moderator: '#6D28D9',
  viewer: '#6B7280',
};

const UNASSIGNED_COLOR = '#9AA0A6';
const TOTAL_MODULES = ALL_MODULE_IDS.length;

/** Older admin records have no `role` — treat that as "not set", not as blank. */
function getRoleOf(member: TeamMember): RoleName | null {
  return member.role && member.role in ROLE_LABELS ? member.role : null;
}

/** Usernames are often already an email — don't render "@name@domain.com". */
function formatHandle(member: TeamMember) {
  const handle = member.email || member.username || '';
  return handle.includes('@') ? handle : `@${handle}`;
}

/** The map actually in force for a member: their custom one, else the role template. */
function effectiveMap(member: TeamMember): PermissionMap {
  if (member.permissions && Object.keys(member.permissions).length > 0) return member.permissions;
  const role = getRoleOf(member);
  return role ? ROLE_TEMPLATES[role] : {};
}

// ─── Per-module access level segmented control ───────────────────────

function LevelSelector({
  value,
  onChange,
}: {
  value: AccessLevel;
  onChange: (level: AccessLevel) => void;
}) {
  return (
    <View style={styles.levelBar}>
      {ACCESS_LEVELS.map((lvl) => {
        const active = value === lvl.id;
        return (
          <TouchableOpacity
            key={lvl.id}
            onPress={() => onChange(lvl.id)}
            activeOpacity={0.8}
            style={[styles.levelChip, active && styles.levelChipActive]}
          >
            <Text style={[styles.levelChipText, active && styles.levelChipTextActive]}>
              {lvl.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── The module permission editor ────────────────────────────────────

function PermissionEditor({
  levels,
  onChange,
  onResetToRole,
  roleLabel,
}: {
  levels: Record<ModuleId, AccessLevel>;
  onChange: (module: ModuleId, level: AccessLevel) => void;
  onResetToRole: () => void;
  roleLabel: string;
}) {
  const visible = ALL_MODULE_IDS.filter((m) => levels[m] && levels[m] !== 'none').length;

  return (
    <View style={styles.editorWrap}>
      <View style={styles.editorHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.editorTitle}>Module access</Text>
          <Text style={styles.editorSubtitle}>
            {visible} of {TOTAL_MODULES} modules visible
          </Text>
        </View>
        <TouchableOpacity onPress={onResetToRole} style={styles.resetBtn} activeOpacity={0.8}>
          <Icon name="restore" size={14} color={colors.primary.maroon} />
          <Text style={styles.resetBtnText}>Reset to {roleLabel}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.editorHint}>
        Fine-tune what this person can reach. “None” hides the module completely;
        “Full” also allows delete, export and approve.
      </Text>

      {MODULE_GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.modules.map((m) => (
            <View key={m} style={styles.moduleRow}>
              <Text style={styles.moduleName} numberOfLines={1}>
                {MODULE_LABELS[m]}
              </Text>
              <LevelSelector value={levels[m] || 'none'} onChange={(lvl) => onChange(m, lvl)} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────

export function TeamManagementScreen() {
  const { role: myRole } = usePermissions();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [accessTarget, setAccessTarget] = useState<TeamMember | null>(null);

  // Access modal state
  const [pendingRole, setPendingRole] = useState<RoleName>('viewer');
  const [pendingLevels, setPendingLevels] = useState<Record<ModuleId, AccessLevel>>(
    mapToAccessLevels(ROLE_TEMPLATES.viewer)
  );

  // Add form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleName>('editor');
  const [newLevels, setNewLevels] = useState<Record<ModuleId, AccessLevel>>(
    mapToAccessLevels(ROLE_TEMPLATES.editor)
  );
  const [customizeNew, setCustomizeNew] = useState(false);

  // Only a super admin can manage roles/permissions — the API enforces this too.
  const isSuperadmin = myRole === 'superadmin';

  const fetchTeam = useCallback(async () => {
    try {
      const res = await api.get('/admin/team');
      const data = res.data?.data || res.data || [];
      setTeam(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  // Seed the editor from the member's CURRENT role + effective map each time it opens.
  useEffect(() => {
    if (!accessTarget) return;
    const role = getRoleOf(accessTarget) ?? 'viewer';
    setPendingRole(role);
    setPendingLevels(mapToAccessLevels(effectiveMap(accessTarget)));
  }, [accessTarget]);

  /** Choosing a role reseeds every module to that role's defaults. */
  const selectPendingRole = (r: RoleName) => {
    setPendingRole(r);
    setPendingLevels(mapToAccessLevels(ROLE_TEMPLATES[r]));
  };

  const selectNewRole = (r: RoleName) => {
    setNewRole(r);
    setNewLevels(mapToAccessLevels(ROLE_TEMPLATES[r]));
  };

  const originalRole = accessTarget ? (getRoleOf(accessTarget) ?? null) : null;
  const originalLevels = useMemo(
    () => (accessTarget ? mapToAccessLevels(effectiveMap(accessTarget)) : null),
    [accessTarget]
  );

  const accessDirty = useMemo(() => {
    if (!accessTarget || !originalLevels) return false;
    if (pendingRole !== originalRole) return true;
    return ALL_MODULE_IDS.some((m) => pendingLevels[m] !== originalLevels[m]);
  }, [accessTarget, originalLevels, originalRole, pendingRole, pendingLevels]);

  const resetAddForm = () => {
    setNewName(''); setNewUsername(''); setNewEmail(''); setNewPassword('');
    setNewRole('editor');
    setNewLevels(mapToAccessLevels(ROLE_TEMPLATES.editor));
    setCustomizeNew(false);
  };

  const handleAddMember = async () => {
    if (!newName.trim() || !newUsername.trim() || !newPassword) {
      Alert.alert('Missing details', 'Name, username and password are all required.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/team', {
        name: newName.trim(),
        username: newUsername.trim(),
        email: newEmail.trim() || undefined,
        password: newPassword,
        role: newRole,
        permissions: accessLevelsToMap(newLevels),
      });
      const name = newName.trim();
      setShowAddModal(false);
      resetAddForm();
      fetchTeam();
      Alert.alert('Member added', `${name} can now sign in as ${ROLE_LABELS[newRole]}.`);
    } catch (err: any) {
      Alert.alert(
        'Could not add member',
        err?.response?.data?.message || 'Failed to add team member.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccess = async () => {
    if (!accessTarget) return;
    setSaving(true);
    try {
      await api.put('/admin/team', {
        id: accessTarget._id,
        role: pendingRole,
        permissions: accessLevelsToMap(pendingLevels),
      });
      const name = accessTarget.name;
      const visible = ALL_MODULE_IDS.filter((m) => pendingLevels[m] !== 'none').length;
      setAccessTarget(null);
      fetchTeam();
      Alert.alert(
        'Access updated',
        `${name} is now ${ROLE_LABELS[pendingRole]} with access to ${visible} of ${TOTAL_MODULES} modules.`
      );
    } catch (err: any) {
      Alert.alert(
        'Could not update access',
        err?.response?.data?.message || 'Failed to update access.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (member: TeamMember) => {
    Alert.alert(
      'Deactivate member',
      `${member.name} will immediately lose access to the admin app. You can reactivate them later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/team?id=${member._id}`);
              fetchTeam();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to deactivate member.');
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async (member: TeamMember) => {
    try {
      await api.put('/admin/team', { id: member._id, isActive: true });
      fetchTeam();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reactivate member.');
    }
  };

  const renderRoleOption = (r: RoleName, selected: boolean, onSelect: () => void) => {
    const tone = ROLE_COLORS[r];
    return (
      <TouchableOpacity
        key={r}
        onPress={onSelect}
        activeOpacity={0.85}
        style={[styles.roleRow, selected && { borderColor: tone, backgroundColor: `${tone}12` }]}
      >
        <View style={[styles.radio, selected && { borderColor: tone }]}>
          {selected && <View style={[styles.radioDot, { backgroundColor: tone }]} />}
        </View>
        <View style={styles.roleRowText}>
          <Text style={[styles.roleName, selected && { color: tone }]}>{ROLE_LABELS[r]}</Text>
          <Text style={styles.roleDesc}>{ROLE_DESCRIPTIONS[r]}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.centeredText}>Loading team…</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTeam(); }}
            tintColor={colors.primary.maroon}
            colors={[colors.primary.maroon]}
            progressBackgroundColor={colors.background.warmWhite}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>Team Management</Text>
            <Text style={styles.subtitle}>
              {team.length} {team.length === 1 ? 'team member' : 'team members'}
            </Text>
          </View>
          {isSuperadmin && (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)} activeOpacity={0.9}>
              <Icon name="account-plus" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isSuperadmin && (
          <View style={styles.notice}>
            <Icon name="shield-lock-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.noticeText}>
              Only a super admin can change roles or module access.
            </Text>
          </View>
        )}

        {team.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="account-group-outline" size={44} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No team members yet</Text>
            <Text style={styles.emptyText}>Add your first member to give them admin access.</Text>
          </View>
        )}

        {team.map((member) => {
          const role = getRoleOf(member);
          const tone = role ? ROLE_COLORS[role] : UNASSIGNED_COLOR;
          const inactive = member.isActive === false;
          const isSuper = role === 'superadmin';
          const moduleCount = countVisibleModules(effectiveMap(member));

          return (
            <View key={member._id} style={[styles.memberCard, inactive && styles.inactiveCard]}>
              <View style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: tone }]}>
                  <Text style={styles.avatarText}>
                    {(member.name?.trim()?.charAt(0) || '?').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>{member.name || 'Unnamed'}</Text>
                  <Text style={styles.memberHandle} numberOfLines={1}>{formatHandle(member)}</Text>
                  <View style={styles.badgeRow}>
                    {role ? (
                      <Badge label={ROLE_LABELS[role]} tone={tone} variant="soft" />
                    ) : (
                      <Badge label="No role set" tone={UNASSIGNED_COLOR} variant="outline" />
                    )}
                    {role && (
                      <Badge
                        label={`${moduleCount}/${TOTAL_MODULES} modules`}
                        tone={colors.text.secondary}
                        variant="outline"
                      />
                    )}
                    {inactive && <Badge label="Inactive" tone="#EF4444" variant="outline" />}
                  </View>
                </View>

                {isSuperadmin && !isSuper && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => setAccessTarget(member)}
                      style={styles.actionBtn}
                      accessibilityLabel={`Manage access for ${member.name}`}
                    >
                      <Icon name="shield-edit" size={19} color={colors.primary.saffron} />
                    </TouchableOpacity>
                    {inactive ? (
                      <TouchableOpacity
                        onPress={() => handleReactivate(member)}
                        style={[styles.actionBtn, styles.actionBtnSuccess]}
                        accessibilityLabel={`Reactivate ${member.name}`}
                      >
                        <Icon name="account-check" size={19} color="#15803D" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDeactivate(member)}
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        accessibilityLabel={`Deactivate ${member.name}`}
                      >
                        <Icon name="account-off" size={19} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {!role && isSuperadmin && !isSuper && (
                <Text style={styles.roleHint}>
                  This member has no role, so their access is undefined. Tap the shield to set one.
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ─── Add Member ─────────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Add team member</Text>
                <Text style={styles.modalSubtitle}>
                  They will be able to sign in to the admin app straight away.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <Icon name="close" size={20} color={colors.primary.maroon} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Full name</Text>
              <TextInput
                style={styles.input} placeholder="e.g. Chirag Tyagi"
                placeholderTextColor={colors.text.secondary}
                value={newName} onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input} placeholder="Used to sign in"
                placeholderTextColor={colors.text.secondary}
                value={newUsername} onChangeText={setNewUsername}
                autoCapitalize="none" autoCorrect={false}
              />

              <Text style={styles.inputLabel}>Email <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input} placeholder="name@avdheshanandg.org"
                placeholderTextColor={colors.text.secondary}
                value={newEmail} onChangeText={setNewEmail}
                autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input} placeholder="At least 6 characters"
                placeholderTextColor={colors.text.secondary}
                value={newPassword} onChangeText={setNewPassword} secureTextEntry
              />

              <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Role</Text>
              <Text style={styles.inputHint}>This sets their starting module access.</Text>
              {ASSIGNABLE_ROLES.map((r) => renderRoleOption(r, newRole === r, () => selectNewRole(r)))}

              <TouchableOpacity
                style={styles.customizeToggle}
                onPress={() => setCustomizeNew((v) => !v)}
                activeOpacity={0.8}
              >
                <Icon
                  name={customizeNew ? 'chevron-down' : 'chevron-right'}
                  size={20}
                  color={colors.primary.maroon}
                />
                <Text style={styles.customizeToggleText}>
                  {customizeNew ? 'Hide module access' : 'Customize module access'}
                </Text>
                <Badge
                  label={`${ALL_MODULE_IDS.filter((m) => newLevels[m] !== 'none').length}/${TOTAL_MODULES}`}
                  tone={colors.primary.maroon}
                  variant="soft"
                />
              </TouchableOpacity>

              {customizeNew && (
                <PermissionEditor
                  levels={newLevels}
                  onChange={(m, lvl) => setNewLevels((prev) => ({ ...prev, [m]: lvl }))}
                  onResetToRole={() => setNewLevels(mapToAccessLevels(ROLE_TEMPLATES[newRole]))}
                  roleLabel={ROLE_LABELS[newRole]}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, saving && styles.btnDisabled]}
                onPress={handleAddMember}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.confirmBtnText}>Add member</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Role + module access ───────────────────────────────── */}
      <Modal visible={!!accessTarget} animationType="slide" transparent onRequestClose={() => setAccessTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Role & access</Text>
                <Text style={styles.modalSubtitle}>
                  Set what {accessTarget?.name || 'this member'} can reach, then save.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAccessTarget(null)} style={styles.closeBtn} accessibilityLabel="Close">
                <Icon name="close" size={20} color={colors.primary.maroon} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Role</Text>
              <Text style={styles.inputHint}>Picking a role resets module access to its defaults.</Text>
              {ASSIGNABLE_ROLES.map((r) =>
                renderRoleOption(r, pendingRole === r, () => selectPendingRole(r))
              )}

              <PermissionEditor
                levels={pendingLevels}
                onChange={(m, lvl) => setPendingLevels((prev) => ({ ...prev, [m]: lvl }))}
                onResetToRole={() => setPendingLevels(mapToAccessLevels(ROLE_TEMPLATES[pendingRole]))}
                roleLabel={ROLE_LABELS[pendingRole]}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAccessTarget(null)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!accessDirty || saving) && styles.btnDisabled]}
                onPress={handleSaveAccess}
                disabled={!accessDirty || saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.confirmBtnText}>Save access</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.parchment },
  content: { paddingBottom: TAB_BAR_CLEARANCE },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.background.parchment,
  },
  centeredText: { color: colors.text.secondary, fontSize: 14 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary.maroon },
  subtitle: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary.maroon,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  notice: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border.gold as string,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.text.secondary },

  emptyState: {
    alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.lg, marginTop: spacing.xl, padding: spacing.xl,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border.gold as string,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.primary.maroon, marginTop: spacing.sm },
  emptyText: { fontSize: 13, color: colors.text.secondary, textAlign: 'center' },

  memberCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border.gold as string,
    padding: spacing.md,
  },
  inactiveCard: { opacity: 0.68 },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  memberInfo: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  memberName: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  memberHandle: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 6 },
  roleHint: { marginTop: spacing.sm, fontSize: 12, lineHeight: 17, color: colors.text.secondary },

  actions: { flexDirection: 'row', gap: spacing.sm, flexShrink: 0 },
  actionBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${colors.primary.saffron}14`,
  },
  actionBtnDanger: { backgroundColor: 'rgba(220,38,38,0.10)' },
  actionBtnSuccess: { backgroundColor: 'rgba(21,128,61,0.10)' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background.warmWhite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    maxHeight: '90%',
  },
  grabber: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)', marginTop: spacing.sm, marginBottom: spacing.md,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.primary.maroon },
  modalSubtitle: { fontSize: 13, lineHeight: 19, color: colors.text.primary, opacity: 0.75, marginTop: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${colors.primary.maroon}12`,
  },
  modalBody: { marginTop: spacing.md },

  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.text.primary, marginBottom: 6 },
  optional: { fontWeight: '500', color: colors.text.secondary },
  inputHint: { fontSize: 12, color: colors.text.secondary, marginTop: -2, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    fontSize: 15, color: colors.text.primary,
    backgroundColor: colors.background.parchment,
    marginBottom: spacing.md,
  },

  roleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.parchment,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#C9BCA8',
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  roleRowText: { flex: 1 },
  roleName: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  roleDesc: { fontSize: 12, lineHeight: 17, color: colors.text.secondary, marginTop: 2 },

  customizeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, marginTop: spacing.xs,
  },
  customizeToggleText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primary.maroon },

  editorWrap: {
    marginTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border.gold as string,
    paddingTop: spacing.md,
  },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  editorTitle: { fontSize: 15, fontWeight: '800', color: colors.primary.maroon },
  editorSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border.gold as string,
  },
  resetBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary.maroon },
  editorHint: {
    fontSize: 12, lineHeight: 17, color: colors.text.secondary,
    marginTop: spacing.sm, marginBottom: spacing.md,
  },

  group: { marginBottom: spacing.md },
  groupTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase',
    color: colors.gold.dark, marginBottom: spacing.sm,
  },
  moduleRow: {
    marginBottom: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border.gold as string,
    backgroundColor: colors.background.parchment,
  },
  moduleName: { fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },

  levelBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1, borderColor: colors.border.gold as string,
  },
  levelChip: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, borderRadius: borderRadius.full,
  },
  levelChipActive: { backgroundColor: colors.primary.maroon },
  levelChipText: { fontSize: 12, fontWeight: '700', color: colors.text.secondary },
  levelChipTextActive: { color: '#fff' },

  modalFooter: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.sm + 4, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border.gold as string, alignItems: 'center',
  },
  cancelBtnText: { color: colors.primary.maroon, fontWeight: '700', fontSize: 15 },
  confirmBtn: {
    flex: 1, paddingVertical: spacing.sm + 4, borderRadius: borderRadius.md,
    backgroundColor: colors.primary.maroon, alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.45 },
});
