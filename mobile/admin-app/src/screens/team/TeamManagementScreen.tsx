/**
 * Team Management Screen for Admin Mobile App
 * Superadmins and admins can manage team members, roles, and permissions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, TextInput, Modal,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { Badge } from '../../components/common';
import api from '../../services/api';
import { usePermissions, ROLE_TEMPLATES } from '../../context/PermissionContext';
import type { RoleName } from '../../context/PermissionContext';

interface TeamMember {
  _id: string;
  name: string;
  username: string;
  email?: string;
  role: RoleName;
  permissions?: Record<string, unknown>;
  isActive?: boolean;
  createdAt?: string;
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: colors.primary.maroon,
  admin: colors.primary.saffron, // crimson accent
  editor: colors.gold.dark,
  moderator: '#6D28D9',
  viewer: '#6B7280',
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  moderator: 'Moderator',
  viewer: 'Viewer',
};

export function TeamManagementScreen() {
  const { role: myRole, can } = usePermissions();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<TeamMember | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleName>('editor');

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

  const handleAddMember = async () => {
    if (!newName || !newUsername || !newPassword) {
      Alert.alert('Missing Fields', 'Name, username, and password are required');
      return;
    }
    try {
      await api.post('/admin/team', {
        name: newName, username: newUsername, password: newPassword, role: newRole,
        permissions: ROLE_TEMPLATES[newRole],
      });
      Alert.alert('Success', 'Team member added successfully');
      setShowAddModal(false);
      setNewName(''); setNewUsername(''); setNewPassword(''); setNewRole('editor');
      fetchTeam();
    } catch {
      Alert.alert('Error', 'Failed to add team member');
    }
  };

  const handleUpdateRole = async (member: TeamMember, newMemberRole: RoleName) => {
    try {
      await api.put('/admin/team', {
        id: member._id, role: newMemberRole,
        permissions: ROLE_TEMPLATES[newMemberRole],
      });
      Alert.alert('Success', `${member.name}'s role updated to ${ROLE_LABELS[newMemberRole]}`);
      setShowRoleModal(null);
      fetchTeam();
    } catch {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const handleDeactivate = (member: TeamMember) => {
    Alert.alert(
      'Deactivate Member',
      `Are you sure you want to deactivate ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/team?id=${member._id}`);
              Alert.alert('Success', 'Team member deactivated');
              fetchTeam();
            } catch { Alert.alert('Error', 'Failed to deactivate'); }
          },
        },
      ]
    );
  };

  const canManageTeam = myRole === 'superadmin' || myRole === 'admin';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTeam(); }} tintColor={colors.primary.maroon} colors={[colors.primary.maroon]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>Team Management</Text>
          <Text style={styles.subtitle}>{team.length} team members</Text>
        </View>
        {canManageTeam && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)} activeOpacity={0.9}>
            <Icon name="account-plus" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Team List */}
      {team.map(member => (
        <View key={member._id} style={[styles.memberCard, !member.isActive && styles.inactiveCard]}>
          <View style={styles.memberRow}>
            <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[member.role] || '#6B7280' }]}>
              <Text style={styles.avatarText}>{member.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
              <Text style={styles.memberUsername} numberOfLines={1}>@{member.username}</Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={ROLE_LABELS[member.role] || member.role}
                  tone={ROLE_COLORS[member.role] || '#6B7280'}
                  variant="soft"
                />
                {member.isActive === false && (
                  <Badge label="Inactive" tone={colors.text.secondary} variant="outline" />
                )}
              </View>
            </View>
            {canManageTeam && member.role !== 'superadmin' && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => setShowRoleModal(member)} style={styles.actionBtn}>
                  <Icon name="shield-edit" size={18} color={colors.primary.saffron} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeactivate(member)} style={styles.actionBtn}>
                  <Icon name="account-off" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ))}

      {/* Add Member Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Team Member</Text>
            <TextInput style={styles.input} placeholder="Full Name" value={newName} onChangeText={setNewName} />
            <TextInput style={styles.input} placeholder="Username" value={newUsername} onChangeText={setNewUsername} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Text style={styles.inputLabel}>Role:</Text>
            <View style={styles.roleOptions}>
              {(['admin', 'editor', 'moderator', 'viewer'] as RoleName[]).map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewRole(r)}
                  style={[styles.roleOption, newRole === r && { backgroundColor: ROLE_COLORS[r] + '30', borderColor: ROLE_COLORS[r] }]}
                >
                  <Text style={[styles.roleOptionText, newRole === r && { color: ROLE_COLORS[r], fontWeight: '700' }]}>
                    {ROLE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddMember}>
                <Text style={styles.confirmBtnText}>Add Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role Change Modal */}
      <Modal visible={!!showRoleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Role</Text>
            <Text style={styles.modalSubtitle}>Select new role for {showRoleModal?.name}</Text>
            <View style={styles.roleOptions}>
              {(['admin', 'editor', 'moderator', 'viewer'] as RoleName[]).map(r => (
                <TouchableOpacity key={r} onPress={() => showRoleModal && handleUpdateRole(showRoleModal, r)}
                  style={[styles.roleOption, showRoleModal?.role === r && { backgroundColor: ROLE_COLORS[r] + '30', borderColor: ROLE_COLORS[r] }]}
                >
                  <Text style={[styles.roleOptionText, showRoleModal?.role === r && { color: ROLE_COLORS[r], fontWeight: '700' }]}>
                    {ROLE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRoleModal(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.parchment },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary.maroon },
  subtitle: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary.maroon, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  memberCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.background.warmWhite, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.gold as string, padding: spacing.md },
  inactiveCard: { opacity: 0.68 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 6 },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  memberInfo: { flex: 1, marginLeft: spacing.md },
  memberName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  memberUsername: { fontSize: 12, color: colors.text.secondary },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm, marginTop: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primary.maroon, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: 14, color: colors.text.secondary, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: 15, marginBottom: spacing.sm },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs, marginTop: spacing.sm },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  roleOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#E5E7EB' },
  roleOptionText: { fontSize: 13, color: colors.text.secondary },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.sm + 4, borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelBtnText: { color: colors.text.secondary, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: spacing.sm + 4, borderRadius: borderRadius.md, backgroundColor: colors.primary.saffron, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
});
