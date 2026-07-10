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
  Image,
  Platform,
} from 'react-native';
import {
  Card,
  FAB,
  ActivityIndicator,
  IconButton,
  TextInput,
  Button,
  Dialog,
  Portal,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, typography, shadows, gradients } from '../../theme';
import { AdminHero, Badge } from '../../components/common';
import api from '../../services/api';
import { Article, LocalizedText } from '../../types';

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

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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

interface ArticleFormData {
  titleTranslations: LocalizedText;
  descriptionTranslations: LocalizedText;
  categoryTranslations: LocalizedText;
  link: string;
  readTime: string;
  publishedDate: string;
  imageUri: string | null;
  imageName: string | null;
}

const emptyForm: ArticleFormData = {
  titleTranslations: createEmptyLocalizedText(),
  descriptionTranslations: createEmptyLocalizedText(),
  categoryTranslations: createEmptyLocalizedText(),
  link: '',
  readTime: '',
  publishedDate: '',
  imageUri: null,
  imageName: null,
};

export function ArticlesScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [form, setForm] = useState<ArticleFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Delete confirmation
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchArticles = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/articles');
      const data = response.data?.articles || response.data || [];
      setArticles(data.filter((a: Article) => !a.isDeleted));
    } catch (err) {
      setError('Failed to load articles');
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles();
  }, [fetchArticles]);

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

  const getExcerpt = (text: string, maxLength: number = 120) => {
    if (!text) return '';
    const plain = text.replace(/<[^>]*>/g, '');
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength).trim() + '...';
  };

  const isValidIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };

  // ── Image Picker ──

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || 'cover_image.jpg';
      setForm((prev) => ({ ...prev, imageUri: asset.uri, imageName: fileName }));
    }
  };

  // ── Create / Edit ──

  const openCreateModal = () => {
    setEditingArticle(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (article: Article) => {
    setEditingArticle(article);
    setForm({
      titleTranslations: {
        ...createEmptyLocalizedText(),
        ...(article.titleTranslations || {}),
        en: article.titleTranslations?.en || article.title || '',
      },
      descriptionTranslations: {
        ...createEmptyLocalizedText(),
        ...(article.descriptionTranslations || {}),
        en: article.descriptionTranslations?.en || article.description || '',
      },
      categoryTranslations: {
        ...createEmptyLocalizedText(),
        ...(article.categoryTranslations || {}),
        en: article.categoryTranslations?.en || article.category || '',
      },
      link: article.link || '',
      readTime: article.readTime != null ? String(article.readTime) : '',
      publishedDate: article.publishedDate ? article.publishedDate.split('T')[0] : '',
      imageUri: article.coverImage || null,
      imageName: null,
    });
    setModalVisible(true);
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append('title', getPrimaryLocalizedValue(form.titleTranslations));
    fd.append('description', getPrimaryLocalizedValue(form.descriptionTranslations));
    fd.append('category', getPrimaryLocalizedValue(form.categoryTranslations));
    fd.append('titleTranslations', JSON.stringify(normalizeLocalizedText(form.titleTranslations)));
    fd.append(
      'descriptionTranslations',
      JSON.stringify(normalizeLocalizedText(form.descriptionTranslations))
    );
    fd.append(
      'categoryTranslations',
      JSON.stringify(normalizeLocalizedText(form.categoryTranslations))
    );
    fd.append('link', form.link);
    fd.append('readTime', form.readTime);
    fd.append('publishedDate', form.publishedDate);

    if (form.imageUri && form.imageName) {
      const ext = form.imageName.split('.').pop()?.toLowerCase() || 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      fd.append('coverImage', {
        uri: form.imageUri,
        name: form.imageName,
        type: mimeType,
      } as unknown as Blob);
    }

    return fd;
  };

  const handleSubmit = async () => {
    if (!getPrimaryLocalizedValue(form.titleTranslations).trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    if (!getPrimaryLocalizedValue(form.descriptionTranslations).trim()) {
      Alert.alert('Validation', 'Description is required.');
      return;
    }
    if (form.publishedDate && !isValidIsoDate(form.publishedDate.trim())) {
      Alert.alert('Validation', 'Published date must be in YYYY-MM-DD format.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = buildFormData();
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (editingArticle) {
        await api.put(`/articles/${editingArticle._id}`, fd, config);
        Alert.alert('Article updated', 'Your changes are now live on the user app and the website.');
      } else {
        await api.post('/articles', fd, config);
        Alert.alert('Article published', 'The new article is now live on the user app and the website.');
      }

      setModalVisible(false);
      setForm(emptyForm);
      setEditingArticle(null);
      fetchArticles();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
      console.error('Article submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──

  const confirmDelete = (article: Article) => {
    setArticleToDelete(article);
    setDeleteDialogVisible(true);
  };

  const handleDelete = async () => {
    if (!articleToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/articles/${articleToDelete._id}`);
      setDeleteDialogVisible(false);
      setArticleToDelete(null);
      fetchArticles();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete article.';
      Alert.alert('Error', msg);
      console.error('Article delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ──

  const renderArticleCard = ({ item }: { item: Article }) => (
    <TouchableOpacity
      onPress={() => openEditModal(item)}
      onLongPress={() => confirmDelete(item)}
      activeOpacity={0.85}
    >
      <Card style={styles.card}>
        {item.coverImage ? (
          <Image
            source={{ uri: item.coverImage }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : null}
        <Card.Content style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.articleTitle} numberOfLines={2}>
              {getPrimaryLocalizedValue(item.titleTranslations, item.title)}
            </Text>
          </View>

          <Text style={styles.excerpt} numberOfLines={3}>
            {getExcerpt(getPrimaryLocalizedValue(item.descriptionTranslations, item.description))}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              {item.category || item.categoryTranslations ? (
                <Badge
                  label={getPrimaryLocalizedValue(item.categoryTranslations, item.category)}
                  tone={colors.primary.saffron}
                  variant="soft"
                />
              ) : null}
              {item.readTime != null ? (
                <View style={styles.metaItem}>
                  <IconButton
                    icon="clock-outline"
                    iconColor={colors.text.secondary}
                    size={13}
                    style={styles.metaIcon}
                  />
                  <Text style={styles.readTime}>{item.readTime} min read</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.metaItem}>
              <IconButton
                icon="calendar-blank-outline"
                iconColor={colors.text.secondary}
                size={13}
                style={styles.metaIcon}
              />
              <Text style={styles.dateText}>{formatDate(item.publishedDate)}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Badge label="Live on app & website" tone={colors.status.success} variant="soft" dot />
            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.footerBtn} onPress={() => openEditModal(item)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="pencil" size={16} color={colors.primary.maroon} />
                <Text style={styles.footerBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerBtnDelete} onPress={() => confirmDelete(item)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.status.error} />
                <Text style={styles.footerBtnDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWell}>
        <IconButton icon="newspaper-variant-outline" iconColor={colors.primary.saffron} size={40} />
      </View>
      <Text style={styles.emptyStateText}>No articles yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Create your first article using the + button
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.maroon} />
        <Text style={styles.loadingText}>Loading articles...</Text>
      </View>
    );
  }

  if (error && articles.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchArticles}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={articles}
        keyExtractor={(item) => item._id}
        renderItem={renderArticleCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <AdminHero
              eyebrow="Manage"
              title="Articles"
              subtitle="Publish once — every article appears instantly on the user app and the website."
              badge={`${articles.length} live`}
              actions={[{ label: 'New Article', icon: 'plus', onPress: openCreateModal }]}
            />
          </View>
        }
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
        onPress={openCreateModal}
        color={colors.text.white}
      />

      {/* ── Create / Edit Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={gradients.maroon as readonly [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {editingArticle ? 'Edit Article' : 'Create Article'}
              </Text>
              <IconButton
                icon="close"
                iconColor={colors.text.white}
                size={24}
                onPress={() => setModalVisible(false)}
              />
            </LinearGradient>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="broadcast" size={16} color={colors.status.success} />
                <Text style={styles.infoBannerText}>
                  Saved articles publish instantly to the user app and the website.
                </Text>
              </View>

              <Text style={styles.translationSectionTitle}>Localized Titles</Text>
              {CONTENT_LANGUAGES.map(({ code, label }) => (
                <TextInput
                  key={`title-${code}`}
                  label={`Title (${label})${code === 'en' ? ' *' : ''}`}
                  value={form.titleTranslations[code] || ''}
                  onChangeText={(v) =>
                    setForm((p) => ({
                      ...p,
                      titleTranslations: { ...p.titleTranslations, [code]: v },
                    }))
                  }
                  mode="outlined"
                  style={styles.input}
                  outlineColor={colors.border.gold}
                  activeOutlineColor={colors.primary.maroon}
                />
              ))}

              <Text style={styles.translationSectionTitle}>Localized Descriptions</Text>
              {CONTENT_LANGUAGES.map(({ code, label }) => (
                <TextInput
                  key={`description-${code}`}
                  label={`Description (${label})${code === 'en' ? ' *' : ''}`}
                  value={form.descriptionTranslations[code] || ''}
                  onChangeText={(v) =>
                    setForm((p) => ({
                      ...p,
                      descriptionTranslations: { ...p.descriptionTranslations, [code]: v },
                    }))
                  }
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.multilineInput]}
                  outlineColor={colors.border.gold}
                  activeOutlineColor={colors.primary.maroon}
                />
              ))}

              <Text style={styles.translationSectionTitle}>Localized Categories</Text>
              {CONTENT_LANGUAGES.map(({ code, label }) => (
                <TextInput
                  key={`category-${code}`}
                  label={`Category (${label})`}
                  value={form.categoryTranslations[code] || ''}
                  onChangeText={(v) =>
                    setForm((p) => ({
                      ...p,
                      categoryTranslations: { ...p.categoryTranslations, [code]: v },
                    }))
                  }
                  mode="outlined"
                  style={styles.input}
                  outlineColor={colors.border.gold}
                  activeOutlineColor={colors.primary.maroon}
                />
              ))}

              <TextInput
                label="Link"
                value={form.link}
                onChangeText={(v) => setForm((p) => ({ ...p, link: v }))}
                mode="outlined"
                keyboardType="url"
                autoCapitalize="none"
                style={styles.input}
                outlineColor={colors.border.gold}
                activeOutlineColor={colors.primary.maroon}
              />

              <TextInput
                label="Read Time (minutes)"
                value={form.readTime}
                onChangeText={(v) => setForm((p) => ({ ...p, readTime: v }))}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                outlineColor={colors.border.gold}
                activeOutlineColor={colors.primary.maroon}
              />

              <TouchableOpacity
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.8}
                style={styles.dateField}
              >
                <MaterialCommunityIcons name="calendar-month-outline" size={22} color={colors.primary.maroon} />
                <View style={styles.dateFieldTextWrap}>
                  <Text style={styles.dateFieldLabel}>Published Date</Text>
                  <Text style={[styles.dateFieldValue, !form.publishedDate && styles.dateFieldPlaceholder]}>
                    {form.publishedDate ? formatDate(form.publishedDate) : 'Tap to select a date'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={22} color={colors.gold.dark} />
              </TouchableOpacity>
              {datePickerVisible ? (
                <DateTimePicker
                  value={form.publishedDate ? new Date(`${form.publishedDate}T00:00:00`) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(e, date) => {
                    setDatePickerVisible(false);
                    if (e.type === 'set' && date) {
                      setForm((p) => ({ ...p, publishedDate: toIsoDate(date) }));
                    }
                  }}
                />
              ) : null}

              {/* Image picker */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {form.imageUri ? (
                  <Image
                    source={{ uri: form.imageUri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <IconButton icon="camera-plus" iconColor={colors.text.secondary} size={32} />
                    <Text style={styles.imagePlaceholderText}>Tap to select a cover image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.formActions}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelButton}
                  textColor={colors.primary.maroon}
                >
                  Cancel
                </Button>
                <LinearGradient
                  colors={gradients.maroon as readonly [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
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
                    {editingArticle ? 'Update' : 'Create'}
                  </Button>
                </LinearGradient>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete Article</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete "{articleToDelete?.title}"? This action cannot be
              undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} textColor={colors.text.secondary}>
              Cancel
            </Button>
            <Button
              onPress={handleDelete}
              loading={deleting}
              disabled={deleting}
              textColor={colors.status.error}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
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
    borderRadius: borderRadius.full,
    ...shadows.maroonGlow,
  },
  retryButtonText: {
    color: colors.text.white,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
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
  cardImage: {
    width: '100%',
    height: 172,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    backgroundColor: colors.background.sandstone,
  },
  cardContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  articleTitle: {
    flex: 1,
    ...typography.title,
    color: colors.primary.maroon,
    marginBottom: spacing.sm,
  },
  excerpt: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
    paddingTop: spacing.sm,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    margin: 0,
    width: 18,
    height: 18,
  },
  readTime: {
    ...typography.micro,
    fontWeight: '400',
    color: colors.text.secondary,
  },
  dateText: {
    ...typography.micro,
    fontWeight: '400',
    color: colors.text.secondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    backgroundColor: colors.background.cream,
  },
  footerBtnText: {
    ...typography.label,
    color: colors.primary.maroon,
    fontWeight: '700',
  },
  footerBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: `${colors.status.error}44`,
    backgroundColor: `${colors.status.error}12`,
  },
  footerBtnDeleteText: {
    ...typography.label,
    color: colors.status.error,
    fontWeight: '700',
  },
  // Date picker field
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.warmWhite,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  dateFieldTextWrap: {
    flex: 1,
  },
  dateFieldLabel: {
    ...typography.micro,
    color: colors.gold.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dateFieldValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  dateFieldPlaceholder: {
    color: colors.text.secondary,
    fontWeight: '400',
  },
  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F3FAF4',
    borderWidth: 1,
    borderColor: 'rgba(46,158,91,0.25)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    ...typography.bodySm,
    color: colors.text.primary,
    flex: 1,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIconWell: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(163, 18, 58, 0.10)',
    borderWidth: 1,
    borderColor: colors.border.gold,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    color: colors.primary.maroon,
    ...typography.title,
  },
  emptyStateSubtext: {
    color: colors.text.secondary,
    ...typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.maroon,
    ...shadows.maroonGlow,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 4, 14, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.warmWhite,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
    overflow: 'hidden',
    ...shadows.raised,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  modalTitle: {
    ...typography.titleLg,
    color: colors.text.white,
  },
  formScroll: {
    flexGrow: 0,
  },
  formScrollContent: {
    padding: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.warmWhite,
  },
  translationSectionTitle: {
    ...typography.label,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.gold.dark,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  multilineInput: {
    minHeight: 120,
  },

  // Image picker
  imagePicker: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border.gold,
    borderStyle: 'dashed',
  },
  imagePreview: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.cream,
  },
  imagePlaceholderText: {
    color: colors.text.secondary,
    ...typography.body,
    marginTop: -spacing.sm,
  },

  // Form actions
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  cancelButton: {
    borderColor: colors.border.gold,
    borderRadius: borderRadius.full,
  },
  submitGradient: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.maroonGlow,
  },
  submitButton: {
    minWidth: 120,
    backgroundColor: 'transparent',
  },
});
