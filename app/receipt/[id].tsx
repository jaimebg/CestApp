import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
import { ReceiptSummary } from '../../src/components/receipt';
import { ConfirmationModal } from '../../src/components/ui';
import { useFormatPrice } from '../../src/store/preferences';
import { showSuccessToast, showErrorToast } from '../../src/utils/toast';
import type { Receipt } from '../../src/db/schema/receipts';
import type { Store } from '../../src/db/schema/stores';
import type { Item } from '../../src/db/schema/items';
import type { Category } from '../../src/db/schema/categories';

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
      console.error('Failed to load receipt:', error);
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
      console.error('Failed to save changes:', error);
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
      console.error('Failed to delete receipt:', error);
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
        <ActivityIndicator size="large" color="#93BD57" />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark justify-center items-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-text-secondary dark:text-text-dark-secondary">Receipt not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-primary rounded-lg">
          <Text className="text-white font-medium">{t('common.ok')}</Text>
        </Pressable>
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
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isEditing ? (
            <Text className="text-error text-base">{t('common.cancel')}</Text>
          ) : (
            <Ionicons name="arrow-back" size={24} color="#93BD57" />
          )}
        </Pressable>

        <Text
          className="text-lg text-text dark:text-text-dark flex-1 text-center"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          {isEditing ? t('receipt.editReceipt') : t('receipt.details')}
        </Text>

        {isEditing ? (
          <Pressable
            onPress={saveChanges}
            disabled={isSaving}
            className="p-2 -mr-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#93BD57" />
            ) : (
              <Text className="text-primary text-base font-semibold">{t('common.save')}</Text>
            )}
          </Pressable>
        ) : (
          <View className="flex-row items-center">
            <Pressable
              onPress={startEditing}
              className="p-2 mr-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="pencil-outline" size={22} color="#93BD57" />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={isDeleting}
              className="p-2 -mr-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#980404" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#980404" />
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
              className="w-full h-48 rounded-xl"
              resizeMode="cover"
            />
          </View>
        )}

        {/* Store and date info */}
        <View className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl p-4">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-primary/20 dark:bg-primary/30 rounded-full items-center justify-center mr-4">
              <Ionicons name="storefront-outline" size={24} color="#93BD57" />
            </View>
            <View className="flex-1">
              {isEditing ? (
                <TextInput
                  className="text-xl text-text dark:text-text-dark bg-background dark:bg-background-dark rounded-lg px-3 py-2 border border-border dark:border-border-dark"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                  value={editedStoreName}
                  onChangeText={setEditedStoreName}
                  placeholder={t('receipt.store')}
                  placeholderTextColor="#8D8680"
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
                <Ionicons name="calendar-outline" size={18} color="#8D8680" />
                <Text className="text-text-secondary dark:text-text-dark-secondary ml-2 flex-1">
                  {t('receipt.date')}
                </Text>
                <Text className="text-text dark:text-text-dark">{formattedDate}</Text>
              </View>

              {formattedTime && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="time-outline" size={18} color="#8D8680" />
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
                    color="#8D8680"
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
                className="flex-row items-center bg-primary/20 px-3 py-1.5 rounded-full"
              >
                <Ionicons name="add" size={18} color="#93BD57" />
                <Text className="text-primary text-sm ml-1">{t('receipt.addItem')}</Text>
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
                      className="flex-row items-center py-3 border-b border-border/50 dark:border-border-dark/50"
                    >
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: category?.color ? `${category.color}20` : '#8D868020',
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
                      <Text className="text-text dark:text-text-dark text-base font-medium mr-2">
                        {formatPrice(item.price / 100)}
                      </Text>
                      <Pressable
                        onPress={() => deleteItemFromList(index)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close-circle" size={22} color="#980404" />
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
              items.map(({ item, category }, index) => (
                <View
                  key={item.id}
                  className={`flex-row items-center py-3 ${
                    index !== items.length - 1
                      ? 'border-b border-border/50 dark:border-border-dark/50'
                      : ''
                  }`}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor: category?.color ? `${category.color}20` : '#8D868020',
                    }}
                  >
                    <Text className="text-sm">{category?.icon || '📦'}</Text>
                  </View>
                  <View className="flex-1 mr-3">
                    <Text className="text-text dark:text-text-dark text-base" numberOfLines={2}>
                      {item.name}
                    </Text>
                    {(item.quantity || 1) > 1 && (
                      <Text className="text-text-secondary dark:text-text-dark-secondary text-sm">
                        {item.quantity}x @ {formatPrice((item.unitPrice || item.price) / 100)}
                      </Text>
                    )}
                  </View>
                  <Text className="text-text dark:text-text-dark text-base font-medium">
                    {formatPrice(item.price / 100)}
                  </Text>
                </View>
              ))
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
              <Text className="text-text dark:text-text-dark text-lg font-semibold">
                {t('receipt.total')}
              </Text>
              <Text className="text-text dark:text-text-dark text-xl font-bold">
                {formatPrice(
                  editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) / 100
                )}
              </Text>
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
            <Ionicons name="warning-outline" size={20} color="#FBE580" />
            <Text className="text-text-secondary dark:text-text-dark-secondary ml-2 flex-1">
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
          <View
            className="flex-row items-center justify-between px-4 py-4 border-b border-border dark:border-border-dark"
            style={{ paddingTop: insets.top + 16 }}
          >
            <Pressable onPress={() => setShowItemModal(false)}>
              <Text className="text-error text-base">{t('common.cancel')}</Text>
            </Pressable>
            <Text
              className="text-lg text-text dark:text-text-dark"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {editingItemIndex !== null ? t('receipt.editItem') : t('receipt.addItem')}
            </Text>
            <Pressable onPress={saveItemEdit}>
              <Text className="text-primary text-base font-semibold">{t('common.save')}</Text>
            </Pressable>
          </View>

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
              placeholderTextColor="#8D8680"
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
              placeholderTextColor="#8D8680"
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
              placeholderTextColor="#8D8680"
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
                  className={`flex-row items-center px-3 py-2 rounded-full border ${
                    editingItem?.categoryId === cat.id
                      ? 'bg-primary border-primary'
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
