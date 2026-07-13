import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ActivityIndicator,
  FAB,
  TextInput,
  Button,
  IconButton,
  Portal,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows, gradients } from '../../theme';
import { AdminHero } from '../../components/common';
import api from '../../services/api';
import { pickImage } from '../../services/imageUpload';
import { Book } from '../../types';

type BookFormData = {
  title: string;
  author: string;
  description: string;
  price: string;
  purchaseUrl: string;
  pages: string;
  language: string;
  genre: string;
  ISBN: string;
  publishedDate: string;
  coverImageUri: string | null;
};

const emptyForm: BookFormData = {
  title: '',
  author: '',
  description: '',
  price: '',
  purchaseUrl: '',
  pages: '',
  language: '',
  genre: '',
  ISBN: '',
  publishedDate: '',
  coverImageUri: null,
};

export function BooksScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState<BookFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const toIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fetchBooks = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/allbooks');
      const data = Array.isArray(response.data) ? response.data : [];
      setBooks(data.filter((b: Book) => !b.isDeleted));
    } catch (err) {
      setError('Failed to load books');
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBooks();
  }, [fetchBooks]);

  const showSnackbar = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const openCreateModal = () => {
    setEditingBook(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setForm({
      title: book.title || '',
      author: book.author || '',
      description: book.description || '',
      price: book.price?.toString() || '',
      purchaseUrl: book.purchaseUrl || '',
      pages: book.pages?.toString() || '',
      language: book.language || '',
      genre: book.genre || '',
      ISBN: book.ISBN || '',
      publishedDate: book.publishedDate || '',
      coverImageUri: null,
    });
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    try {
      const uri = await pickImage();
      if (uri) {
        setForm((prev) => ({ ...prev, coverImageUri: uri }));
      }
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to pick image');
    }
  };

  const buildFormData = (): FormData => {
    const existingStock = editingBook?.stock;
    const stockIn = existingStock?.stockIn ?? 0;
    const soldOut = existingStock?.soldOut ?? 0;
    const available = existingStock?.available ?? Math.max(stockIn - soldOut, 0);

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('author', form.author);
    fd.append('description', form.description);
    fd.append('price', form.price);
    if (form.purchaseUrl) fd.append('purchaseUrl', form.purchaseUrl.trim());
    if (form.pages) fd.append('pages', form.pages);
    if (form.language) fd.append('language', form.language);
    if (form.genre) fd.append('genre', form.genre);
    if (form.ISBN) fd.append('ISBN', form.ISBN);
    if (form.publishedDate) fd.append('publishedDate', form.publishedDate);
    fd.append('stock[stockIn]', String(stockIn));
    fd.append('stock[soldOut]', String(soldOut));
    fd.append('stock[available]', String(available));
    fd.append('stock[lastUpdated]', new Date().toISOString());
    if (form.coverImageUri) {
      const filename = form.coverImageUri.split('/').pop() || 'cover.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      fd.append('coverImage', {
        uri: form.coverImageUri,
        name: filename,
        type,
      } as any);
    }
    return fd;
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.author.trim() || !form.price.trim()) {
      showSnackbar('Title, author, and price are required');
      return;
    }
    setSubmitting(true);
    try {
      const fd = buildFormData();
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingBook) {
        await api.put(`/allbooks/${editingBook._id}`, fd, config);
        showSnackbar('Book updated — your changes are now live on the user app and the website.');
      } else {
        await api.post('/allbooks', fd, config);
        showSnackbar('Book published — the new book is now live on the user app and the website.');
      }
      setModalVisible(false);
      fetchBooks();
    } catch (err) {
      console.error('Error saving book:', err);
      showSnackbar('Failed to save book');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (book: Book) => {
    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/allbooks/${book._id}`);
              showSnackbar('Book deleted');
              fetchBooks();
            } catch (err) {
              console.error('Error deleting book:', err);
              showSnackbar('Failed to delete book');
            }
          },
        },
      ],
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStockStatus = (stock?: Book['stock']) => {
    if (!stock) return { label: 'Unknown', color: colors.text.secondary };
    if (stock.available <= 0) return { label: 'Sold Out', color: colors.status.error };
    if (stock.available < 10) return { label: 'Low Stock', color: colors.status.warning };
    return { label: 'In Stock', color: colors.status.success };
  };

  const renderBookCard = ({ item }: { item: Book }) => {
    const stockStatus = getStockStatus(item.stock);
    const metaItems = [
      item.language ? { icon: 'translate', label: item.language } : null,
      item.genre ? { icon: 'tag-outline', label: item.genre } : null,
      item.pages ? { icon: 'file-document-outline', label: `${item.pages} pages` } : null,
    ].filter(Boolean) as { icon: any; label: string }[];

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.coverContainer}>
            {item.coverImage ? (
              <Image source={{ uri: item.coverImage }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <MaterialCommunityIcons name="book-open-page-variant" size={34} color={colors.text.white} />
              </View>
            )}
          </View>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.authorText} numberOfLines={1}>by {item.author || 'Unknown Author'}</Text>

            {metaItems.length > 0 ? (
              <View style={styles.metaChips}>
                {metaItems.map((m) => (
                  <View key={m.label} style={styles.metaChip}>
                    <MaterialCommunityIcons name={m.icon} size={12} color={colors.text.secondary} />
                    <Text style={styles.metaChipText} numberOfLines={1}>{m.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(item.price)}</Text>
              <View style={[styles.stockPill, { borderColor: stockStatus.color, backgroundColor: `${stockStatus.color}14` }]}>
                <View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
                <Text style={[styles.stockPillText, { color: stockStatus.color }]}>
                  {stockStatus.label}
                  {item.stock && item.stock.available > 0 ? ` · ${item.stock.available}` : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerTags}>
            {item.purchaseUrl ? (
              <View style={styles.footerTag}>
                <MaterialCommunityIcons name="open-in-new" size={12} color={colors.gold.dark} />
                <Text style={styles.footerTagText}>Buy link</Text>
              </View>
            ) : null}
            <View style={styles.footerTag}>
              <View style={styles.liveDot} />
              <Text style={styles.footerTagText}>Live on app &amp; site</Text>
            </View>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="pencil" size={16} color={colors.primary.maroon} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.status.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWell}>
        <Text style={styles.emptyStateIcon}>📖</Text>
      </View>
      <Text style={styles.emptyStateText}>No books available</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap + to add your first book
      </Text>
    </View>
  );

  const renderHeader = () => {
    const totalBooks = books.length;
    const inStock = books.filter((b) => (b.stock?.available || 0) > 0).length;
    const outOfStock = totalBooks - inStock;

    return (
      <View>
        <View style={styles.heroWrap}>
          <AdminHero
            eyebrow="Manage"
            title="Books"
            subtitle="Publish once — every book appears instantly on the user app and the website."
            badge={`${books.length} live`}
            actions={[{ label: 'New Book', icon: 'plus', onPress: openCreateModal }]}
          />
        </View>
        <LinearGradient
          colors={gradients.maroon as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryTitle}>Book Inventory</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalBooks}</Text>
            <Text style={styles.summaryLabel}>Total Books</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{inStock}</Text>
            <Text style={styles.summaryLabel}>In Stock</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{outOfStock}</Text>
            <Text style={styles.summaryLabel}>Out of Stock</Text>
          </View>
        </View>
        </LinearGradient>
      </View>
    );
  };

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setModalVisible(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={gradients.maroon as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalHeader}
        >
          <Text style={styles.modalTitle}>
            {editingBook ? 'Edit Book' : 'Add Book'}
          </Text>
          <IconButton
            icon="close"
            size={24}
            iconColor={colors.text.white}
            onPress={() => setModalVisible(false)}
          />
        </LinearGradient>
        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.publishBanner}>
            <MaterialCommunityIcons
              name="broadcast"
              size={20}
              color={colors.status.success}
              style={styles.publishBannerIcon}
            />
            <Text style={styles.publishBannerText}>
              Saved books publish instantly to the user app and the website.
            </Text>
          </View>

          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {form.coverImageUri ? (
              <Image
                source={{ uri: form.coverImageUri }}
                style={styles.imagePickerPreview}
              />
            ) : editingBook?.coverImage ? (
              <Image
                source={{ uri: editingBook.coverImage }}
                style={styles.imagePickerPreview}
              />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Text style={styles.imagePickerText}>Tap to pick cover image</Text>
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            label="Title *"
            value={form.title}
            onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border.gold}
            activeOutlineColor={colors.primary.saffron}
          />
          <TextInput
            label="Author *"
            value={form.author}
            onChangeText={(v) => setForm((p) => ({ ...p, author: v }))}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border.gold}
            activeOutlineColor={colors.primary.saffron}
          />
          <TextInput
            label="Description"
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineColor={colors.border.gold}
            activeOutlineColor={colors.primary.saffron}
          />
          <TextInput
            label="Price (INR) *"
            value={form.price}
            onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            outlineColor={colors.border.gold}
            activeOutlineColor={colors.primary.saffron}
          />
          <TextInput
            label="Buy Link"
            value={form.purchaseUrl}
            onChangeText={(v) => setForm((p) => ({ ...p, purchaseUrl: v }))}
            mode="outlined"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
            outlineColor={colors.border.gold}
            activeOutlineColor={colors.primary.saffron}
          />
          <Text style={styles.helperText}>
            Add the Amazon, publisher, or other marketplace URL. AvdheshanandG Mission will only display this external link and is not the seller.
          </Text>
          <View style={styles.row}>
            <TextInput
              label="Pages"
              value={form.pages}
              onChangeText={(v) => setForm((p) => ({ ...p, pages: v }))}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
              outlineColor={colors.border.gold}
              activeOutlineColor={colors.primary.saffron}
            />
            <TextInput
              label="Language"
              value={form.language}
              onChangeText={(v) => setForm((p) => ({ ...p, language: v }))}
              mode="outlined"
              style={[styles.input, styles.halfInput]}
              outlineColor={colors.border.gold}
              activeOutlineColor={colors.primary.saffron}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              label="Genre"
              value={form.genre}
              onChangeText={(v) => setForm((p) => ({ ...p, genre: v }))}
              mode="outlined"
              style={[styles.input, styles.halfInput]}
              outlineColor={colors.border.gold}
              activeOutlineColor={colors.primary.saffron}
            />
            <TextInput
              label="ISBN"
              value={form.ISBN}
              onChangeText={(v) => setForm((p) => ({ ...p, ISBN: v }))}
              mode="outlined"
              style={[styles.input, styles.halfInput]}
              outlineColor={colors.border.gold}
              activeOutlineColor={colors.primary.saffron}
            />
          </View>
          <TouchableOpacity
            style={styles.dateField}
            onPress={() => setDatePickerVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color={colors.primary.maroon}
              style={styles.dateFieldIcon}
            />
            <View style={styles.dateFieldTextWrap}>
              <Text style={styles.dateFieldLabel}>Published Date</Text>
              <Text
                style={[
                  styles.dateFieldValue,
                  !form.publishedDate && styles.dateFieldPlaceholder,
                ]}
              >
                {form.publishedDate || 'Tap to select a date'}
              </Text>
            </View>
          </TouchableOpacity>
          {datePickerVisible ? (
            <DateTimePicker
              value={form.publishedDate ? new Date(form.publishedDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, selectedDate) => {
                setDatePickerVisible(Platform.OS === 'ios');
                if (selectedDate) {
                  setForm((p) => ({ ...p, publishedDate: toIsoDate(selectedDate) }));
                }
              }}
            />
          ) : null}

          <LinearGradient
            colors={gradients.maroon as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
              buttonColor="transparent"
              textColor={colors.text.white}
            >
              {editingBook ? 'Update Book' : 'Create Book'}
            </Button>
          </LinearGradient>

          <Button
            mode="outlined"
            onPress={() => setModalVisible(false)}
            disabled={submitting}
            style={styles.cancelButton}
            textColor={colors.primary.maroon}
          >
            Cancel
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }

  if (error && books.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBooks}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={(item) => item._id}
        renderItem={renderBookCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={books.length > 0 ? renderHeader : null}
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
      {renderModal()}
      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ visible: false, message: '' })}
          duration={3000}
          action={{ label: 'OK', onPress: () => {} }}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
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
  heroWrap: {
    marginBottom: spacing.lg,
  },
  summaryCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.gold,
    ...shadows.maroonGlow,
  },
  summaryTitle: {
    color: colors.gold.light,
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
    color: colors.gold.light,
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
    borderColor: colors.border.gold,
    overflow: 'hidden',
    ...shadows.soft,
  },
  cardRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  coverContainer: {
    width: 84,
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.sandstone,
    ...shadows.soft,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gold.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    ...typography.titleSm,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: colors.primary.maroon,
  },
  authorText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background.parchment,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  metaChipText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  price: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.gold.dark,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
    backgroundColor: colors.background.parchment,
  },
  footerTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    flexWrap: 'wrap',
  },
  footerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerTagText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.status.success,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    borderColor: `${colors.status.error}55`,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIconWell: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(163, 18, 58, 0.10)',
    borderWidth: 1,
    borderColor: colors.primary.saffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyStateIcon: {
    fontSize: 44,
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
  helperText: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary.maroon,
    borderRadius: borderRadius.full,
    ...shadows.maroonGlow,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.parchment,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.gold.main,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.white,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.gold,
    borderStyle: 'dashed',
  },
  imagePickerPreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.sandstone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.background.warmWhite,
  },
  publishBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.28)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  publishBannerIcon: {
    marginRight: spacing.xs,
  },
  publishBannerText: {
    flex: 1,
    color: colors.status.success,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dateFieldIcon: {
    marginRight: spacing.xs,
  },
  dateFieldTextWrap: {
    flex: 1,
  },
  dateFieldLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  dateFieldValue: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600',
  },
  dateFieldPlaceholder: {
    color: colors.text.secondary,
    fontWeight: '400',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  submitGradient: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.maroonGlow,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
  },
  cancelButton: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderColor: colors.border.gold,
    borderWidth: 1.5,
    paddingVertical: spacing.xs,
  },
});
