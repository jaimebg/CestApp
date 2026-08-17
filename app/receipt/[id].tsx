import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatabaseReady } from '../../src/db/provider';
import { getReceiptById, deleteReceipt, updateReceipt } from '../../src/db/queries/receipts';
import {
  getItemsByReceiptId,
  updateItem,
  deleteItem,
  createItem,
} from '../../src/db/queries/items';
import { getCategories } from '../../src/db/queries/categories';
import { findOrCreateStore } from '../../src/db/queries/stores';
import { ReceiptSummary } from '../../src/components/receipt/ReceiptSummary';
import { CollapsibleItemList } from '../../src/components/receipt/CollapsibleItemList';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { ModalHeader } from '../../src/components/ui/ModalHeader';
import { Amount } from '../../src/components/ui/Amount';
import { Button } from '../../src/components/ui/Button';
import { useAppColors } from '../../src/hooks/useAppColors';
import { ICON_HIT_SLOP, MIN_TARGET } from '../../src/theme/a11y';
import { fonts } from '../../src/theme/type';
import { useFormatPrice } from '../../src/store/preferences';
import { createScopedLogger } from '../../src/utils/debug';
import { showSuccessToast, showErrorToast } from '../../src/utils/toast';
import type { Receipt } from '../../src/db/schema/receipts';
import type { Store } from '../../src/db/schema/stores';
import type { Item } from '../../src/db/schema/items';
import type { Category } from '../../src/db/schema/categories';

const logger = createScopedLogger('ReceiptDetail');

type ItemWithCategory = {
  item: Item;
  category: Category | null;
};

type EditableItem = {
  id: number | null;
  name: string;
  price: number;
  quantity: number;
  categoryId: number | null;
};

