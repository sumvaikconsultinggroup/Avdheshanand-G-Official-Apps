import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Card, Searchbar, ActivityIndicator, IconButton } from 'react-native-paper';
import { colors, spacing, borderRadius } from '../../theme';
import { Avatar, Badge } from '../../components/common';
import api from '../../services/api';
import { User } from '../../types';

export function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/users');
      const data = response.data?.users || response.data || [];
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return colors.primary.maroon;
      case 'moderator':
        return colors.gold.dark;
      default:
        return colors.primary.saffron;
    }
  };

  const renderUserCard = ({ item }: { item: User }) => (
    <TouchableOpacity onPress={() => handleUserPress(item)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Avatar name={item.name} size={50} style={styles.avatarSpacing} />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.name || 'Unknown'}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            <View style={styles.badges}>
              <Badge
                label={(item.role || 'User').toUpperCase()}
                tone={getRoleBadgeColor(item.role)}
                variant="soft"
              />
              {item.isVerified && (
                <Badge label="Verified" tone={colors.status.success} variant="soft" icon="check-decagram" />
              )}
            </View>
          </View>
          <IconButton icon="chevron-right" size={22} iconColor={colors.gold.dark} />
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'No users found matching your search' : 'No users available'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  if (error && users.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search users by name or email"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor={colors.primary.maroon}
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        renderItem={renderUserCard}
        contentContainerStyle={styles.listContent}
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

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <IconButton
                icon="close"
                iconColor={colors.text.primary}
                size={24}
                onPress={() => setModalVisible(false)}
              />
            </View>
            {selectedUser && (
              <View style={styles.modalBody}>
                <Avatar name={selectedUser.name} size={80} style={styles.modalAvatar} />
                <DetailRow label="Name" value={selectedUser.name || 'N/A'} />
                <DetailRow label="Email" value={selectedUser.email} />
                <DetailRow label="Phone" value={selectedUser.phone || 'N/A'} />
                <DetailRow label="Role" value={selectedUser.role || 'User'} />
                <DetailRow
                  label="Auth Method"
                  value={selectedUser.authMethod || 'Email'}
                />
                <DetailRow
                  label="Verified"
                  value={selectedUser.isVerified ? 'Yes' : 'No'}
                />
                <DetailRow
                  label="Joined"
                  value={
                    selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString()
                      : 'N/A'
                  }
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  searchBar: {
    margin: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.md,
    elevation: 2,
  },
  searchInput: {
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold.main,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSpacing: {
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    height: 24,
  },
  chipText: {
    color: colors.text.white,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
  },
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
    maxHeight: '80%',
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
    alignItems: 'center',
  },
  modalAvatar: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
