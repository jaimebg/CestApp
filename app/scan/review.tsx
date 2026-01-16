import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Badge } from '@/src/components/ui';
import { parseReceipt, ParsedReceipt, ParsedItem, ParserOptions } from '@/src/services/ocr/parser';
import { useFormatPrice, usePreferencesStore } from '@/src/store/preferences';
import { getSupportedCurrencies } from '@/src/config/currency';

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
  const parserOptions: ParserOptions = useMemo(() => ({
    preferredDateFormat: dateFormat,
    preferredDecimalSeparator: decimalSeparator,
  }), [dateFormat, decimalSeparator]);

  const initialParsedData = useMemo(() => {
    if (lines.length > 0) {
      return parseReceipt(lines, parserOptions);
    }
    return null;
  }, [lines, parserOptions]);

  // Currency
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const currencies = useMemo(() => getSupportedCurrencies(), []);

  // Editable state
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(initialParsedData);
  const [showRawText, setShowRawText] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      // TODO: Phase 7 - Save to database
      // For now, just show success and navigate back
      Alert.alert(
        t('common.success'),
        'Receipt data ready. Database save coming in Phase 7.',
        [{ text: t('common.ok'), onPress: handleDone }]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.saveFailed'));
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

  const handleUpdateItem = (index: number, updates: Partial<ParsedItem>) => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      items: parsedData.items.map((item, i) =>
        i === index ? { ...item, ...updates } : item
      ),
    });
  };

  const handleUpdateStore = (name: string) => {
    if (!parsedData) return;
    setParsedData({ ...parsedData, storeName: name });
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
      case 'cash': return t('receipt.cash');
      case 'card': return t('receipt.card');
      case 'digital': return t('receipt.digital');
      default: return t('scan.unknownPayment');
    }
  };

  const renderItemRow = (item: ParsedItem, index: number) => (
    <View
      key={index}
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
        {item.quantity !== 1 && (
          <Text
            className="text-xs mt-0.5"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {item.quantity} {item.unit || 'x'} @ {formatPrice(item.unitPrice)}
          </Text>
        )}
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
    </View>
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

              {/* Store */}
              <View className="flex-row items-center justify-between mb-3">
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
              </View>

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

              {/* Date and Time */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text
                    className="text-base ml-2"
                    style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
                  >
                    {formatDate(parsedData.date)}
                  </Text>
                </View>
                {parsedData.time && (
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text
                      className="text-sm ml-1"
                      style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                    >
                      {parsedData.time}
                    </Text>
                  </View>
                )}
              </View>

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
                  {parsedData.items.map((item, index) => renderItemRow(item, index))}
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

              <View
                className="flex-row justify-between pt-2 border-t"
                style={{ borderColor: colors.border }}
              >
                <Text
                  className="text-base"
                  style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                >
                  {t('receipt.total')}
                </Text>
                <Text
                  className="text-base"
                  style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                >
                  {formatPrice(parsedData.total)}
                </Text>
              </View>
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
              <Button
                variant="secondary"
                size="lg"
                onPress={handleDone}
              >
                {t('scan.discardReceipt')}
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="primary"
                size="lg"
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? t('common.loading') : t('scan.saveReceipt')}
              </Button>
            </View>
          </View>
        ) : (
          <Button variant="primary" size="lg" onPress={handleDone}>
            {t('common.done')}
          </Button>
        )}
      </View>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
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
        </View>
      </Modal>
    </View>
  );
}
