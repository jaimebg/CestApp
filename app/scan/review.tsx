import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { type ZoneDefinition } from '@/src/types/zones';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import { createScopedLogger } from '@/src/utils/debug';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { StoreEditModal } from '@/src/components/scan/modals/StoreEditModal';
import { DateEditModal } from '@/src/components/scan/modals/DateEditModal';
import { ItemEditModal } from '@/src/components/scan/modals/ItemEditModal';
import { CategoryPickerModal } from '@/src/components/scan/modals/CategoryPickerModal';
import { TotalEditModal } from '@/src/components/scan/modals/TotalEditModal';
import { ReadingModal } from '@/src/components/scan/modals/ReadingModal';
import { ConfirmationModal } from '@/src/components/ui/ConfirmationModal';
import type { Category } from '@/src/components/scan/types';
import type { ParsedReceipt, ParsedItem, ParserOptions } from '@/src/services/ocr/parser';
import { parseCapture } from '@/src/services/ocr/parseCapture';
import { useScanDraftStore } from '@/src/store/scanDraft';
import { deleteReceiptFile } from '@/src/services/storage';
import { openSavedReceipt } from '@/src/navigation/receiptFlow';
import { parseWithTemplate, shouldUseTemplate } from '@/src/services/ocr/templateParser';
import type { OcrBlock } from '@/src/services/ocr';
import { useFormatPrice, usePreferencesStore } from '@/src/store/preferences';
import { parseAmountInput } from '@/src/config/currency';
import { useAppColors } from '@/src/hooks/useAppColors';
import { ICON_HIT_SLOP } from '@/src/theme/a11y';
import { ScanItemRow } from '@/src/components/scan/ScanItemRow';
import { useLlmRefinement } from '@/src/hooks/useLlmRefinement';
import { RefinementBanner } from '@/src/components/scan/RefinementBanner';
import { DuplicateBanner } from '@/src/components/scan/DuplicateBanner';
import { ProposalDiffModal } from '@/src/components/scan/modals/ProposalDiffModal';
import {
  findOrCreateStore,
  getStoreByNormalizedName,
  normalizeStoreName,
} from '@/src/db/queries/stores';
import { createReceipt, findDuplicateReceipt } from '@/src/db/queries/receipts';
import type { Receipt } from '@/src/db/schema';
import { createItems } from '@/src/db/queries/items';
import { getCategories } from '@/src/db/queries/categories';
import { getTemplateByStoreId, deleteTemplate } from '@/src/db/queries/storeParsingTemplates';
import {
  getCategoryForItem,
  normalizeItemName,
  recordUserCorrection,
} from '@/src/db/queries/categorization';

const logger = createScopedLogger('Review');

// Stable empty values, so a screen opened without a draft does not hand its
// hooks a new array on every render.
const NO_LINES: string[] = [];
const NO_BLOCKS: OcrBlock[] = [];
const NO_ZONES: ZoneDefinition[] = [];
const FALLBACK_DIMENSIONS = { width: 1000, height: 1500 };

/**
 * The timestamp a receipt is stored under. Falls back to now when the receipt
 * carries no readable date, and keeps the date when it carries no time.
 */
function resolveReceiptDateTime(date: Date | null, time: string | null): Date {
  const resolved = date ? new Date(date) : new Date();

  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      resolved.setHours(hours, minutes, 0, 0);
    }
  }

  return resolved;
}

