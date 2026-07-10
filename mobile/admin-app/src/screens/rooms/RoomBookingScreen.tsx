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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  ActivityIndicator,
  FAB,
  Portal,
  Modal,
  TextInput,
  Switch,
  Button,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows, gradients } from '../../theme';
import { Badge } from '../../components/common';
import api from '../../services/api';
import { RoomBooking } from '../../types';

type RoomFormData = {
  name: string;
  place: string;
  price: string;
  occupancy: string;
  description: string;
  available: boolean;
};

const emptyForm: RoomFormData = {
  name: '',
  place: '',
  price: '',
  occupancy: '',
  description: '',
  available: true,
};

export function RoomBookingScreen() {
  const [rooms, setRooms] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomBooking | null>(null);
  const [form, setForm] = useState<RoomFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/roombooking');
      const data = Array.isArray(response.data) ? response.data : [];
      setRooms(data.filter((r: RoomBooking) => !r.isDeleted));
    } catch (err) {
      setError('Failed to load rooms');
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRooms();
  }, [fetchRooms]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const openCreateModal = () => {
    setEditingRoom(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (room: RoomBooking) => {
    setEditingRoom(room);
    setForm({
      name: room.name || '',
      place: room.place || '',
      price: String(room.price || ''),
      occupancy: String(room.occupancy || ''),
      description: room.description || '',
      available: room.available ?? true,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRoom(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Room name is required.');
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      Alert.alert('Validation', 'Valid price is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        place: form.place.trim(),
        price: Number(form.price),
        occupancy: Number(form.occupancy) || 1,
        description: form.description.trim(),
        available: form.available,
      };

      if (editingRoom) {
        await api.put(`/roombooking/${editingRoom._id}`, payload);
      } else {
        await api.post('/roombooking', payload);
      }

      closeModal();
      fetchRooms();
    } catch (err) {
      console.error('Error saving room:', err);
      Alert.alert('Error', 'Failed to save room. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (room: RoomBooking) => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/roombooking/${room._id}`);
              fetchRooms();
            } catch (err) {
              console.error('Error deleting room:', err);
              Alert.alert('Error', 'Failed to delete room.');
            }
          },
        },
      ],
    );
  };

  const renderRoomCard = ({ item }: { item: RoomBooking }) => {
    const isAvailable = item.available && !item.isBooked;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.roomIcon}>
              <MaterialCommunityIcons
                name="bed-king-outline"
                size={26}
                color={colors.primary.maroon}
              />
            </View>
            <View style={styles.roomInfo}>
              <Text style={styles.roomName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.place ? (
                <View style={styles.placeRow}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={13}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.placeText} numberOfLines={1}>
                    {item.place}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.chipAndActions}>
              <Badge
                label={
                  item.isBooked ? 'Booked' : item.available ? 'Available' : 'Unavailable'
                }
                tone={isAvailable ? colors.status.success : colors.status.error}
                variant="soft"
                dot
              />
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>{formatPrice(item.price)}</Text>
              <Text style={styles.detailSubtext}>per night</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Occupancy</Text>
              <Text style={styles.detailValue}>{item.occupancy || 2}</Text>
              <Text style={styles.detailSubtext}>persons</Text>
            </View>
          </View>

          {item.amenities && item.amenities.length > 0 && (
            <View style={styles.amenitiesSection}>
              <View style={styles.amenitiesContainer}>
                {item.amenities.slice(0, 5).map((amenity, index) => (
                  <Badge
                    key={index}
                    label={amenity}
                    tone={colors.gold.dark}
                    variant="soft"
                  />
                ))}
                {item.amenities.length > 5 && (
                  <Text style={styles.moreAmenities}>
                    +{item.amenities.length - 5} more
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="office-building-outline"
        size={56}
        color={colors.gold.dark}
        style={styles.emptyStateIcon}
      />
      <Text style={styles.emptyStateText}>No rooms available</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap + to add a new room listing
      </Text>
    </View>
  );

  const renderHeader = () => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.available && !r.isBooked).length;
    const bookedRooms = rooms.filter((r) => r.isBooked).length;

    return (
      <LinearGradient
        colors={gradients.maroon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryTitle}>Room Overview</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalRooms}</Text>
            <Text style={styles.summaryLabel}>Total Rooms</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.gold.light }]}>
              {availableRooms}
            </Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.background.parchment }]}>
              {bookedRooms}
            </Text>
            <Text style={styles.summaryLabel}>Booked</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderFormModal = () => (
    <Portal>
      <Modal
        visible={modalVisible}
        onDismiss={closeModal}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </Text>

            <TextInput
              label="Room Name *"
              value={form.name}
              onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.border.gold as string}
              activeOutlineColor={colors.primary.saffron}
            />

            <TextInput
              label="Place"
              value={form.place}
              onChangeText={(text) => setForm((f) => ({ ...f, place: text }))}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.border.gold as string}
              activeOutlineColor={colors.primary.saffron}
            />

            <View style={styles.rowInputs}>
              <TextInput
                label="Price (INR) *"
                value={form.price}
                onChangeText={(text) => setForm((f) => ({ ...f, price: text }))}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
                outlineColor={colors.border.gold as string}
                activeOutlineColor={colors.primary.saffron}
              />
              <TextInput
                label="Occupancy"
                value={form.occupancy}
                onChangeText={(text) => setForm((f) => ({ ...f, occupancy: text }))}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
                outlineColor={colors.border.gold as string}
                activeOutlineColor={colors.primary.saffron}
              />
            </View>

            <TextInput
              label="Description"
              value={form.description}
              onChangeText={(text) => setForm((f) => ({ ...f, description: text }))}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              outlineColor={colors.border.gold as string}
              activeOutlineColor={colors.primary.saffron}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Available</Text>
              <Switch
                value={form.available}
                onValueChange={(val) => setForm((f) => ({ ...f, available: val }))}
                color={colors.status.success}
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={closeModal}
                style={styles.cancelButton}
                textColor={colors.text.secondary}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                style={styles.saveButton}
                buttonColor={colors.primary.saffron}
              >
                {editingRoom ? 'Update' : 'Create'}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  if (error && rooms.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRooms}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item._id}
        renderItem={renderRoomCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={rooms.length > 0 ? renderHeader : null}
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

      <FAB
        icon="plus"
        style={styles.fab}
        color={colors.text.white}
        onPress={openCreateModal}
      />

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
    backgroundColor: colors.primary.maroon,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.maroonGlow,
  },
  retryButtonText: {
    color: colors.text.white,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  summaryCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.maroonGlow,
  },
  summaryTitle: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
    fontSize: 28,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roomIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.sandstone,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  roomInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  placeText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
  },
  chipAndActions: {
    alignItems: 'flex-end',
  },
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.sandstone,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gold.dark,
  },
  detailSubtext: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  detailDivider: {
    width: 1,
    backgroundColor: colors.border.gold as string,
    marginHorizontal: spacing.md,
  },
  amenitiesSection: {
    marginTop: spacing.md,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  moreAmenities: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
    gap: spacing.sm,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary.maroon,
  },
  editButtonText: {
    color: colors.text.white,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.status.error,
  },
  deleteButtonText: {
    color: colors.text.white,
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary.maroon,
    borderRadius: borderRadius.full,
    ...shadows.maroonGlow,
  },
  modalContainer: {
    backgroundColor: colors.background.warmWhite,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.maroon,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    borderColor: colors.text.secondary,
  },
  saveButton: {},
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyStateIcon: {
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
