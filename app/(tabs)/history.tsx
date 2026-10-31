import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  RefreshControl,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatabaseReady } from '@/src/db/provider';
import {
  getReceiptsWithItemCount,
  getFilteredReceipts,
  getStoresWithReceipts,
  type ReceiptFilters,
} from '@/src/db/queries/receipts';
import { getCategories } from '@/src/db/queries/categories';
import { getPresetDateRange, type HistoryDatePreset } from '@/src/db/queries/dayRange';
import { buildValidatedDateTime, formatMonthYear } from '@/src/utils/dateTime';
import { groupByMonth, type HistoryEntry } from '@/src/utils/groupByMonth';
import { receiptMeta } from '@/src/utils/receiptMeta';
import { useFormatPrice, usePreferencesStore } from '@/src/store/preferences';
import { ReceiptRow } from '@/src/components/receipt/ReceiptRow';
import { ReceiptRowSkeleton } from '@/src/components/receipt/ReceiptRowSkeleton';
import { Button } from '@/src/components/ui/Button';
import { Chip } from '@/src/components/ui/Chip';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ModalHeader } from '@/src/components/ui/ModalHeader';
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
import { useAppColors } from '@/src/hooks/useAppColors';
import { ICON_HIT_SLOP } from '@/src/theme/a11y';
import { fonts } from '@/src/theme/type';
import { READING_MAX } from '@/src/theme/layout';
import { createScopedLogger } from '@/src/utils/debug';
import { mergePages } from '@/src/utils/pagination';
import { categoryLabel } from '@/src/utils/categoryLabel';
import type { Receipt } from '@/src/db/schema/receipts';
import type { Store } from '@/src/db/schema/stores';

const logger = createScopedLogger('History');

const PAGE_SIZE = 50;

type ReceiptWithStore = {
  receipt: Receipt;
  store: Store | null;
  itemCount: number;
};

