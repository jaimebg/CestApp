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
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import { buildValidatedDateTime } from '@/src/utils/dateTime';
import { ReceiptCard } from '@/src/components/receipt/ReceiptCard';
import { ReceiptListSkeleton } from '@/src/components/receipt/ReceiptCardSkeleton';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ModalHeader } from '@/src/components/ui/ModalHeader';
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
import { useAppColors } from '@/src/hooks/useAppColors';
import { useEntering, staggerDelay } from '@/src/hooks/useEntering';
import { ICON_HIT_SLOP, MIN_TARGET } from '@/src/theme/a11y';
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
  const entering = useEntering();

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

  // Defined with useCallback so FlashList keeps a stable component identity,
  // and the stagger is capped: index-based delays on a recycled list mean a
  // row 40 deep waits two seconds, and re-waits every time it scrolls back.
  const renderReceiptItem = useCallback(
    ({ item, index }: { item: ReceiptWithStore; index: number }) => (
      <Animated.View entering={entering(FadeInDown, staggerDelay(index), 300)}>
        <ReceiptCard
          receipt={item.receipt}
          store={item.store}
          itemCount={item.itemCount}
          onPress={() => handleReceiptPress(item.receipt.id)}
        />
      </Animated.View>
    ),
    [entering, handleReceiptPress]
  );

  if (!isReady || isLoading) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark"
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <ReadingColumn>
          <View className="px-6 pt-4 pb-2">
            <Text
              className="text-3xl text-text dark:text-text-dark"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              {t('history.title')}
            </Text>
            <Text
              className="text-base text-text-secondary dark:text-text-dark-secondary mt-1"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('history.subtitle')}
            </Text>
          </View>
        </ReadingColumn>
        <View className="py-6">
          <ReceiptListSkeleton count={5} />
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <ReadingColumn>
        <View className="px-6 pt-4 pb-2">
          <Text
            className="text-3xl text-text dark:text-text-dark"
            style={{ fontFamily: 'Inter_700Bold' }}
          >
            {t('history.title')}
          </Text>
          <Text
            className="text-base text-text-secondary dark:text-text-dark-secondary mt-1"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('history.subtitle')}
          </Text>
        </View>
      </ReadingColumn>

      {/* Search bar */}
      <ReadingColumn>
        <View className="px-6 py-3">
          <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-xl px-4 py-3 border border-border dark:border-border-dark">
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
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </Pressable>
            )}
            {isSearching && (
              <ActivityIndicator size="small" color={colors.action} className="ml-2" />
            )}
          </View>
        </View>
      </ReadingColumn>

      {/* Filter chips */}
      <View className="px-6 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ReadingColumn className="flex-row gap-2">
            {/* Filter button */}
            <Pressable
              onPress={() => setShowFilters(true)}
              accessibilityRole="button"
              accessibilityLabel={t('history.filters')}
              accessibilityState={{ selected: hasActiveFilters }}
              style={{ minHeight: MIN_TARGET }}
              className={`flex-row items-center px-3 py-2 rounded-full border ${
                hasActiveFilters
                  ? 'bg-primary/20 border-primary'
                  : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
              }`}
            >
              <Ionicons
                name="options-outline"
                size={16}
                color={hasActiveFilters ? colors.action : colors.textTertiary}
              />
              <Text
                className={`ml-2 text-sm ${
                  hasActiveFilters
                    ? 'text-action dark:text-action-dark'
                    : 'text-text-secondary dark:text-text-dark-secondary'
                }`}
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {t('history.filters')}
              </Text>
              {hasActiveFilters && (
                <View className="ml-1 w-5 h-5 rounded-full bg-primary-deep items-center justify-center">
                  <Text className="text-white text-xs" style={{ fontFamily: 'Inter_700Bold' }}>
                    {(selectedStoreId ? 1 : 0) +
                      (selectedDatePreset !== 'all' ? 1 : 0) +
                      (selectedCategoryId ? 1 : 0)}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Date filter chip */}
            <Pressable
              onPress={() => setShowFilters(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('history.dateRange')}: ${datePresetLabel}`}
              accessibilityState={{ selected: selectedDatePreset !== 'all' }}
              style={{ minHeight: MIN_TARGET }}
              className={`flex-row items-center px-3 py-2 rounded-full border ${
                selectedDatePreset !== 'all'
                  ? 'bg-primary/20 border-primary'
                  : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
              }`}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={selectedDatePreset !== 'all' ? colors.action : colors.textTertiary}
              />
              <Text
                className={`ml-2 text-sm ${
                  selectedDatePreset !== 'all'
                    ? 'text-action dark:text-action-dark'
                    : 'text-text-secondary dark:text-text-dark-secondary'
                }`}
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {datePresetLabel}
              </Text>
            </Pressable>

            {/* Store filter chip */}
            <Pressable
              onPress={() => setShowFilters(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('history.store')}: ${selectedStoreName}`}
              accessibilityState={{ selected: selectedStoreId !== null }}
              style={{ minHeight: MIN_TARGET }}
              className={`flex-row items-center px-3 py-2 rounded-full border ${
                selectedStoreId
                  ? 'bg-primary/20 border-primary'
                  : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
              }`}
            >
              <Ionicons
                name="storefront-outline"
                size={16}
                color={selectedStoreId ? colors.action : colors.textTertiary}
              />
              <Text
                className={`ml-2 text-sm ${
                  selectedStoreId
                    ? 'text-action dark:text-action-dark'
                    : 'text-text-secondary dark:text-text-dark-secondary'
                }`}
                numberOfLines={1}
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {selectedStoreName}
              </Text>
            </Pressable>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Pressable
                onPress={handleClearFilters}
                accessibilityRole="button"
                accessibilityLabel={t('history.clearFilters')}
                style={{ minHeight: MIN_TARGET }}
                className="flex-row items-center px-3 py-2 rounded-full bg-error/10 border border-error/30"
              >
                <Ionicons name="close" size={16} color={colors.error} />
                <Text
                  className="ml-1 text-sm text-error dark:text-error-light"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {t('history.clearFilters')}
                </Text>
              </Pressable>
            )}
          </ReadingColumn>
        </ScrollView>
      </View>

      {/* Receipt list */}
      <FlashList
        data={receipts}
        keyExtractor={(item) => item.receipt.id.toString()}
        renderItem={renderReceiptItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
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

          <ScrollView className="flex-1 px-6 py-4">
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
                <Pressable
                  key={preset}
                  onPress={() => setSelectedDatePreset(preset)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedDatePreset === preset }}
                  style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
                  className={`px-4 py-2 rounded-full border ${
                    selectedDatePreset === preset
                      ? 'bg-primary-deep border-primary-deep'
                      : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                  }`}
                >
                  <Text
                    className={
                      selectedDatePreset === preset
                        ? 'text-white'
                        : 'text-text-secondary dark:text-text-dark-secondary'
                    }
                    style={
                      selectedDatePreset === preset
                        ? { fontFamily: 'Inter_500Medium' }
                        : { fontFamily: 'Inter_400Regular' }
                    }
                  >
                    {preset === 'all' ? t('history.allDates') : t(`history.${preset}`)}
                  </Text>
                </Pressable>
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
              <Pressable
                onPress={() => setSelectedStoreId(null)}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedStoreId === null }}
                style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
                className={`px-4 py-2 rounded-full border ${
                  selectedStoreId === null
                    ? 'bg-primary-deep border-primary-deep'
                    : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                }`}
              >
                <Text
                  className={
                    selectedStoreId === null
                      ? 'text-white'
                      : 'text-text-secondary dark:text-text-dark-secondary'
                  }
                  style={{
                    fontFamily: selectedStoreId === null ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }}
                >
                  {t('history.allStores')}
                </Text>
              </Pressable>
              {stores.map((store) => (
                <Pressable
                  key={store.id}
                  onPress={() => setSelectedStoreId(store.id)}
                  accessibilityRole="button"
                  accessibilityLabel={store.name}
                  accessibilityState={{ selected: selectedStoreId === store.id }}
                  style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
                  className={`px-4 py-2 rounded-full border ${
                    selectedStoreId === store.id
                      ? 'bg-primary-deep border-primary-deep'
                      : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                  }`}
                >
                  <Text
                    className={
                      selectedStoreId === store.id
                        ? 'text-white'
                        : 'text-text-secondary dark:text-text-dark-secondary'
                    }
                    style={{
                      fontFamily:
                        selectedStoreId === store.id ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    }}
                  >
                    {store.name}
                  </Text>
                </Pressable>
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
              <Pressable
                onPress={() => setSelectedCategoryId(null)}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategoryId === null }}
                style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
                className={`px-4 py-2 rounded-full border ${
                  selectedCategoryId === null
                    ? 'bg-primary-deep border-primary-deep'
                    : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                }`}
              >
                <Text
                  className={
                    selectedCategoryId === null
                      ? 'text-white'
                      : 'text-text-secondary dark:text-text-dark-secondary'
                  }
                  style={
                    selectedCategoryId === null
                      ? { fontFamily: 'Inter_500Medium' }
                      : { fontFamily: 'Inter_400Regular' }
                  }
                >
                  {t('history.allCategories')}
                </Text>
              </Pressable>
              {categoriesList.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  accessibilityRole="button"
                  accessibilityLabel={categoryLabel(cat.name, t)}
                  accessibilityState={{ selected: selectedCategoryId === cat.id }}
                  style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
                  className={`px-4 py-2 rounded-full border ${
                    selectedCategoryId === cat.id
                      ? 'bg-primary-deep border-primary-deep'
                      : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                  }`}
                >
                  <Text
                    className={
                      selectedCategoryId === cat.id
                        ? 'text-white'
                        : 'text-text-secondary dark:text-text-dark-secondary'
                    }
                    style={
                      selectedCategoryId === cat.id
                        ? { fontFamily: 'Inter_500Medium' }
                        : { fontFamily: 'Inter_400Regular' }
                    }
                  >
                    {categoryLabel(cat.name, t)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Pressable
                onPress={handleClearFilters}
                accessibilityRole="button"
                accessibilityLabel={t('history.clearFilters')}
                style={{ minHeight: MIN_TARGET }}
                className="bg-error/10 border border-error/30 rounded-xl py-3 items-center justify-center mt-4"
              >
                <Text
                  className="text-error dark:text-error-light"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {t('history.clearFilters')}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