export default function ReceiptDetailScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isReady } = useDatabaseReady();
  const { formatPrice } = useFormatPrice();
  const colors = useAppColors();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedStoreName, setEditedStoreName] = useState('');
  const [editedItems, setEditedItems] = useState<EditableItem[]>([]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const loadReceipt = useCallback(async () => {
    if (!isReady || !id) return;

    try {
      const receiptId = parseInt(id, 10);
      const data = await getReceiptById(receiptId);

      if (data) {
        setReceipt(data.receipt);
        setStore(data.store);

        const itemsData = await getItemsByReceiptId(receiptId);
        setItems(itemsData);

        const cats = await getCategories();
        setCategoriesState(cats);
      }
    } catch (error) {
      logger.error('Failed to load receipt:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isReady, id]);

  useEffect(() => {
    loadReceipt();
  }, [loadReceipt]);

  const startEditing = useCallback(() => {
    if (!receipt) return;

    setEditedStoreName(store?.name || '');
    setEditedItems(
      items.map(({ item }) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        categoryId: item.categoryId,
      }))
    );
    setIsEditing(true);
  }, [receipt, store, items]);

  const cancelEditing = useCallback(() => {
    setShowDiscardModal(true);
  }, []);

  const confirmDiscard = useCallback(() => {
    setShowDiscardModal(false);
    setIsEditing(false);
  }, []);

  const saveChanges = useCallback(async () => {
    if (!receipt || !id) return;

    setIsSaving(true);
    try {
      const receiptId = parseInt(id, 10);

      let newStoreId = receipt.storeId;
      if (editedStoreName !== store?.name && editedStoreName.trim()) {
        newStoreId = await findOrCreateStore(editedStoreName.trim());
      }

      const itemsTotal = editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await updateReceipt(receiptId, {
        storeId: newStoreId,
        totalAmount: itemsTotal,
      });

      const existingItemIds = new Set(items.map(({ item }) => item.id));
      const editedItemIds = new Set(editedItems.filter((i) => i.id).map((i) => i.id));

      for (const { item } of items) {
        if (!editedItemIds.has(item.id)) {
          await deleteItem(item.id);
        }
      }

      for (const editedItem of editedItems) {
        if (editedItem.id && existingItemIds.has(editedItem.id)) {
          await updateItem(editedItem.id, {
            name: editedItem.name,
            price: editedItem.price,
            quantity: editedItem.quantity,
            categoryId: editedItem.categoryId,
          });
        } else {
          await createItem({
            receiptId,
            name: editedItem.name,
            price: editedItem.price,
            quantity: editedItem.quantity,
            categoryId: editedItem.categoryId,
          });
        }
      }

      await loadReceipt();
      setIsEditing(false);
      showSuccessToast(t('receipt.changesSaved'));
    } catch (error) {
      logger.error('Failed to save changes:', error);
      showErrorToast(t('common.error'), t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [receipt, id, editedStoreName, store, editedItems, items, loadReceipt, t]);

  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!receipt) return;

    setShowDeleteModal(false);
    setIsDeleting(true);
    try {
      await deleteReceipt(receipt.id);
      router.back();
    } catch (error) {
      logger.error('Failed to delete receipt:', error);
      showErrorToast(t('common.error'), t('errors.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  }, [receipt, router, t]);

  const openItemEditor = useCallback((item: EditableItem | null, index: number | null) => {
    if (item) {
      setEditingItem({ ...item });
      setEditingItemIndex(index);
    } else {
      setEditingItem({
        id: null,
        name: '',
        price: 0,
        quantity: 1,
        categoryId: null,
      });
      setEditingItemIndex(null);
    }
    setShowItemModal(true);
  }, []);

  const saveItemEdit = useCallback(() => {
    if (!editingItem || !editingItem.name.trim()) return;

    const newItems = [...editedItems];
    if (editingItemIndex !== null) {
      newItems[editingItemIndex] = editingItem;
    } else {
      newItems.push(editingItem);
    }
    setEditedItems(newItems);
    setShowItemModal(false);
    setEditingItem(null);
    setEditingItemIndex(null);
  }, [editingItem, editingItemIndex, editedItems]);

  const deleteItemFromList = useCallback(
    (index: number) => {
      const newItems = editedItems.filter((_, i) => i !== index);
      setEditedItems(newItems);
    },
    [editedItems]
  );

  const formattedDate = receipt?.dateTime
    ? new Date(receipt.dateTime).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : t('scan.noDateFound');

  const formattedTime = receipt?.dateTime
    ? new Date(receipt.dateTime).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const getCategoryForItem = (categoryId: number | null) => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId) || null;
  };

  if (!isReady || isLoading) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark justify-center items-center"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator
          size="large"
          color={colors.action}
          accessibilityLabel={t('common.loading')}
        />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark justify-center items-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-text-secondary dark:text-text-dark-secondary">
          {t('receipt.notFound')}
        </Text>
        <Button onPress={() => router.back()} className="mt-4">
          {t('receipt.backToHistory')}
        </Button>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
        <Pressable
          onPress={() => (isEditing ? cancelEditing() : router.back())}
          className="p-2 -ml-2"
          hitSlop={ICON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? t('common.cancel') : t('common.back')}
          style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
        >
          {isEditing ? (
            <Text className="text-error dark:text-error-light text-base">{t('common.cancel')}</Text>
          ) : (
            <Ionicons name="arrow-back" size={24} color={colors.action} />
          )}
        </Pressable>

        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="text-lg text-text dark:text-text-dark flex-1 text-center"
          style={{ fontFamily: fonts.semibold }}
        >
          {isEditing ? t('receipt.editReceipt') : t('receipt.details')}
        </Text>

        {isEditing ? (
          <Pressable
            onPress={saveChanges}
            disabled={isSaving}
            className="p-2 -mr-2"
            hitSlop={ICON_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t('common.save')}
            accessibilityState={{ disabled: isSaving, busy: isSaving }}
            style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.action} />
            ) : (
              <Text
                className="text-action dark:text-action-dark text-base"
                style={{ fontFamily: fonts.semibold }}
              >
                {t('common.save')}
              </Text>
            )}
          </Pressable>
        ) : (
          <View className="flex-row items-center">
            <Pressable
              onPress={startEditing}
              className="p-2 mr-1"
              hitSlop={ICON_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t('receipt.editReceipt')}
              style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
            >
              <Ionicons name="pencil-outline" size={22} color={colors.action} />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={isDeleting}
              className="p-2 -mr-2"
              hitSlop={ICON_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
              accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
              style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              )}
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Receipt image preview (if available) */}
        {receipt.imagePath && !isEditing && (
          <View className="mx-4 mt-4">
            <Image
              source={{ uri: receipt.imagePath }}
              style={{ width: '100%', height: 192, borderRadius: 12 }}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('receipt.photoOf', {
                store: store?.name || t('scan.unknownStore'),
              })}
            />
          </View>
        )}

        {/* Store and date info */}
        <View className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl p-4">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-primary/20 dark:bg-primary/30 rounded-full items-center justify-center mr-4">
              <Ionicons name="storefront-outline" size={24} color={colors.action} />
            </View>
            <View className="flex-1">
              {isEditing ? (
                <TextInput
                  className="text-xl text-text dark:text-text-dark bg-background dark:bg-background-dark rounded-lg px-3 py-2 border border-border dark:border-border-dark"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                  value={editedStoreName}
                  onChangeText={setEditedStoreName}
                  placeholder={t('receipt.store')}
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={t('receipt.store')}
                />
              ) : (
                <>
                  <Text
                    className="text-xl text-text dark:text-text-dark"
                    style={{ fontFamily: 'Inter_600SemiBold' }}
                  >
                    {store?.name || t('scan.unknownStore')}
                  </Text>
                  {store?.address && (
                    <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mt-0.5">
                      {store.address}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

          {!isEditing && (
            <View className="border-t border-border dark:border-border-dark pt-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text className="text-text-secondary dark:text-text-dark-secondary ml-2 flex-1">
                  {t('receipt.date')}
                </Text>
                <Text className="text-text dark:text-text-dark">{formattedDate}</Text>
              </View>

              {formattedTime && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <Text className="text-text-secondary dark:text-text-dark-secondary ml-2 flex-1">
                    {t('scan.time')}
                  </Text>
                  <Text className="text-text dark:text-text-dark">{formattedTime}</Text>
                </View>
              )}

              {receipt.paymentMethod && (
                <View className="flex-row items-center">
                  <Ionicons
                    name={
                      receipt.paymentMethod === 'card'
                        ? 'card-outline'
                        : receipt.paymentMethod === 'digital'
                          ? 'phone-portrait-outline'
                          : 'cash-outline'
                    }
                    size={18}
                    color={colors.textSecondary}
                  />
                  <Text className="text-text-secondary dark:text-text-dark-secondary ml-2 flex-1">
                    {t('receipt.paymentMethod')}
                  </Text>
                  <Text className="text-text dark:text-text-dark capitalize">
                    {t(`receipt.${receipt.paymentMethod}`)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Items */}
        <View className="mx-4 mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text
              className="text-lg text-text dark:text-text-dark"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('receipt.items')} ({isEditing ? editedItems.length : items.length})
            </Text>
            {isEditing && (
              <Pressable
                onPress={() => openItemEditor(null, null)}
                accessibilityRole="button"
                accessibilityLabel={t('receipt.addItem')}
                hitSlop={ICON_HIT_SLOP}
                style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
                className="flex-row items-center bg-primary/20 px-3 py-1.5 rounded-full"
              >
                <Ionicons name="add" size={18} color={colors.action} />
                <Text className="text-action dark:text-action-dark text-sm ml-1">
                  {t('receipt.addItem')}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="bg-surface dark:bg-surface-dark rounded-2xl px-4">
            {isEditing ? (
              editedItems.length > 0 ? (
                editedItems.map((item, index) => {
                  const category = getCategoryForItem(item.categoryId);
                  return (
                    <Pressable
                      key={item.id || `new-${index}`}
                      onPress={() => openItemEditor(item, index)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name || t('receipt.itemName')}, ${formatPrice(item.price / 100)}`}
                      accessibilityHint={t('receipt.editItem')}
                      className="flex-row items-center py-3 border-b border-border/50 dark:border-border-dark/50"
                    >
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: category?.color
                            ? `${category.color}20`
                            : `${colors.textTertiary}20`,
                        }}
                      >
                        <Text className="text-sm">{category?.icon || '📦'}</Text>
                      </View>
                      <View className="flex-1 mr-3">
                        <Text className="text-text dark:text-text-dark text-base" numberOfLines={1}>
                          {item.name || t('receipt.itemName')}
                        </Text>
                        {item.quantity > 1 && (
                          <Text className="text-text-secondary dark:text-text-dark-secondary text-sm">
                            {item.quantity}x
                          </Text>
                        )}
                      </View>
                      <Amount size="base" className="mr-2">
                        {formatPrice(item.price / 100)}
                      </Amount>
                      <Pressable
                        onPress={() => deleteItemFromList(index)}
                        hitSlop={ICON_HIT_SLOP}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('common.delete')}: ${item.name || t('receipt.itemName')}`}
                      >
                        <Ionicons name="close-circle" size={22} color={colors.error} />
                      </Pressable>
                    </Pressable>
                  );
                })
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-text-secondary dark:text-text-dark-secondary">
                    {t('scan.noItemsFound')}
                  </Text>
                </View>
              )
            ) : items.length > 0 ? (
              <CollapsibleItemList items={items} />
            ) : (
              <View className="py-8 items-center">
                <Text className="text-text-secondary dark:text-text-dark-secondary">
                  {t('scan.noItemsFound')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary */}
        {!isEditing && (
          <View className="mx-4">
            <ReceiptSummary
              subtotal={receipt.subtotal}
              tax={receipt.taxAmount}
              discount={receipt.discountAmount}
              total={receipt.totalAmount}
            />
          </View>
        )}

        {isEditing && (
          <View className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl p-4">
            <View className="flex-row justify-between py-2">
              <Text
                className="text-text dark:text-text-dark text-lg"
                style={{ fontFamily: fonts.semibold }}
              >
                {t('receipt.total')}
              </Text>
              <Amount size="xl">
                {formatPrice(
                  editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) / 100
                )}
              </Amount>
            </View>
          </View>
        )}

        {/* Notes */}
        {receipt.notes && !isEditing && (
          <View className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl p-4">
            <Text
              className="text-base text-text dark:text-text-dark mb-2"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('receipt.notes')}
            </Text>
            <Text className="text-text-secondary dark:text-text-dark-secondary">
              {receipt.notes}
            </Text>
          </View>
        )}

        {/* Confidence indicator */}
        {receipt.confidence != null && receipt.confidence < 80 && !isEditing && (
          <View className="mx-4 mt-4 bg-accent/20 dark:bg-accent/30 rounded-2xl p-4 flex-row items-center">
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <Text className="text-text dark:text-text-dark ml-2 flex-1">
              {t('scan.lowConfidence')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Item Edit Modal */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-background dark:bg-background-dark"
        >
          <ModalHeader
            title={editingItemIndex !== null ? t('receipt.editItem') : t('receipt.addItem')}
            onClose={() => setShowItemModal(false)}
            closeLabel={t('common.cancel')}
            confirmLabel={t('common.save')}
            onConfirm={saveItemEdit}
            confirmDisabled={!editingItem?.name.trim()}
            insetTop={insets.top}
          />

          <ScrollView className="flex-1 px-6 py-4">
            {/* Item Name */}
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2">
              {t('receipt.itemName')}
            </Text>
            <TextInput
              className="bg-surface dark:bg-surface-dark text-text dark:text-text-dark rounded-xl px-4 py-3 mb-4 border border-border dark:border-border-dark"
              value={editingItem?.name || ''}
              onChangeText={(text) =>
                setEditingItem((prev) => (prev ? { ...prev, name: text } : null))
              }
              placeholder={t('receipt.itemName')}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('receipt.itemName')}
            />

            {/* Price */}
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2">
              {t('receipt.itemPrice')}
            </Text>
            <TextInput
              className="bg-surface dark:bg-surface-dark text-text dark:text-text-dark rounded-xl px-4 py-3 mb-4 border border-border dark:border-border-dark"
              value={editingItem?.price ? (editingItem.price / 100).toString() : ''}
              onChangeText={(text) => {
                const num = parseFloat(text) || 0;
                setEditingItem((prev) => (prev ? { ...prev, price: Math.round(num * 100) } : null));
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('receipt.itemPrice')}
              keyboardType="decimal-pad"
            />

            {/* Quantity */}
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2">
              {t('receipt.itemQuantity')}
            </Text>
            <TextInput
              className="bg-surface dark:bg-surface-dark text-text dark:text-text-dark rounded-xl px-4 py-3 mb-4 border border-border dark:border-border-dark"
              value={editingItem?.quantity?.toString() || '1'}
              onChangeText={(text) => {
                const num = parseInt(text, 10) || 1;
                setEditingItem((prev) => (prev ? { ...prev, quantity: num } : null));
              }}
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('receipt.itemQuantity')}
              keyboardType="number-pad"
            />

            {/* Category */}
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2">
              {t('item.category')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() =>
                    setEditingItem((prev) => (prev ? { ...prev, categoryId: cat.id } : null))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={cat.name}
                  accessibilityState={{ selected: editingItem?.categoryId === cat.id }}
                  style={{ minHeight: MIN_TARGET }}
                  className={`flex-row items-center px-3 py-2 rounded-full border ${
                    editingItem?.categoryId === cat.id
                      ? 'bg-primary-deep border-primary-deep'
                      : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                  }`}
                >
                  <Text className="mr-1">{cat.icon}</Text>
                  <Text
                    className={
                      editingItem?.categoryId === cat.id
                        ? 'text-white'
                        : 'text-text-secondary dark:text-text-dark-secondary'
                    }
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title={t('receipt.deleteConfirm')}
        message={t('receipt.deleteConfirmDesc')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDestructive
        isLoading={isDeleting}
      />

      {/* Discard Changes Confirmation Modal */}
      <ConfirmationModal
        visible={showDiscardModal}
        title={t('receipt.discardConfirm')}
        message={t('receipt.discardConfirmDesc')}
        confirmText={t('receipt.discardChanges')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDiscard}
        onCancel={() => setShowDiscardModal(false)}
        isDestructive
      />
    </View>
  );
}