function DateField({
  value,
  onChange,
  placeholder,
  maxLength,
  colors,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  colors: ReturnType<typeof useAppColors>;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      className="flex-1 px-4 py-3 rounded-xl text-base text-center"
      style={{
        backgroundColor: colors.surface,
        color: colors.text,
        fontFamily: 'Inter_400Regular',
      }}
      keyboardType="number-pad"
      maxLength={maxLength}
    />
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { isReady } = useDatabaseReady();
  const colors = useAppColors();
  const language = usePreferencesStore((state) => state.language);
  const { formatPrice } = useFormatPrice();

  const [receipts, setReceipts] = useState<ReceiptWithStore[]>([]);
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [selectedDatePreset, setSelectedDatePreset] = useState<HistoryDatePreset>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [customStart, setCustomStart] = useState<{ day: string; month: string; year: string }>({
    day: '',
    month: '',
    year: '',
  });
  const [customEnd, setCustomEnd] = useState<{ day: string; month: string; year: string }>({
    day: '',
    month: '',
    year: '',
  });
  const [categoriesList, setCategoriesList] = useState<{ id: number; name: string }[]>([]);
  const [invalidRange, setInvalidRange] = useState(false);

  const offsetRef = useRef(0);
  const requestIdRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasActiveFilters =
    selectedStoreId !== null || selectedDatePreset !== 'all' || selectedCategoryId !== null;

  const loadStores = useCallback(async () => {
    if (!isReady) return;
    try {
      const data = await getStoresWithReceipts();
      setStores(data);
    } catch (error) {
      logger.error('Failed to load stores:', error);
    }
  }, [isReady]);

  const loadCategories = useCallback(async () => {
    if (!isReady) return;
    try {
      const data = await getCategories();
      setCategoriesList(data.map((category) => ({ id: category.id, name: category.name })));
    } catch (error) {
      logger.error('Failed to load categories:', error);
    }
  }, [isReady]);

  const buildCustomRange = useCallback((): { start: Date | null; end: Date | null } => {
    const start = buildValidatedDateTime(
      parseInt(customStart.day, 10) || 0,
      parseInt(customStart.month, 10) || 0,
      parseInt(customStart.year, 10) || 0,
      null
    );
    const end = buildValidatedDateTime(
      parseInt(customEnd.day, 10) || 0,
      parseInt(customEnd.month, 10) || 0,
      parseInt(customEnd.year, 10) || 0,
      null
    );
    if (!start || !end) return { start: null, end: null };
    end.setHours(23, 59, 59, 999);
    if (end.getTime() < start.getTime()) {
      setInvalidRange(true);
      return { start: null, end: null };
    }
    setInvalidRange(false);
    return { start, end };
  }, [customStart, customEnd]);

  const loadReceipts = useCallback(
    async (reset = true) => {
      if (!isReady) return;

      const requestId = reset ? ++requestIdRef.current : requestIdRef.current;

      try {
        const dateRange =
          selectedDatePreset === 'custom'
            ? buildCustomRange()
            : getPresetDateRange(selectedDatePreset);
        const filters: ReceiptFilters = {
          storeId: selectedStoreId,
          startDate: dateRange.start,
          endDate: dateRange.end,
          searchTerm: searchQuery || null,
          categoryId: selectedCategoryId,
        };

        const hasFilters =
          filters.storeId ||
          filters.startDate ||
          filters.endDate ||
          filters.searchTerm ||
          filters.categoryId;

        const pageOffset = reset ? 0 : offsetRef.current;
        const data = hasFilters
          ? await getFilteredReceipts(filters, PAGE_SIZE, pageOffset)
          : await getReceiptsWithItemCount(PAGE_SIZE, pageOffset);

        if (requestId !== requestIdRef.current) return;

        setReceipts((prev) => mergePages(prev, data, reset, (r) => r.receipt.id));
        offsetRef.current = pageOffset + data.length;
        setHasMore(data.length === PAGE_SIZE);
      } catch (error) {
        logger.error('Failed to load receipts:', error);
      } finally {
        setIsLoading(false);
        setIsSearching(false);
        setIsLoadingMore(false);
      }
    },
    [
      isReady,
      selectedStoreId,
      selectedDatePreset,
      searchQuery,
      selectedCategoryId,
      buildCustomRange,
    ]
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isReady) {
        loadReceipts();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isReady, loadReceipts]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadReceipts(), loadStores(), loadCategories()]);
    setIsRefreshing(false);
  }, [loadReceipts, loadStores, loadCategories]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || !isReady || isSearching) return;
    setIsLoadingMore(true);
    loadReceipts(false);
  }, [isLoading, isLoadingMore, hasMore, isReady, isSearching, loadReceipts]);

  const handleReceiptPress = useCallback(
    (receiptId: number) => {
      router.push(`/receipt/${receiptId}`);
    },
    [router]
  );

  const handleClearFilters = useCallback(() => {
    setSelectedStoreId(null);
    setSelectedDatePreset('all');
    setSearchQuery('');
    setSelectedCategoryId(null);
    setCustomStart({ day: '', month: '', year: '' });
    setCustomEnd({ day: '', month: '', year: '' });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isReady) {
        loadReceipts();
        loadStores();
        loadCategories();
      }
    }, [isReady, loadReceipts, loadStores, loadCategories])
  );

  const selectedStoreName = useMemo(() => {
    if (!selectedStoreId) return t('history.allStores');
    const store = stores.find((s) => s.id === selectedStoreId);
    return store?.name || t('history.allStores');
  }, [selectedStoreId, stores, t]);

  const datePresetLabel = useMemo(() => {
    switch (selectedDatePreset) {
      case 'thisWeek':
        return t('history.thisWeek');
      case 'thisMonth':
        return t('history.thisMonth');
      case 'last3Months':
        return t('history.last3Months');
      case 'thisYear':
        return t('history.thisYear');
      case 'custom':
        return t('history.customRange');
      default:
        return t('history.allDates');
    }
  }, [selectedDatePreset, t]);

  const renderEmptyState = () => (
    <EmptyState
      icon="receipt-outline"
      title={hasActiveFilters || searchQuery ? t('history.noResults') : t('history.noReceipts')}
      description={
        searchQuery
          ? t('history.noResultsFor', { query: searchQuery })
          : hasActiveFilters
            ? t('history.filtersHideEverything')
            : t('history.noReceiptsDesc')
      }
      actionLabel={hasActiveFilters || searchQuery ? t('history.clearFilters') : undefined}
      onAction={hasActiveFilters || searchQuery ? handleClearFilters : undefined}
    />
  );

  const renderListFooter = () => {
    if (receipts.length === 0) return null;
    if (isLoadingMore) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color={colors.action} />
        </View>
      );
    }
    if (!hasMore) {
      return (
        <Text
          className="text-center text-sm py-4"
          style={{ color: colors.textTertiary, fontFamily: 'Inter_400Regular' }}
        >
          {t('history.allReceiptsLoaded')}
        </Text>
      );
    }
    return null;
  };

  const entries = useMemo(
    () =>
      groupByMonth(
        receipts,
        (row) => (row.receipt.dateTime ? new Date(row.receipt.dateTime) : null),
        (row) => String(row.receipt.id)
      ),
    [receipts]
  );

  // useCallback keeps a stable component identity for FlashList's recycling.
  const renderEntry = useCallback(
    ({ item }: { item: HistoryEntry<ReceiptWithStore> }) => {
      if (item.type === 'header') {
        return (
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: fonts.semibold,
              fontSize: 15,
              color: colors.textSecondary,
              paddingTop: 24,
              paddingBottom: 4,
            }}
          >
            {item.date ? formatMonthYear(item.date, language) : t('scan.noDateFound')}
          </Text>
        );
      }
      const { receipt, store, itemCount } = item.item;
      return (
        <ReceiptRow
          storeName={store?.name || t('scan.unknownStore')}
          meta={receiptMeta(receipt.dateTime, itemCount, language, t)}
          amount={formatPrice(receipt.totalAmount ? receipt.totalAmount / 100 : null)}
          onPress={() => handleReceiptPress(receipt.id)}
          accessibilityHint={t('history.openReceipt')}
        />
      );
    },
    [colors.textSecondary, formatPrice, handleReceiptPress, language, t]
  );

  const activeFilterCount =
    (selectedStoreId ? 1 : 0) +
    (selectedDatePreset !== 'all' ? 1 : 0) +
    (selectedCategoryId ? 1 : 0);

  if (!isReady || isLoading) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark"
        style={{ paddingTop: insets.top }}
      >
        <ReadingColumn>
          <ScreenHeader title={t('history.title')} />
        </ReadingColumn>
        <ReadingColumn className="px-5 py-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <ReceiptRowSkeleton key={index} />
          ))}
        </ReadingColumn>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <ReadingColumn>
        <ScreenHeader title={t('history.title')} />
      </ReadingColumn>

      {/* Search bar */}
      <ReadingColumn>
        <View className="px-5 py-3">
          <View
            className="flex-row items-center bg-surface dark:bg-surface-dark px-4 py-3 border border-border dark:border-border-dark"
            style={{ borderRadius: 10 }}
          >
            <Ionicons name="search-outline" size={20} color={colors.textTertiary} />
            <TextInput
              className="flex-1 ml-3 text-text dark:text-text-dark text-base"
              style={{ fontFamily: 'Inter_400Regular' }}
              placeholder={t('common.search')}
              accessibilityLabel={t('common.search')}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => handleSearch('')}
                hitSlop={ICON_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={t('history.clearSearch')}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.textTertiary} />
              </Pressable>
            )}
            {isSearching && (
              <ActivityIndicator size="small" color={colors.action} className="ml-2" />
            )}
          </View>
        </View>
      </ReadingColumn>

      <ReadingColumn className="px-5 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            <Chip
              icon="options-outline"
              label={
                hasActiveFilters
                  ? `${t('history.filters')} · ${activeFilterCount}`
                  : t('history.filters')
              }
              accessibilityLabel={t('history.filters')}
              selected={hasActiveFilters}
              onPress={() => setShowFilters(true)}
            />
            <Chip
              icon="calendar-outline"
              label={datePresetLabel}
              accessibilityLabel={`${t('history.dateRange')}: ${datePresetLabel}`}
              selected={selectedDatePreset !== 'all'}
              onPress={() => setShowFilters(true)}
            />
            <Chip
              icon="storefront-outline"
              label={selectedStoreName}
              accessibilityLabel={`${t('history.store')}: ${selectedStoreName}`}
              selected={selectedStoreId !== null}
              onPress={() => setShowFilters(true)}
            />
            {hasActiveFilters && (
              <Chip icon="close" label={t('history.clearFilters')} onPress={handleClearFilters} />
            )}
          </View>
        </ScrollView>
      </ReadingColumn>

      {/* Receipt list */}
      <FlashList
        data={entries}
        keyExtractor={(entry) => entry.key}
        getItemType={(entry) => entry.type}
        renderItem={renderEntry}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
          width: '100%',
          maxWidth: READING_MAX,
          alignSelf: 'center',
        }}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.action}
            colors={[colors.action]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 bg-background dark:bg-background-dark">
          <ModalHeader
            title={t('history.filters')}
            onClose={() => setShowFilters(false)}
            closeLabel={t('common.cancel')}
            confirmLabel={t('common.done')}
            onConfirm={() => setShowFilters(false)}
            insetTop={insets.top}
          />

          <ScrollView className="flex-1 px-5 py-4">
            {/* Date Range Section */}
            <Text
              className="text-base text-text dark:text-text-dark mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('history.dateRange')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {(
                [
                  'all',
                  'thisWeek',
                  'thisMonth',
                  'last3Months',
                  'thisYear',
                  'custom',
                ] as HistoryDatePreset[]
              ).map((preset) => (
                <Chip
                  key={preset}
                  label={preset === 'all' ? t('history.allDates') : t(`history.${preset}`)}
                  selected={selectedDatePreset === preset}
                  onPress={() => setSelectedDatePreset(preset)}
                />
              ))}
            </View>

            {selectedDatePreset === 'custom' && (
              <View className="mb-6">
                <Text
                  className="text-sm mb-2"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
                >
                  {t('history.startDate')}
                </Text>
                <View className="flex-row gap-2 mb-4">
                  <DateField
                    value={customStart.day}
                    onChange={(value) => setCustomStart((prev) => ({ ...prev, day: value }))}
                    placeholder={t('scan.dayPlaceholder')}
                    maxLength={2}
                    colors={colors}
                  />
                  <DateField
                    value={customStart.month}
                    onChange={(value) => setCustomStart((prev) => ({ ...prev, month: value }))}
                    placeholder={t('scan.monthPlaceholder')}
                    maxLength={2}
                    colors={colors}
                  />
                  <DateField
                    value={customStart.year}
                    onChange={(value) => setCustomStart((prev) => ({ ...prev, year: value }))}
                    placeholder={t('scan.yearPlaceholder')}
                    maxLength={4}
                    colors={colors}
                  />
                </View>
                <Text
                  className="text-sm mb-2"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
                >
                  {t('history.endDate')}
                </Text>
                <View className="flex-row gap-2 mb-4">
                  <DateField
                    value={customEnd.day}
                    onChange={(value) => setCustomEnd((prev) => ({ ...prev, day: value }))}
                    placeholder={t('scan.dayPlaceholder')}
                    maxLength={2}
                    colors={colors}
                  />
                  <DateField
                    value={customEnd.month}
                    onChange={(value) => setCustomEnd((prev) => ({ ...prev, month: value }))}
                    placeholder={t('scan.monthPlaceholder')}
                    maxLength={2}
                    colors={colors}
                  />
                  <DateField
                    value={customEnd.year}
                    onChange={(value) => setCustomEnd((prev) => ({ ...prev, year: value }))}
                    placeholder={t('scan.yearPlaceholder')}
                    maxLength={4}
                    colors={colors}
                  />
                </View>
                {invalidRange && (
                  <Text
                    className="text-sm text-error dark:text-error-light mb-4"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    {t('history.invalidRange')}
                  </Text>
                )}
              </View>
            )}

            {/* Store Section */}
            <Text
              className="text-base text-text dark:text-text-dark mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('history.store')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              <Chip
                label={t('history.allStores')}
                selected={selectedStoreId === null}
                onPress={() => setSelectedStoreId(null)}
              />
              {stores.map((store) => (
                <Chip
                  key={store.id}
                  label={store.name}
                  selected={selectedStoreId === store.id}
                  onPress={() => setSelectedStoreId(store.id)}
                />
              ))}
            </View>

            {/* Category Section */}
            <Text
              className="text-base text-text dark:text-text-dark mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('history.category')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              <Chip
                label={t('history.allCategories')}
                selected={selectedCategoryId === null}
                onPress={() => setSelectedCategoryId(null)}
              />
              {categoriesList.map((cat) => (
                <Chip
                  key={cat.id}
                  label={categoryLabel(cat.name, t)}
                  selected={selectedCategoryId === cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                />
              ))}
            </View>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button variant="secondary" className="mt-4" onPress={handleClearFilters}>
                {t('history.clearFilters')}
              </Button>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
