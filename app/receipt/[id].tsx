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
import { recordUserCorrection } from '../../src/db/queries/categorization';
import { DateEditModal } from '../../src/components/scan/modals/DateEditModal';
import {
  buildValidatedDateTime,
  formatLocalizedDate,
  formatLocalizedTime,
} from '../../src/utils/dateTime';
import { deleteReceiptFile } from '../../src/services/storage';
import { ReceiptSummary } from '../../src/components/receipt/ReceiptSummary';
import { Ticket } from '../../src/components/receipt/Ticket';
import { TicketLine, TicketRule } from '../../src/components/receipt/TicketLine';
import { Chip } from '../../src/components/ui/Chip';
import { ListGroup, ListRow } from '../../src/components/ui/ListGroup';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { CollapsibleItemList } from '../../src/components/receipt/CollapsibleItemList';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { ModalHeader } from '../../src/components/ui/ModalHeader';
import { ReadingColumn } from '../../src/components/ui/ReadingColumn';
import { Button } from '../../src/components/ui/Button';
import { useAppColors } from '../../src/hooks/useAppColors';
import { ICON_HIT_SLOP, MIN_TARGET } from '../../src/theme/a11y';
import { fonts } from '../../src/theme/type';
import { useFormatPrice, usePreferencesStore } from '../../src/store/preferences';
import { parseAmountInput } from '../../src/config/currency';
import { createScopedLogger } from '../../src/utils/debug';
import { hapticDelete } from '../../src/utils/haptics';
import { showSuccessToast, showErrorToast } from '../../src/utils/toast';
import { categoryLabel } from '../../src/utils/categoryLabel';
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
  const { formatPrice, formatAmountInput } = useFormatPrice();
  const colors = useAppColors();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [editedStoreName, setEditedStoreName] = useState('');
  const [editedItems, setEditedItems] = useState<EditableItem[]>([]);

  const dateFormat = usePreferencesStore((state) => state.dateFormat);
  const language = usePreferencesStore((state) => state.language);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editDay, setEditDay] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editTime, setEditTime] = useState('');

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [editingItemPrice, setEditingItemPrice] = useState('');
  const [editingItemQuantity, setEditingItemQuantity] = useState('1');
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

    const dateTime = new Date(receipt.dateTime);
    setEditDay(dateTime.getDate().toString());
    setEditMonth((dateTime.getMonth() + 1).toString());
    setEditYear(dateTime.getFullYear().toString());
    setEditTime(
      `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
    );

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

      const newDateTime = buildValidatedDateTime(
        parseInt(editDay, 10) || 1,
        parseInt(editMonth, 10) || 1,
        parseInt(editYear, 10) || new Date().getFullYear(),
        editTime || null
      );
      if (!newDateTime) {
        showErrorToast(t('common.error'), t('errors.invalidDate'));
        return;
      }

      const itemsTotal = Math.round(editedItems.reduce((sum, item) => sum + item.price, 0));

      await updateReceipt(receiptId, {
        storeId: newStoreId,
        dateTime: newDateTime,
        totalAmount: itemsTotal,
        subtotal: itemsTotal,
        taxAmount: null,
        discountAmount: null,
      });

      const existingItemIds = new Set(items.map(({ item }) => item.id));
      const editedItemIds = new Set(editedItems.filter((i) => i.id).map((i) => i.id));
      const originalById = new Map(items.map(({ item }) => [item.id, item]));

      for (const { item } of items) {
        if (!editedItemIds.has(item.id)) {
          await deleteItem(item.id);
        }
      }

      for (const editedItem of editedItems) {
        if (editedItem.id && existingItemIds.has(editedItem.id)) {
          const original = originalById.get(editedItem.id);
          await updateItem(editedItem.id, {
            name: editedItem.name,
            price: editedItem.price,
            quantity: editedItem.quantity,
            categoryId: editedItem.categoryId,
          });
          if (
            original &&
            editedItem.categoryId != null &&
            original.categoryId !== editedItem.categoryId
          ) {
            await recordUserCorrection(
              editedItem.name,
              editedItem.categoryId,
              newStoreId ?? undefined
            );
          }
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
  }, [
    receipt,
    id,
    editedStoreName,
    store,
    editedItems,
    items,
    loadReceipt,
    t,
    editDay,
    editMonth,
    editYear,
    editTime,
  ]);

  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!receipt) return;

    setShowDeleteModal(false);
    setIsDeleting(true);
    try {
      const filePaths = [receipt.imagePath, receipt.pdfPath].filter((path): path is string =>
        Boolean(path)
      );
      await Promise.allSettled(
        filePaths.map((path) =>
          deleteReceiptFile(path).catch((error) => logger.error('Could not delete file:', error))
        )
      );
      await deleteReceipt(receipt.id);
      void hapticDelete();
      router.back();
    } catch (error) {
      logger.error('Failed to delete receipt:', error);
      showErrorToast(t('common.error'), t('errors.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  }, [receipt, router, t]);

  const openItemEditor = useCallback(
    (item: EditableItem | null, index: number | null) => {
      if (item) {
        setEditingItem({ ...item });
        setEditingItemPrice(formatAmountInput(item.price / 100, 2));
        setEditingItemQuantity(String(item.quantity));
        setEditingItemIndex(index);
      } else {
        setEditingItem({
          id: null,
          name: '',
          price: 0,
          quantity: 1,
          categoryId: null,
        });
        setEditingItemPrice('');
        setEditingItemQuantity('1');
        setEditingItemIndex(null);
      }
      setShowItemModal(true);
    },
    [formatAmountInput]
  );

  const saveItemEdit = useCallback(() => {
    if (!editingItem || !editingItem.name.trim()) return;

    const editedItem: EditableItem = {
      ...editingItem,
      price: Math.round((parseAmountInput(editingItemPrice) ?? 0) * 100),
      quantity: parseAmountInput(editingItemQuantity) ?? 1,
    };

    const newItems = [...editedItems];
    if (editingItemIndex !== null) {
      newItems[editingItemIndex] = editedItem;
    } else {
      newItems.push(editedItem);
    }
    setEditedItems(newItems);
    setShowItemModal(false);
    setEditingItem(null);
    setEditingItemPrice('');
    setEditingItemQuantity('1');
    setEditingItemIndex(null);
  }, [editingItem, editingItemPrice, editingItemQuantity, editingItemIndex, editedItems]);

  const deleteItemFromList = useCallback(
    (index: number) => {
      const newItems = editedItems.filter((_, i) => i !== index);
      setEditedItems(newItems);
    },
    [editedItems]
  );

  const formattedDate = receipt?.dateTime
    ? formatLocalizedDate(new Date(receipt.dateTime), language)
    : t('scan.noDateFound');

  const formattedTime = receipt?.dateTime
    ? formatLocalizedTime(new Date(receipt.dateTime), language)
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
        <Text
          className="text-text-secondary dark:text-text-dark-secondary"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
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
            <Text
              className="text-text-secondary dark:text-text-dark-secondary text-base"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('common.cancel')}
            </Text>
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
        <ReadingColumn>
          {!isEditing ? (
            <View className="mx-4 mt-4">
              <Ticket
                header={{
                  title: store?.name || t('scan.unknownStore'),
                  lines: [
                    store?.address,
                    formattedTime ? `${formattedDate} · ${formattedTime}` : formattedDate,
                    receipt.paymentMethod ? t(`receipt.${receipt.paymentMethod}`) : null,
                  ].filter((line): line is string => !!line),
                }}
              >
                {items.length > 0 ? (
                  <CollapsibleItemList items={items} />
                ) : (
                  <Text
                    className="py-6 text-center"
                    style={{ fontFamily: fonts.regular, color: colors.textSecondary }}
                  >
                    {t('scan.noItemsFound')}
                  </Text>
                )}
                <ReceiptSummary
                  subtotal={receipt.subtotal}
                  tax={receipt.taxAmount}
                  discount={receipt.discountAmount}
                  total={receipt.totalAmount}
                />
              </Ticket>

              {receipt.confidence != null && receipt.confidence < 80 && (
                <View className="flex-row items-center mt-4 px-1">
                  <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
                  <Text
                    className="ml-2 flex-1"
                    style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.warning }}
                  >
                    {t('scan.lowConfidence')}
                  </Text>
                </View>
              )}

              {receipt.notes ? (
                <View className="mt-8">
                  <SectionHeader title={t('receipt.notes')} />
                  <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.text }}>
                    {receipt.notes}
                  </Text>
                </View>
              ) : null}

              {receipt.imagePath ? (
                <View className="mt-8">
                  <ListGroup>
                    <ListRow
                      title={t('receipt.originalPhoto')}
                      icon="image-outline"
                      onPress={() => setShowPhoto((shown) => !shown)}
                      accessory={
                        <Image
                          source={{ uri: receipt.imagePath }}
                          style={{ width: 40, height: 40, borderRadius: 8 }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      }
                    />
                  </ListGroup>
                  {showPhoto ? (
                    <Image
                      source={{ uri: receipt.imagePath }}
                      style={{ width: '100%', aspectRatio: 0.6, borderRadius: 16, marginTop: 12 }}
                      contentFit="contain"
                      transition={150}
                      cachePolicy="memory-disk"
                      accessible
                      accessibilityRole="image"
                      accessibilityLabel={t('receipt.photoOf', {
                        store: store?.name || t('scan.unknownStore'),
                      })}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <View className="mx-4 mt-4">
              <ListGroup>
                <View className="px-4 py-3">
                  <TextInput
                    className="text-text dark:text-text-dark bg-background dark:bg-background-dark px-3 py-2 border border-border dark:border-border-dark"
                    style={{ fontFamily: fonts.semibold, fontSize: 17, borderRadius: 10 }}
                    value={editedStoreName}
                    onChangeText={setEditedStoreName}
                    placeholder={t('receipt.store')}
                    placeholderTextColor={colors.textTertiary}
                    accessibilityLabel={t('receipt.store')}
                  />
                </View>
                <ListRow
                  title={formattedTime ? `${formattedDate} · ${formattedTime}` : formattedDate}
                  icon="calendar-outline"
                  chevron
                  onPress={() => setShowDateModal(true)}
                />
              </ListGroup>

              <View className="mt-8">
                <SectionHeader
                  title={`${t('receipt.items')} (${editedItems.length})`}
                  action={{
                    label: t('receipt.addItem'),
                    onPress: () => openItemEditor(null, null),
                  }}
                />
                <Ticket>
                  {editedItems.length > 0 ? (
                    editedItems.map((item, index) => {
                      const category = getCategoryForItem(item.categoryId);
                      const meta = [
                        item.quantity > 1 ? `${item.quantity}x` : null,
                        category ? categoryLabel(category.name, t) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <TicketLine
                          key={item.id || `new-${index}`}
                          label={item.name || t('receipt.itemName')}
                          amount={formatPrice(item.price / 100)}
                          meta={meta || undefined}
                          onPress={() => openItemEditor(item, index)}
                          accessibilityHint={t('receipt.editItem')}
                          trailing={
                            <Pressable
                              onPress={() => deleteItemFromList(index)}
                              hitSlop={ICON_HIT_SLOP}
                              accessibilityRole="button"
                              accessibilityLabel={`${t('common.delete')}: ${item.name || t('receipt.itemName')}`}
                              style={{
                                minWidth: MIN_TARGET,
                                minHeight: MIN_TARGET,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={20}
                                color={colors.textTertiary}
                              />
                            </Pressable>
                          }
                        />
                      );
                    })
                  ) : (
                    <Text
                      className="py-6 text-center"
                      style={{ fontFamily: fonts.regular, color: colors.textSecondary }}
                    >
                      {t('scan.noItemsFound')}
                    </Text>
                  )}
                  <TicketRule />
                  <TicketLine
                    variant="total"
                    label={t('receipt.total')}
                    amount={formatPrice(
                      editedItems.reduce((sum, item) => sum + item.price, 0) / 100
                    )}
                  />
                </Ticket>
              </View>
            </View>
          )}
        </ReadingColumn>
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
            <Text
              className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
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
            <Text
              className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('receipt.itemPrice')}
            </Text>
            <TextInput
              className="bg-surface dark:bg-surface-dark text-text dark:text-text-dark rounded-xl px-4 py-3 mb-4 border border-border dark:border-border-dark"
              value={editingItemPrice}
              onChangeText={setEditingItemPrice}
              placeholder={formatAmountInput(0, 2)}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('receipt.itemPrice')}
              keyboardType="decimal-pad"
            />

            {/* Quantity */}
            <Text
              className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('receipt.itemQuantity')}
            </Text>
            <TextInput
              className="bg-surface dark:bg-surface-dark text-text dark:text-text-dark rounded-xl px-4 py-3 mb-4 border border-border dark:border-border-dark"
              value={editingItemQuantity}
              onChangeText={setEditingItemQuantity}
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('receipt.itemQuantity')}
              keyboardType="decimal-pad"
            />

            {/* Category */}
            <Text
              className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('item.category')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => (
                <Chip
                  key={cat.id}
                  label={categoryLabel(cat.name, t)}
                  selected={editingItem?.categoryId === cat.id}
                  onPress={() =>
                    setEditingItem((prev) => (prev ? { ...prev, categoryId: cat.id } : null))
                  }
                />
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <DateEditModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSave={() => setShowDateModal(false)}
        day={editDay}
        month={editMonth}
        year={editYear}
        time={editTime}
        onChangeDay={setEditDay}
        onChangeMonth={setEditMonth}
        onChangeYear={setEditYear}
        onChangeTime={setEditTime}
        dateFormat={dateFormat}
        colors={colors}
      />

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
