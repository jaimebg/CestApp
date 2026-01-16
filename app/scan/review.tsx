import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Custom date picker - avoiding native DateTimePicker to prevent modal conflicts
import { Button, Card, Badge } from '@/src/components/ui';
import { parseReceipt, ParsedReceipt, ParsedItem, ParserOptions } from '@/src/services/ocr/parser';
import { useFormatPrice, usePreferencesStore } from '@/src/store/preferences';
import { getSupportedCurrencies, Currency } from '@/src/config/currency';
import { findOrCreateStore } from '@/src/db/queries/stores';
import { createReceipt } from '@/src/db/queries/receipts';
import { createItems } from '@/src/db/queries/items';
import { getCategories } from '@/src/db/queries/categories';
import {
  getCategoryForItem,
  normalizeItemName,
  recordUserCorrection,
} from '@/src/db/seed';

type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
};

export default function ScanReviewScreen() {
  const { uri, source, ocrText, ocrLines, isPdf } = useLocalSearchParams<{
    uri: string;
    source: string;
    ocrText?: string;
    ocrLines?: string;
    isPdf?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { formatPrice, currency } = useFormatPrice();
  const dateFormat = usePreferencesStore((state) => state.dateFormat);
  const decimalSeparator = usePreferencesStore((state) => state.decimalSeparator);

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
    primary: '#93BD57',
    primaryDark: '#7AA042',
    accent: '#FBE580',
    error: isDark ? '#C94444' : '#980404',
  };

  // Parse OCR lines if available
  const lines: string[] = ocrLines ? JSON.parse(ocrLines) : [];
  const hasOcrResult = ocrText && ocrText.length > 0;
  const isPdfFile = isPdf === 'true';

  // Parse receipt data with user preferences as hints
  const parserOptions: ParserOptions = useMemo(
    () => ({
      preferredDateFormat: dateFormat,
      preferredDecimalSeparator: decimalSeparator,
    }),
    [dateFormat, decimalSeparator]
  );

  const initialParsedData = useMemo(() => {
    if (lines.length > 0) {
      return parseReceipt(lines, parserOptions);
    }
    return null;
  }, [lines, parserOptions]);

  // Currency
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const currencies = useMemo(() => getSupportedCurrencies(), []);

  // Categories
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategoriesList);
  }, []);

  // Editable state
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(initialParsedData);
  const [showRawText, setShowRawText] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit modals state
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTotalModal, setShowTotalModal] = useState(false);

  // Edit form state
  const [editStoreName, setEditStoreName] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState('1');
  const [editItemCategoryId, setEditItemCategoryId] = useState<number | null>(null);
  const [editTotal, setEditTotal] = useState('');

  // Calculate items sum and validation
  const itemsSum = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [parsedData]);

  const currentTotal = parsedData?.total || 0;
  const totalsDiffer = Math.abs(itemsSum - currentTotal) > 0.01; // Allow for small floating point differences
  const canSave = !totalsDiffer && parsedData && parsedData.items.length > 0;

  const handleDone = () => {
    router.dismissAll();
  };

  const handleBack = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!parsedData) return;

    setIsSaving(true);
    try {
      // 1. Find or create store
      const storeName = parsedData.storeName || t('scan.unknownStore');
      const storeId = await findOrCreateStore(storeName);

      // 2. Build date with time if available
      let receiptDateTime = parsedData.date || new Date();
      if (parsedData.time) {
        const [hours, minutes] = parsedData.time.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          receiptDateTime = new Date(receiptDateTime);
          receiptDateTime.setHours(hours, minutes, 0, 0);
        }
      }

      // 3. Create receipt record
      const receipt = await createReceipt({
        storeId,
        dateTime: receiptDateTime,
        totalAmount: Math.round((parsedData.total || 0) * 100),
        subtotal: parsedData.subtotal ? Math.round(parsedData.subtotal * 100) : null,
        taxAmount: parsedData.tax ? Math.round(parsedData.tax * 100) : null,
        discountAmount: parsedData.discount ? Math.round(parsedData.discount * 100) : null,
        paymentMethod: parsedData.paymentMethod,
        imagePath: uri || null,
        rawText: parsedData.rawText || lines.join('\n'),
        processingStatus: 'completed',
        confidence: parsedData.confidence,
      });

      // 4. Categorize and create items
      const itemsData = await Promise.all(
        parsedData.items.map(async (item) => {
          // If user manually set category, use it
          const manualCategoryId = (item as ParsedItem & { categoryId?: number }).categoryId;
          let categoryId: number;
          let confidence: number;

          if (manualCategoryId) {
            categoryId = manualCategoryId;
            confidence = 100;
            // Record user correction for learning
            await recordUserCorrection(item.name, categoryId, storeId);
          } else {
            const category = await getCategoryForItem(item.name, storeId);
            categoryId = category.categoryId;
            confidence = category.confidence;
          }

          return {
            receiptId: receipt.id,
            name: item.name,
            normalizedName: normalizeItemName(item.name),
            price: Math.round(item.totalPrice * 100),
            quantity: item.quantity,
            unitPrice: Math.round(item.unitPrice * 100),
            unit: item.unit || null,
            categoryId,
            confidence,
          };
        })
      );

      if (itemsData.length > 0) {
        await createItems(itemsData);
      }

      // 5. Success - navigate to dashboard
      showSuccessToast(t('common.success'), t('scan.receiptSaved'));
      handleDone();
    } catch (error) {
      console.error('Save error:', error);
      showErrorToast(t('common.error'), t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      items: parsedData.items.filter((_, i) => i !== index),
    });
  };

  // Store edit handlers
  const openStoreEdit = () => {
    setEditStoreName(parsedData?.storeName || '');
    setShowStoreModal(true);
  };

  const saveStoreEdit = () => {
    if (!parsedData) return;
    setParsedData({ ...parsedData, storeName: editStoreName.trim() || null });
    setShowStoreModal(false);
  };

  // Date edit handlers
  const openDateEdit = () => {
    const date = parsedData?.date || new Date();
    setEditDay(date.getDate().toString());
    setEditMonth((date.getMonth() + 1).toString());
    setEditYear(date.getFullYear().toString());
    setEditTime(parsedData?.time || '');
    setShowDateModal(true);
  };

  const saveDateEdit = () => {
    if (!parsedData) return;
    const day = parseInt(editDay) || 1;
    const month = parseInt(editMonth) || 1;
    const year = parseInt(editYear) || new Date().getFullYear();
    const newDate = new Date(year, month - 1, day);

    setParsedData({
      ...parsedData,
      date: newDate,
      time: editTime || null,
    });
    setShowDateModal(false);
  };

  // Total edit handlers
  const openTotalEdit = () => {
    setEditTotal((parsedData?.total || 0).toFixed(2));
    setShowTotalModal(true);
  };

  const saveTotalEdit = () => {
    if (!parsedData) return;
    const newTotal = parseFloat(editTotal) || 0;
    setParsedData({
      ...parsedData,
      total: newTotal,
    });
    setShowTotalModal(false);
  };

  const setTotalToItemsSum = () => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      total: itemsSum,
    });
  };

  // Item edit handlers
  const openItemEdit = (index: number | null) => {
    if (index !== null && parsedData) {
      const item = parsedData.items[index];
      setEditingItemIndex(index);
      setEditItemName(item.name);
      setEditItemPrice(item.totalPrice.toFixed(2));
      setEditItemQuantity(item.quantity.toString());
      setEditItemCategoryId((item as ParsedItem & { categoryId?: number }).categoryId || null);
    } else {
      // Adding new item
      setEditingItemIndex(null);
      setEditItemName('');
      setEditItemPrice('');
      setEditItemQuantity('1');
      setEditItemCategoryId(null);
    }
    setShowItemModal(true);
  };

  const saveItemEdit = () => {
    if (!parsedData) return;

    const price = parseFloat(editItemPrice) || 0;
    const quantity = parseFloat(editItemQuantity) || 1;
    const unitPrice = price / quantity;

    const newItem: ParsedItem & { categoryId?: number } = {
      name: editItemName.trim(),
      quantity,
      unitPrice,
      totalPrice: price,
      unit: null,
      confidence: 100, // Manual entry has 100% confidence
      categoryId: editItemCategoryId || undefined,
    };

    if (editingItemIndex !== null) {
      // Update existing item
      setParsedData({
        ...parsedData,
        items: parsedData.items.map((item, i) =>
          i === editingItemIndex ? newItem : item
        ),
      });
    } else {
      // Add new item
      setParsedData({
        ...parsedData,
        items: [...parsedData.items, newItem],
      });
    }

    setShowItemModal(false);
  };

  // Category selection
  const openCategorySelect = () => {
    setShowCategoryModal(true);
  };

  const selectCategory = (categoryId: number) => {
    setEditItemCategoryId(categoryId);
    setShowCategoryModal(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return t('scan.noDateFound');
    return date.toLocaleDateString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return colors.primary;
    if (confidence >= 50) return colors.accent;
    return colors.error;
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'cash':
        return t('receipt.cash');
      case 'card':
        return t('receipt.card');
      case 'digital':
        return t('receipt.digital');
      default:
        return t('scan.unknownPayment');
    }
  };

  const getCategoryName = (categoryId: number | null | undefined) => {
    if (!categoryId) return null;
    const category = categoriesList.find((c) => c.id === categoryId);
    return category ? `${category.icon || ''} ${category.name}`.trim() : null;
  };

  const renderItemRow = (item: ParsedItem & { categoryId?: number }, index: number) => (
    <Pressable
      key={index}
      onPress={() => openItemEdit(index)}
      className="flex-row items-center py-3 border-b"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-1 mr-2">
        <Text
          className="text-sm"
          style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {item.quantity !== 1 && (
            <Text
              className="text-xs mr-2"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
            >
              {item.quantity} {item.unit || 'x'} @ {formatPrice(item.unitPrice)}
            </Text>
          )}
          {item.categoryId && (
            <Text
              className="text-xs"
              style={{ color: colors.primary, fontFamily: 'Inter_400Regular' }}
            >
              {getCategoryName(item.categoryId)}
            </Text>
          )}
        </View>
      </View>
      <Text
        className="text-sm mr-3"
        style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
      >
        {formatPrice(item.totalPrice)}
      </Text>
      <Pressable
        onPress={() => handleRemoveItem(index)}
        hitSlop={8}
        className="p-1"
      >
        <Ionicons name="close-circle" size={20} color={colors.error} />
      </Pressable>
    </Pressable>
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background, paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={handleBack} className="flex-row items-center" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text
          className="text-lg"
          style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('scan.reviewTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {isPdfFile ? (
          // PDF - OCR not yet implemented
          <Card variant="filled" padding="lg">
            <View className="items-center">
              <View className="bg-primary/20 rounded-full p-4 mb-3">
                <Ionicons name="document-text-outline" size={32} color={colors.primary} />
              </View>
              <Text
                className="text-base text-center"
                style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
              >
                {t('scan.pdfOcrPending')}
              </Text>
              <Text
                className="text-sm text-center mt-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('scan.pdfOcrPendingDesc')}
              </Text>
            </View>
          </Card>
        ) : hasOcrResult && parsedData ? (
          // Image with parsed OCR results
          <>
            {/* Confidence indicator */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View
                  className="rounded-full p-2 mr-2"
                  style={{ backgroundColor: getConfidenceColor(parsedData.confidence) + '20' }}
                >
                  <Ionicons
                    name={parsedData.confidence >= 70 ? 'checkmark' : 'alert'}
                    size={16}
                    color={getConfidenceColor(parsedData.confidence)}
                  />
                </View>
                <Text
                  className="text-sm"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                >
                  {t('scan.confidence')}: {parsedData.confidence}%
                </Text>
              </View>
              {parsedData.confidence < 70 && (
                <Badge variant="warning" size="sm" label={t('scan.lowConfidence')} />
              )}
            </View>

            {/* Store and Date Info */}
            <Card variant="filled" padding="md" className="mb-4">
              <Text
                className="text-sm mb-3"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('scan.receiptInfo')}
              </Text>

              {/* Store - Editable */}
              <Pressable
                onPress={openStoreEdit}
                className="flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="storefront-outline" size={18} color={colors.textSecondary} />
                  <Text
                    className="text-base ml-2 flex-1"
                    style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
                    numberOfLines={1}
                  >
                    {parsedData.storeName || t('scan.unknownStore')}
                  </Text>
                </View>
                <Ionicons name="pencil" size={16} color={colors.textSecondary} />
              </Pressable>

              {/* Address if available */}
              {parsedData.storeAddress && (
                <View className="flex-row items-center mb-3 ml-6">
                  <Text
                    className="text-xs"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                    numberOfLines={1}
                  >
                    {parsedData.storeAddress}
                  </Text>
                </View>
              )}

              {/* Date and Time - Editable */}
              <Pressable
                onPress={openDateEdit}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text
                    className="text-base ml-2"
                    style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
                  >
                    {formatDate(parsedData.date)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  {parsedData.time && (
                    <View className="flex-row items-center mr-2">
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                      <Text
                        className="text-sm ml-1"
                        style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                      >
                        {parsedData.time}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                </View>
              </Pressable>

              {/* Payment Method */}
              {parsedData.paymentMethod && (
                <View className="flex-row items-center mt-3">
                  <Ionicons
                    name={parsedData.paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                  <Text
                    className="text-sm ml-2"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {getPaymentMethodLabel(parsedData.paymentMethod)}
                  </Text>
                </View>
              )}
            </Card>

            {/* Items */}
            <Card variant="outlined" padding="md" className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="text-sm"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
                >
                  {t('receipt.items')}
                </Text>
                <Badge
                  variant="info"
                  size="sm"
                  label={`${parsedData.items.length} ${parsedData.items.length === 1 ? 'item' : 'items'}`}
                />
              </View>

              {parsedData.items.length > 0 ? (
                <View>
                  {parsedData.items.map((item, index) =>
                    renderItemRow(item as ParsedItem & { categoryId?: number }, index)
                  )}
                </View>
              ) : (
                <View className="py-4 items-center">
                  <Ionicons name="receipt-outline" size={24} color={colors.textSecondary} />
                  <Text
                    className="text-sm mt-2"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('scan.noItemsFound')}
                  </Text>
                </View>
              )}

              {/* Add Item Button */}
              <Pressable
                onPress={() => openItemEdit(null)}
                className="flex-row items-center justify-center py-3 mt-2 rounded-lg"
                style={{ backgroundColor: colors.primary + '15' }}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text
                  className="text-sm ml-2"
                  style={{ color: colors.primary, fontFamily: 'Inter_500Medium' }}
                >
                  {t('scan.addItem')}
                </Text>
              </Pressable>
            </Card>

            {/* Totals */}
            <Card variant="filled" padding="md" className="mb-4">
              {/* Currency Selector */}
              <Pressable
                onPress={() => setShowCurrencyModal(true)}
                className="flex-row items-center justify-end mb-2"
              >
                <Text
                  className="text-xs mr-1"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                >
                  {currency.code}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </Pressable>

              {/* Items Sum */}
              <View className="flex-row justify-between mb-2">
                <Text
                  className="text-sm"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                >
                  {t('scan.itemsSum')}
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
                >
                  {formatPrice(itemsSum)}
                </Text>
              </View>

              {parsedData.subtotal !== null && (
                <View className="flex-row justify-between mb-2">
                  <Text
                    className="text-sm"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('receipt.subtotal')}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
                  >
                    {formatPrice(parsedData.subtotal)}
                  </Text>
                </View>
              )}

              {parsedData.discount !== null && parsedData.discount > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text
                    className="text-sm"
                    style={{ color: colors.primary, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('receipt.discount')}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: colors.primary, fontFamily: 'Inter_500Medium' }}
                  >
                    -{formatPrice(parsedData.discount)}
                  </Text>
                </View>
              )}

              {parsedData.tax !== null && (
                <View className="flex-row justify-between mb-2">
                  <Text
                    className="text-sm"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('receipt.tax')}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
                  >
                    {formatPrice(parsedData.tax)}
                  </Text>
                </View>
              )}

              {/* Total - Editable */}
              <Pressable
                onPress={openTotalEdit}
                className="flex-row justify-between items-center pt-2 border-t"
                style={{ borderColor: colors.border }}
              >
                <Text
                  className="text-base"
                  style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                >
                  {t('receipt.total')}
                </Text>
                <View className="flex-row items-center">
                  <Text
                    className="text-base mr-2"
                    style={{
                      color: totalsDiffer ? colors.error : colors.text,
                      fontFamily: 'Inter_600SemiBold'
                    }}
                  >
                    {formatPrice(parsedData.total)}
                  </Text>
                  <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                </View>
              </Pressable>

              {/* Totals Mismatch Warning */}
              {totalsDiffer && (
                <View className="mt-3">
                  <View
                    className="flex-row items-center p-3 rounded-lg"
                    style={{ backgroundColor: colors.error + '15' }}
                  >
                    <Ionicons name="warning" size={18} color={colors.error} />
                    <Text
                      className="flex-1 text-xs ml-2"
                      style={{ color: colors.error, fontFamily: 'Inter_500Medium' }}
                    >
                      {t('scan.totalsMismatch')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={setTotalToItemsSum}
                    className="flex-row items-center justify-center py-2 mt-2 rounded-lg"
                    style={{ backgroundColor: colors.primary + '15' }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                    <Text
                      className="text-sm ml-2"
                      style={{ color: colors.primary, fontFamily: 'Inter_500Medium' }}
                    >
                      {t('scan.matchToItemsSum')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Card>

            {/* Raw Text Toggle */}
            <Pressable
              onPress={() => setShowRawText(!showRawText)}
              className="flex-row items-center justify-center py-2 mb-2"
            >
              <Ionicons
                name={showRawText ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
              <Text
                className="text-sm ml-1"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {showRawText ? t('scan.hideRawText') : t('scan.showRawText')}
              </Text>
            </Pressable>

            {/* Raw OCR text (collapsible) */}
            {showRawText && (
              <Card variant="outlined" padding="md">
                <Text
                  className="text-sm mb-2"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
                >
                  {t('scan.extractedText')}
                </Text>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {lines.map((line, index) => (
                    <Text
                      key={index}
                      className="text-xs mb-0.5"
                      style={{
                        color: colors.text,
                        fontFamily: 'Inter_400Regular',
                        lineHeight: 16,
                      }}
                    >
                      {line}
                    </Text>
                  ))}
                </ScrollView>
              </Card>
            )}
          </>
        ) : (
          // No OCR results
          <Card variant="outlined" padding="lg">
            <View className="items-center py-4">
              <View
                className="rounded-full p-4 mb-3"
                style={{ backgroundColor: colors.error + '20' }}
              >
                <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
              </View>
              <Text
                className="text-base text-center"
                style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
              >
                {t('scan.noTextDetected')}
              </Text>
              <Text
                className="text-sm text-center mt-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('scan.noTextDetectedDesc')}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View
        className="px-4 pb-4"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
      >
        {hasOcrResult && parsedData ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button variant="secondary" size="lg" onPress={handleDone}>
                {t('scan.discardReceipt')}
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="primary"
                size="lg"
                onPress={handleSave}
                disabled={!canSave || isSaving}
              >
                {isSaving ? t('scan.saving') : t('scan.saveReceipt')}
              </Button>
            </View>
          </View>
        ) : (
          <Button variant="primary" size="lg" onPress={handleDone}>
            {t('common.done')}
          </Button>
        )}
      </View>

      {/* Store Edit Modal */}
      <Modal
        visible={showStoreModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStoreModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-4 py-4 border-b"
              style={{ borderColor: colors.border }}
            >
              <Pressable onPress={() => setShowStoreModal(false)} hitSlop={8}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Text
                className="text-lg"
                style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
              >
                {t('scan.editStore')}
              </Text>
              <Pressable onPress={saveStoreEdit} hitSlop={8}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>

            <View className="p-4">
              <Text
                className="text-sm mb-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('scan.storeName')}
              </Text>
              <TextInput
                value={editStoreName}
                onChangeText={setEditStoreName}
                placeholder={t('scan.unknownStore')}
                placeholderTextColor={colors.textSecondary}
                className="px-4 py-3 rounded-xl text-base"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontFamily: 'Inter_400Regular',
                }}
                autoFocus
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Date Edit Modal */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDateModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-4 py-4 border-b"
              style={{ borderColor: colors.border }}
            >
              <Pressable onPress={() => setShowDateModal(false)} hitSlop={8}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Text
                className="text-lg"
                style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
              >
                {t('scan.editDate')}
              </Text>
              <Pressable onPress={saveDateEdit} hitSlop={8}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>

            <View className="p-4">
              <Text
                className="text-sm mb-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('receipt.date')}
              </Text>

              {/* Day / Month / Year inputs */}
              <View className="flex-row gap-2 mb-4">
                <View className="flex-1">
                  <Text
                    className="text-xs mb-1"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {dateFormat === 'MDY' ? t('scan.month') : t('scan.day')}
                  </Text>
                  <TextInput
                    value={dateFormat === 'MDY' ? editMonth : editDay}
                    onChangeText={dateFormat === 'MDY' ? setEditMonth : setEditDay}
                    placeholder={dateFormat === 'MDY' ? 'MM' : 'DD'}
                    placeholderTextColor={colors.textSecondary}
                    className="px-4 py-3 rounded-xl text-base text-center"
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      fontFamily: 'Inter_400Regular',
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-xs mb-1"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {dateFormat === 'MDY' ? t('scan.day') : t('scan.month')}
                  </Text>
                  <TextInput
                    value={dateFormat === 'MDY' ? editDay : editMonth}
                    onChangeText={dateFormat === 'MDY' ? setEditDay : setEditMonth}
                    placeholder={dateFormat === 'MDY' ? 'DD' : 'MM'}
                    placeholderTextColor={colors.textSecondary}
                    className="px-4 py-3 rounded-xl text-base text-center"
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      fontFamily: 'Inter_400Regular',
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-xs mb-1"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('scan.year')}
                  </Text>
                  <TextInput
                    value={editYear}
                    onChangeText={setEditYear}
                    placeholder="YYYY"
                    placeholderTextColor={colors.textSecondary}
                    className="px-4 py-3 rounded-xl text-base text-center"
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      fontFamily: 'Inter_400Regular',
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              <Text
                className="text-sm mb-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('scan.time')}
              </Text>
              <TextInput
                value={editTime}
                onChangeText={setEditTime}
                placeholder="HH:MM"
                placeholderTextColor={colors.textSecondary}
                className="px-4 py-3 rounded-xl text-base"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontFamily: 'Inter_400Regular',
                }}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Item Edit Modal */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-4 py-4 border-b"
              style={{ borderColor: colors.border }}
            >
              <Pressable onPress={() => setShowItemModal(false)} hitSlop={8}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Text
                className="text-lg"
                style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
              >
                {editingItemIndex !== null ? t('scan.editItem') : t('scan.addItem')}
              </Text>
              <Pressable
                onPress={saveItemEdit}
                hitSlop={8}
                disabled={!editItemName.trim() || !editItemPrice}
              >
                <Text
                  style={{
                    color: editItemName.trim() && editItemPrice ? colors.primary : colors.textSecondary,
                    fontFamily: 'Inter_600SemiBold',
                  }}
                >
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>

            <ScrollView className="p-4">
              {/* Item Name */}
              <Text
                className="text-sm mb-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('item.name')}
              </Text>
              <TextInput
                value={editItemName}
                onChangeText={setEditItemName}
                placeholder={t('item.name')}
                placeholderTextColor={colors.textSecondary}
                className="px-4 py-3 rounded-xl text-base mb-4"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontFamily: 'Inter_400Regular',
                }}
                autoFocus
              />

              {/* Price */}
              <Text
                className="text-sm mb-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('item.price')}
              </Text>
              <TextInput
                value={editItemPrice}
                onChangeText={setEditItemPrice}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                className="px-4 py-3 rounded-xl text-base mb-4"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontFamily: 'Inter_400Regular',
                }}
                keyboardType="decimal-pad"
              />

              {/* Quantity */}
              <Text
                className="text-sm mb-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('item.quantity')}
              </Text>
              <TextInput
                value={editItemQuantity}
                onChangeText={setEditItemQuantity}
                placeholder="1"
                placeholderTextColor={colors.textSecondary}
                className="px-4 py-3 rounded-xl text-base mb-4"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontFamily: 'Inter_400Regular',
                }}
                keyboardType="decimal-pad"
              />

              {/* Category */}
              <Text
                className="text-sm mb-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('item.category')}
              </Text>
              <Pressable
                onPress={openCategorySelect}
                className="flex-row items-center justify-between px-4 py-3 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <Text
                  style={{
                    color: editItemCategoryId ? colors.text : colors.textSecondary,
                    fontFamily: 'Inter_400Regular',
                  }}
                >
                  {editItemCategoryId
                    ? getCategoryName(editItemCategoryId)
                    : t('scan.selectCategory')}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-4 py-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <Pressable onPress={() => setShowCategoryModal(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text
              className="text-lg"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('item.category')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Category List */}
          <FlatList
            data={categoriesList}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected = item.id === editItemCategoryId;
              return (
                <Pressable
                  onPress={() => selectCategory(item.id)}
                  className="flex-row items-center px-4 py-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: (item.color || colors.textSecondary) + '20' }}
                  >
                    <Text className="text-base">{item.icon || '📦'}</Text>
                  </View>
                  <Text
                    className="flex-1 text-base"
                    style={{
                      color: colors.text,
                      fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                    }}
                  >
                    {item.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </SafeAreaView>
      </Modal>

      {/* Total Edit Modal */}
      <Modal
        visible={showTotalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTotalModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-4 py-4 border-b"
              style={{ borderColor: colors.border }}
            >
              <Pressable onPress={() => setShowTotalModal(false)} hitSlop={8}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Text
                className="text-lg"
                style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
              >
                {t('receipt.total')}
              </Text>
              <Pressable onPress={saveTotalEdit} hitSlop={8}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>

            <View className="p-4">
              <Text
                className="text-sm mb-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
              >
                {t('receipt.total')}
              </Text>
              <TextInput
                value={editTotal}
                onChangeText={setEditTotal}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                className="px-4 py-3 rounded-xl text-base"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontFamily: 'Inter_400Regular',
                }}
                keyboardType="decimal-pad"
                autoFocus
              />

              {/* Helper text showing items sum */}
              <View className="mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.surface }}>
                <Text
                  className="text-sm"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                >
                  {t('scan.itemsSum')}: {formatPrice(itemsSum)}
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-4 py-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <Pressable onPress={() => setShowCurrencyModal(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text
              className="text-lg"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('settings.currency')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Currency List */}
          <FlatList
            data={currencies}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = item.code === currency.code;
              return (
                <Pressable
                  onPress={() => {
                    setCurrency(item.code);
                    setShowCurrencyModal(false);
                  }}
                  className="flex-row items-center px-4 py-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <View className="flex-1">
                    <Text
                      className="text-base"
                      style={{
                        color: colors.text,
                        fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                      }}
                    >
                      {item.symbol} - {item.name}
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                    >
                      {item.code}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