export default function ScanReviewScreen() {
  const draft = useScanDraftStore((state) => state.draft);
  const resetDraft = useScanDraftStore((state) => state.reset);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useAppColors();
  const { formatPrice, formatAmountInput } = useFormatPrice();
  const dateFormat = usePreferencesStore((state) => state.dateFormat);
  const decimalSeparator = usePreferencesStore((state) => state.decimalSeparator);

  const uri = draft?.uri ?? null;
  const isPdf = draft?.isPdf ?? false;
  const ocrText = draft?.ocrText ?? '';
  const lines = draft?.lines ?? NO_LINES;
  const blocks = draft?.blocks ?? NO_BLOCKS;
  const dimensions = draft?.dimensions ?? FALLBACK_DIMENSIONS;
  const detectedTotal = draft?.detectedTotal ?? null;
  const hasOcrResult = ocrText.length > 0;

  // A receipt that was never saved keeps no copy of its file, whichever way the
  // screen was left: the discard button, Back, or the system gesture. The draft
  // goes with it, so a later scan cannot open onto the last receipt's text.
  const wasSaved = useRef(false);
  useEffect(
    () => () => {
      resetDraft();
      if (!wasSaved.current && uri) {
        deleteReceiptFile(uri).catch((error) => logger.error('Could not delete the file:', error));
      }
    },
    [resetDraft, uri]
  );

  const hasLoggedDebugInfo = useRef(false);
  useEffect(() => {
    if (hasLoggedDebugInfo.current) return;
    hasLoggedDebugInfo.current = true;

    logger.log('Capture received:', {
      dimensions,
      blocks: blocks.length,
      firstBlockBbox: blocks[0]?.boundingBox ?? null,
    });
  }, [dimensions, blocks]);

  const parserOptions: ParserOptions = useMemo(
    () => ({
      preferredDateFormat: dateFormat,
      preferredDecimalSeparator: decimalSeparator,
    }),
    [dateFormat, decimalSeparator]
  );

  const [appliedZones, setAppliedZones] = useState<ZoneDefinition[]>(draft?.zones ?? NO_ZONES);

  const readReceipt = useCallback(
    (zones: ZoneDefinition[]) =>
      parseCapture({
        lines,
        blocks,
        ocrText,
        dimensions,
        zones,
        detectedTotal,
        options: parserOptions,
      }),
    [lines, blocks, ocrText, dimensions, detectedTotal, parserOptions]
  );

  const [initialParsedData] = useState(() => readReceipt(draft?.zones ?? NO_ZONES));

  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategoriesList);
  }, []);

  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(initialParsedData);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateReceipt, setDuplicateReceipt] = useState<Receipt | null>(null);

  const storeName = parsedData?.storeName ?? null;
  const receiptDate = parsedData?.date ?? null;
  const receiptTime = parsedData?.time ?? null;
  const receiptTotal = parsedData?.total ?? null;

  // Re-runs when the store, date or total is corrected, so fixing a misparsed
  // field surfaces (or clears) the warning straight away.
  useEffect(() => {
    let cancelled = false;

    async function checkForDuplicate() {
      if (!storeName || receiptTotal === null || receiptTotal <= 0) {
        setDuplicateReceipt(null);
        return;
      }

      // Looked up rather than created: the receipt may still be discarded.
      const store = await getStoreByNormalizedName(normalizeStoreName(storeName));
      if (cancelled) return;

      if (!store) {
        setDuplicateReceipt(null);
        return;
      }

      const existing = await findDuplicateReceipt(
        store.id,
        resolveReceiptDateTime(receiptDate, receiptTime),
        Math.round(receiptTotal * 100)
      );
      if (cancelled) return;

      setDuplicateReceipt(existing);
    }

    checkForDuplicate().catch((error) => logger.error('Duplicate check failed:', error));

    return () => {
      cancelled = true;
    };
  }, [storeName, receiptDate, receiptTime, receiptTotal]);

  // Mirrors `parsedData` synchronously (writes happen alongside every
  // `setParsedData` call, never via a passive effect) so the LLM refinement
  // hook can merge against the live receipt instead of a stale snapshot,
  // even while its own async model call is still in flight.
  const parsedDataRef = useRef<ParsedReceipt | null>(initialParsedData);

  const updateParsedData = useCallback((receipt: ParsedReceipt | null) => {
    parsedDataRef.current = receipt;
    setParsedData(receipt);
  }, []);

  const applyRefinement = useCallback(
    (receipt: ParsedReceipt) => {
      updateParsedData(receipt);
    },
    [updateParsedData]
  );

  const refinement = useLlmRefinement({
    initial: initialParsedData,
    currentRef: parsedDataRef,
    lines,
    detectedTotal,
    onApply: applyRefinement,
  });

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [showZonePrompt, setShowZonePrompt] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null);
  const [hasExistingTemplate, setHasExistingTemplate] = useState(false);
  const [templateApplied, setTemplateApplied] = useState(false);
  const [showReading, setShowReading] = useState(false);
  const [hasManualEdits, setHasManualEdits] = useState(false);
  const [zonesAwaitingConfirmation, setZonesAwaitingConfirmation] = useState<
    ZoneDefinition[] | null
  >(null);

  // The draft zones this screen has already reacted to. Only the zone editor
  // replaces that array, so a change of identity means zones were redrawn.
  const seenZonesRef = useRef<ZoneDefinition[]>(draft?.zones ?? NO_ZONES);

  const markEdited = useCallback(() => {
    setHasManualEdits(true);
    refinement.markEdited();
  }, [refinement]);

  const applyZones = useCallback(
    (zones: ZoneDefinition[]) => {
      setAppliedZones(zones);
      setHasManualEdits(false);

      const reread = readReceipt(zones);
      if (reread) {
        updateParsedData(reread);
        showSuccessToast(t('common.success'), t('scan.zonesReapplied'));
      }
    },
    [readReceipt, updateParsedData, t]
  );

  // Zones redrawn in the editor land in the draft; the receipt is read again
  // through them when the editor closes.
  useFocusEffect(
    useCallback(() => {
      const zones = useScanDraftStore.getState().draft?.zones;
      if (!zones || zones === seenZonesRef.current) return;
      seenZonesRef.current = zones;

      if (hasManualEdits) {
        setZonesAwaitingConfirmation(zones);
        return;
      }

      applyZones(zones);
    }, [hasManualEdits, applyZones])
  );

  const keepManualEdits = useCallback(() => {
    // The draft holds zones the receipt was not read through; putting the
    // applied ones back keeps what is drawn and what is shown in agreement.
    useScanDraftStore.getState().setZones(appliedZones);
    seenZonesRef.current = appliedZones;
    setZonesAwaitingConfirmation(null);
  }, [appliedZones]);

  // Re-check for template when returning from zones screen (PDF only)
  useFocusEffect(
    useCallback(() => {
      // Templates only apply to PDF imports - camera images vary too much
      if (!isPdf) return;

      // If we haven't applied a template yet and a store was identified,
      // re-check for templates (user might have just created one)
      if (!templateApplied && currentStoreId) {
        getTemplateByStoreId(currentStoreId).then((template) => {
          if (
            template &&
            blocks.length > 0 &&
            parsedData &&
            shouldUseTemplate(template, parsedData.confidence)
          ) {
            const templateParsedData = parseWithTemplate(
              blocks,
              template,
              ocrText || lines.join('\n'),
              dimensions
            );
            updateParsedData(templateParsedData);
            setTemplateApplied(true);
            setHasExistingTemplate(true);
            setShowZonePrompt(false);
            setAppliedZones(template.zones);
          }
        });
      }
    }, [
      templateApplied,
      currentStoreId,
      blocks,
      parsedData,
      ocrText,
      lines,
      dimensions,
      isPdf,
      updateParsedData,
    ])
  );

  useEffect(() => {
    async function checkStoreTemplate() {
      if (!parsedData?.storeName) return;

      const normalizedName = parsedData.storeName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '');

      const store = await getStoreByNormalizedName(normalizedName);
      if (store) {
        setCurrentStoreId(store.id);

        // Templates only apply to PDF imports - camera images vary too much
        if (isPdf) {
          const template = await getTemplateByStoreId(store.id);
          setHasExistingTemplate(!!template);

          // Apply template if one exists and we haven't already applied it
          if (
            template &&
            !templateApplied &&
            blocks.length > 0 &&
            shouldUseTemplate(template, parsedData.confidence)
          ) {
            const templateParsedData = parseWithTemplate(
              blocks,
              template,
              ocrText || lines.join('\n'),
              dimensions
            );
            updateParsedData(templateParsedData);
            setTemplateApplied(true);
            setAppliedZones(template.zones);
            // Don't show zone prompt if template was successfully applied
            setShowZonePrompt(false);
            return;
          }

          // Only show zone prompt for PDFs with low confidence and no template
          const shouldShowPrompt = !template && parsedData.confidence < 90;
          setShowZonePrompt(shouldShowPrompt);
        } else {
          // For camera images, don't use templates
          setHasExistingTemplate(false);
          setShowZonePrompt(false);
        }
      } else {
        setCurrentStoreId(null);
        setHasExistingTemplate(false);
        // Only show zone prompt for PDFs with low confidence
        setShowZonePrompt(isPdf && parsedData.confidence < 90);
      }
    }

    checkStoreTemplate();
  }, [
    parsedData?.storeName,
    parsedData?.confidence,
    isPdf,
    templateApplied,
    blocks,
    dimensions,
    ocrText,
    lines,
    updateParsedData,
  ]);

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

  const itemsSum = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [parsedData]);

  const currentTotal = parsedData?.total || 0;
  const totalsDiffer = Math.abs(itemsSum - currentTotal) > 0.01;
  const canSave = !totalsDiffer && parsedData && parsedData.items.length > 0;

  // Closing modals first prevents a SafeAreaProvider crash on Android, which
  // happens when SafeAreaView is unmounted during the native render cycle.
  const closeAllModals = () => {
    setShowStoreModal(false);
    setShowDateModal(false);
    setShowItemModal(false);
    setShowCategoryModal(false);
    setShowTotalModal(false);
    setShowReading(false);
    setShowDiffModal(false);
  };

  const handleDone = () => {
    closeAllModals();

    // Wait for modals to close before dismissing navigation
    setTimeout(() => {
      router.dismissAll();
    }, 150);
  };

  const handleBack = () => {
    closeAllModals();

    setTimeout(() => {
      router.back();
    }, 100);
  };

  const showSavedReceipt = (receiptId: number) => {
    closeAllModals();

    setTimeout(() => {
      openSavedReceipt(router, receiptId);
    }, 150);
  };

  const handleSave = async () => {
    if (!parsedData) return;

    setIsSaving(true);
    try {
      const storeName = parsedData.storeName || t('scan.unknownStore');
      const storeId = await findOrCreateStore(storeName);

      const receiptDateTime = resolveReceiptDateTime(parsedData.date, parsedData.time);

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

      const itemsData = await Promise.all(
        parsedData.items.map(async (item) => {
          const manualCategoryId = (item as ParsedItem & { categoryId?: number }).categoryId;
          let categoryId: number;
          let confidence: number;

          if (manualCategoryId) {
            categoryId = manualCategoryId;
            confidence = 100;
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

      // The stored receipt points at the file, so leaving the screen must not
      // take it away.
      wasSaved.current = true;

      showSuccessToast(t('common.success'), t('scan.receiptSaved'));
      showSavedReceipt(receipt.id);
    } catch (error) {
      logger.error('Save error:', error);
      showErrorToast(t('common.error'), t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (!parsedData) return;
    updateParsedData({
      ...parsedData,
      items: parsedData.items.filter((_, i) => i !== index),
    });
    markEdited();
  };

  const openStoreEdit = () => {
    setEditStoreName(parsedData?.storeName || '');
    setShowStoreModal(true);
  };

  const saveStoreEdit = () => {
    if (!parsedData) return;
    updateParsedData({ ...parsedData, storeName: editStoreName.trim() || null });
    markEdited();
    setShowStoreModal(false);
  };

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

    updateParsedData({
      ...parsedData,
      date: newDate,
      time: editTime || null,
    });
    markEdited();
    setShowDateModal(false);
  };

  const openTotalEdit = () => {
    setEditTotal(formatAmountInput(parsedData?.total || 0, 2));
    setShowTotalModal(true);
  };

  const saveTotalEdit = () => {
    if (!parsedData) return;
    const newTotal = parseAmountInput(editTotal) ?? 0;
    updateParsedData({
      ...parsedData,
      total: newTotal,
    });
    markEdited();
    setShowTotalModal(false);
  };

  const setTotalToItemsSum = () => {
    if (!parsedData) return;
    updateParsedData({
      ...parsedData,
      total: itemsSum,
    });
    markEdited();
  };

  const openItemEdit = (index: number | null) => {
    if (index !== null && parsedData) {
      const item = parsedData.items[index];
      setEditingItemIndex(index);
      setEditItemName(item.name);
      setEditItemPrice(formatAmountInput(item.totalPrice, 2));
      setEditItemQuantity(formatAmountInput(item.quantity));
      setEditItemCategoryId((item as ParsedItem & { categoryId?: number }).categoryId || null);
    } else {
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

    const price = parseAmountInput(editItemPrice) ?? 0;
    const quantity = parseAmountInput(editItemQuantity) || 1;
    const unitPrice = price / quantity;

    const newItem: ParsedItem & { categoryId?: number } = {
      name: editItemName.trim(),
      quantity,
      unitPrice,
      totalPrice: price,
      unit: null,
      confidence: 100,
      categoryId: editItemCategoryId || undefined,
    };

    if (editingItemIndex !== null) {
      updateParsedData({
        ...parsedData,
        items: parsedData.items.map((item, i) => (i === editingItemIndex ? newItem : item)),
      });
      markEdited();
    } else {
      updateParsedData({
        ...parsedData,
        items: [...parsedData.items, newItem],
      });
      markEdited();
    }

    setShowItemModal(false);
  };

  const openCategorySelect = () => {
    setShowCategoryModal(true);
  };

  const handleConfigureZones = async () => {
    let storeId = currentStoreId;

    if (!storeId && parsedData?.storeName) {
      storeId = await findOrCreateStore(parsedData.storeName);
      setCurrentStoreId(storeId);
    }

    if (!storeId) return;

    router.push({
      pathname: '/scan/zones',
      params: {
        uri,
        storeId: storeId.toString(),
        imageDimensions: JSON.stringify(dimensions),
      },
    });
  };

  const handleEditZones = () => {
    setShowReading(false);

    setTimeout(() => {
      router.push({
        pathname: '/scan/zones',
        params: {
          uri,
          mode: 'preview',
          imageDimensions: JSON.stringify(dimensions),
          ...(appliedZones.length > 0 && { existingZones: JSON.stringify(appliedZones) }),
        },
      });
    }, 150);
  };

  const handleDeleteTemplate = async () => {
    if (!currentStoreId) return;

    try {
      await deleteTemplate(currentStoreId);
      setHasExistingTemplate(false);
      setTemplateApplied(false);

      // Back to the reading the receipt had before the template: its own
      // detected zones, which is also what the reading view goes back to
      // showing.
      const detectedZones = useScanDraftStore.getState().draft?.zones ?? NO_ZONES;
      const reread = readReceipt(detectedZones);
      if (reread) {
        setAppliedZones(detectedZones);
        updateParsedData(reread);
        markEdited();
      }

      showSuccessToast(t('common.success'), t('scan.templateDeleted'));
    } catch (error) {
      logger.error('Error deleting template:', error);
      showErrorToast(t('common.error'), t('errors.deleteFailed'));
    }
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
    if (confidence >= 70) return colors.action;
    if (confidence >= 50) return colors.warning;
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

  // Row identity and callbacks are memoised by React Compiler (enabled in
  // app.json), so the memo() on ScanItemRow actually bites: editing one item
  // no longer re-renders every row on the receipt.
  const renderItemRow = (item: ParsedItem & { categoryId?: number }, index: number) => (
    <ScanItemRow
      key={index}
      index={index}
      name={item.name}
      quantity={item.quantity}
      unit={item.unit}
      unitPriceLabel={item.unitPrice != null ? formatPrice(item.unitPrice) : null}
      totalPriceLabel={formatPrice(item.totalPrice)}
      categoryName={getCategoryName(item.categoryId)}
      colors={colors}
      onEdit={openItemEdit}
      onRemove={handleRemoveItem}
    />
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={handleBack}
          className="flex-row items-center"
          hitSlop={ICON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text className="text-lg" style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
          {t('scan.reviewTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {hasOcrResult && parsedData ? (
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

            {/* Template Applied Indicator (PDF only) */}
            {templateApplied && isPdf && (
              <Card variant="outlined" padding="md" className="mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="rounded-full p-2 mr-3"
                      style={{ backgroundColor: colors.primary + '20' }}
                    >
                      <Ionicons name="checkmark-circle" size={20} color={colors.action} />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm"
                        style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                      >
                        {t('scan.templateApplied')}
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                      >
                        {t('scan.zoneCount', { count: appliedZones.length })}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setShowReading(true)}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.surface }}
                      hitSlop={ICON_HIT_SLOP}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={handleConfigureZones}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.surface }}
                      hitSlop={ICON_HIT_SLOP}
                    >
                      <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={handleDeleteTemplate}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.error + '15' }}
                      hitSlop={ICON_HIT_SLOP}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            )}

            {/* Existing Template (not yet applied) - Show edit/delete options (PDF only) */}
            {hasExistingTemplate && !templateApplied && isPdf && (
              <Card variant="outlined" padding="md" className="mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="rounded-full p-2 mr-3"
                      style={{ backgroundColor: colors.accent + '30' }}
                    >
                      <Ionicons name="grid-outline" size={20} color={colors.warning} />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm"
                        style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                      >
                        {t('scan.hasTemplate')}
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                      >
                        {t('scan.hasTemplateDesc')}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={handleConfigureZones}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.surface }}
                      hitSlop={ICON_HIT_SLOP}
                    >
                      <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={handleDeleteTemplate}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.error + '15' }}
                      hitSlop={ICON_HIT_SLOP}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            )}

            {/* Zone Configuration Prompt - No template exists (PDF only) */}
            {showZonePrompt && !hasExistingTemplate && !templateApplied && isPdf && (
              <Card variant="outlined" padding="md" className="mb-4">
                <View className="flex-row items-center mb-2">
                  <View
                    className="rounded-full p-2 mr-3"
                    style={{ backgroundColor: colors.accent + '30' }}
                  >
                    <Ionicons name="grid-outline" size={20} color={colors.warning} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm"
                      style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                    >
                      {t('scan.configureZones')}
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                    >
                      {t('scan.configureZonesDesc')}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2 mt-2">
                  <Pressable
                    onPress={() => setShowZonePrompt(false)}
                    className="flex-1 py-2 rounded-lg items-center"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <Text
                      className="text-sm"
                      style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
                    >
                      {t('common.skip')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfigureZones}
                    className="flex-1 py-2 rounded-lg items-center"
                    style={{ backgroundColor: colors.primaryDeep }}
                  >
                    <Text
                      className="text-sm text-white"
                      style={{ fontFamily: 'Inter_600SemiBold' }}
                    >
                      {t('scan.defineZones')}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            )}

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
              <Pressable onPress={openDateEdit} className="flex-row items-center justify-between">
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

            {/* What the scanner read, and where it read it */}
            <Card variant="outlined" padding="md" className="mb-4">
              <Pressable
                onPress={() => setShowReading(true)}
                className="flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel={t('scan.readingTitle')}
                accessibilityHint={t('scan.readingHint')}
              >
                <View
                  className="rounded-full p-2 mr-3"
                  style={{ backgroundColor: colors.primary + '20' }}
                >
                  <Ionicons name="scan-outline" size={20} color={colors.action} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm"
                    style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                  >
                    {t('scan.readingTitle')}
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {appliedZones.length > 0
                      ? t('scan.zoneCount', { count: appliedZones.length })
                      : t('scan.noZonesDetected')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            </Card>

            <RefinementBanner
              status={refinement.status}
              onUndo={refinement.undoApplied}
              onCompare={() => setShowDiffModal(true)}
              onDismiss={refinement.dismissProposal}
            />

            {duplicateReceipt && (
              <DuplicateBanner
                dateLabel={new Date(duplicateReceipt.dateTime).toLocaleDateString()}
                totalLabel={formatPrice(duplicateReceipt.totalAmount / 100)}
                onView={() => router.push(`/receipt/${duplicateReceipt.id}`)}
              />
            )}

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
                  label={t('scan.itemCount', { count: parsedData.items.length })}
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
                <Ionicons name="add-circle-outline" size={20} color={colors.action} />
                <Text
                  className="text-sm ml-2"
                  style={{ color: colors.action, fontFamily: 'Inter_500Medium' }}
                >
                  {t('scan.addItem')}
                </Text>
              </Pressable>
            </Card>

            {/* Totals */}
            <Card variant="filled" padding="md" className="mb-4">
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
                    style={{ color: colors.action, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('receipt.discount')}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: colors.action, fontFamily: 'Inter_500Medium' }}
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
                      fontFamily: 'Inter_600SemiBold',
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
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.action} />
                    <Text
                      className="text-sm ml-2"
                      style={{ color: colors.action, fontFamily: 'Inter_500Medium' }}
                    >
                      {t('scan.matchToItemsSum')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Card>
          </>
        ) : (
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
      <View className="px-4 pb-4" style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}>
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

      <StoreEditModal
        visible={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        onSave={saveStoreEdit}
        value={editStoreName}
        onChangeText={setEditStoreName}
        colors={colors}
      />

      <DateEditModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSave={saveDateEdit}
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

      <ItemEditModal
        visible={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSave={saveItemEdit}
        isEditing={editingItemIndex !== null}
        name={editItemName}
        price={editItemPrice}
        quantity={editItemQuantity}
        categoryLabel={editItemCategoryId ? getCategoryName(editItemCategoryId) : null}
        onChangeName={setEditItemName}
        onChangePrice={setEditItemPrice}
        onChangeQuantity={setEditItemQuantity}
        onSelectCategory={openCategorySelect}
        colors={colors}
      />

      <CategoryPickerModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelect={selectCategory}
        categories={categoriesList}
        selectedCategoryId={editItemCategoryId}
        colors={colors}
      />

      <TotalEditModal
        visible={showTotalModal}
        onClose={() => setShowTotalModal(false)}
        onSave={saveTotalEdit}
        value={editTotal}
        onChangeText={setEditTotal}
        itemsSumLabel={formatPrice(itemsSum)}
        colors={colors}
      />

      <ReadingModal
        visible={showReading}
        onClose={() => setShowReading(false)}
        zones={appliedZones}
        imageUri={uri}
        isPdf={isPdf}
        dimensions={dimensions}
        lines={lines}
        onEditZones={isPdf ? null : handleEditZones}
        colors={colors}
      />

      <ConfirmationModal
        visible={zonesAwaitingConfirmation !== null}
        title={t('scan.rereadTitle')}
        message={t('scan.rereadMessage')}
        confirmText={t('scan.rereadConfirm')}
        cancelText={t('common.cancel')}
        isDestructive
        onConfirm={() => {
          if (zonesAwaitingConfirmation) applyZones(zonesAwaitingConfirmation);
          setZonesAwaitingConfirmation(null);
        }}
        onCancel={keepManualEdits}
      />

      <ProposalDiffModal
        visible={showDiffModal}
        current={parsedData}
        proposed={refinement.proposal}
        onAccept={() => {
          refinement.acceptProposal();
          setShowDiffModal(false);
        }}
        onDismiss={() => {
          refinement.dismissProposal();
          setShowDiffModal(false);
        }}
      />
    </View>
  );
}
