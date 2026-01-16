import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatabaseReady } from '../../src/db/provider';
import {
  getReceiptsWithItemCount,
  getFilteredReceipts,
  getStoresWithReceipts,
  type ReceiptFilters,
} from '../../src/db/queries/receipts';
import { ReceiptCard, ReceiptListSkeleton } from '../../src/components/receipt';
import type { Receipt } from '../../src/db/schema/receipts';
import type { Store } from '../../src/db/schema/stores';

type ReceiptWithStore = {
  receipt: Receipt;
  store: Store | null;
  itemCount: number;
};

type DatePreset = 'all' | 'thisWeek' | 'thisMonth' | 'last3Months' | 'thisYear';

function getDateRange(preset: DatePreset): { start: Date | null; end: Date | null } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (preset) {
    case 'thisWeek': {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: today };
    }
    case 'last3Months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start, end: today };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: today };
    }
    default:
      return { start: null, end: null };
  }
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { isReady } = useDatabaseReady();

  const [receipts, setReceipts] = useState<ReceiptWithStore[]>([]);
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>('all');

  const hasActiveFilters = selectedStoreId !== null || selectedDatePreset !== 'all';

  const loadStores = useCallback(async () => {
    if (!isReady) return;
    try {
      const data = await getStoresWithReceipts();
      setStores(data);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  }, [isReady]);

  const loadReceipts = useCallback(async () => {
    if (!isReady) return;

    try {
      const dateRange = getDateRange(selectedDatePreset);
      const filters: ReceiptFilters = {
        storeId: selectedStoreId,
        startDate: dateRange.start,
        endDate: dateRange.end,
        searchTerm: searchQuery || null,
      };

      const hasFilters =
        filters.storeId || filters.startDate || filters.endDate || filters.searchTerm;

      const data = hasFilters
        ? await getFilteredReceipts(filters)
        : await getReceiptsWithItemCount();

      setReceipts(data);
    } catch (error) {
      console.error('Failed to load receipts:', error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [isReady, selectedStoreId, selectedDatePreset, searchQuery]);

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
    await Promise.all([loadReceipts(), loadStores()]);
    setIsRefreshing(false);
  }, [loadReceipts, loadStores]);

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
  }, []);

  useEffect(() => {
    if (isReady) {
      loadReceipts();
      loadStores();
    }
  }, [isReady, loadReceipts, loadStores]);

  useFocusEffect(
    useCallback(() => {
      if (isReady) {
        loadReceipts();
        loadStores();
      }
    }, [isReady, loadReceipts, loadStores])
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
      default:
        return t('history.allDates');
    }
  }, [selectedDatePreset, t]);

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-8">
      <View className="bg-primary/20 dark:bg-primary/30 rounded-full p-6 mb-4">
        <Ionicons name="receipt-outline" size={48} color="#93BD57" />
      </View>
      <Text
        className="text-lg text-text dark:text-text-dark text-center"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {hasActiveFilters || searchQuery ? t('history.noResults') : t('history.noReceipts')}
      </Text>
      <Text
        className="text-base text-text-secondary dark:text-text-dark-secondary text-center mt-2"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        {searchQuery
          ? t('history.noResultsFor', { query: searchQuery })
          : hasActiveFilters
            ? t('history.clearFilters')
            : t('history.noReceiptsDesc')}
      </Text>
      {(hasActiveFilters || searchQuery) && (
        <Pressable onPress={handleClearFilters} className="mt-4 px-4 py-2 bg-primary rounded-lg">
          <Text className="text-white font-medium">{t('history.clearFilters')}</Text>
        </Pressable>
      )}
    </View>
  );

  const renderReceiptItem = ({ item, index }: { item: ReceiptWithStore; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50)
        .duration(300)
        .springify()}
      layout={Layout.springify()}
    >
      <ReceiptCard
        receipt={item.receipt}
        store={item.store}
        itemCount={item.itemCount}
        onPress={() => handleReceiptPress(item.receipt.id)}
      />
    </Animated.View>
  );

  if (!isReady || isLoading) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark"
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
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

      {/* Search bar */}
      <View className="px-6 py-3">
        <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-xl px-4 py-3 border border-border dark:border-border-dark">
          <Ionicons name="search-outline" size={20} color="#8D8680" />
          <TextInput
            className="flex-1 ml-3 text-text dark:text-text-dark text-base"
            style={{ fontFamily: 'Inter_400Regular' }}
            placeholder={t('common.search')}
            placeholderTextColor="#8D8680"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#8D8680" />
            </Pressable>
          )}
          {isSearching && <ActivityIndicator size="small" color="#93BD57" className="ml-2" />}
        </View>
      </View>

      {/* Filter chips */}
      <View className="px-6 pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {/* Filter button */}
          <Pressable
            onPress={() => setShowFilters(true)}
            className={`flex-row items-center px-3 py-2 rounded-full border ${
              hasActiveFilters
                ? 'bg-primary/20 border-primary'
                : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
            }`}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={hasActiveFilters ? '#93BD57' : '#8D8680'}
            />
            <Text
              className={`ml-2 text-sm ${
                hasActiveFilters
                  ? 'text-primary'
                  : 'text-text-secondary dark:text-text-dark-secondary'
              }`}
            >
              {t('history.filters')}
            </Text>
            {hasActiveFilters && (
              <View className="ml-1 w-5 h-5 rounded-full bg-primary items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {(selectedStoreId ? 1 : 0) + (selectedDatePreset !== 'all' ? 1 : 0)}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Date filter chip */}
          <Pressable
            onPress={() => setShowFilters(true)}
            className={`flex-row items-center px-3 py-2 rounded-full border ${
              selectedDatePreset !== 'all'
                ? 'bg-primary/20 border-primary'
                : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
            }`}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={selectedDatePreset !== 'all' ? '#93BD57' : '#8D8680'}
            />
            <Text
              className={`ml-2 text-sm ${
                selectedDatePreset !== 'all'
                  ? 'text-primary'
                  : 'text-text-secondary dark:text-text-dark-secondary'
              }`}
            >
              {datePresetLabel}
            </Text>
          </Pressable>

          {/* Store filter chip */}
          <Pressable
            onPress={() => setShowFilters(true)}
            className={`flex-row items-center px-3 py-2 rounded-full border ${
              selectedStoreId
                ? 'bg-primary/20 border-primary'
                : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
            }`}
          >
            <Ionicons
              name="storefront-outline"
              size={16}
              color={selectedStoreId ? '#93BD57' : '#8D8680'}
            />
            <Text
              className={`ml-2 text-sm ${
                selectedStoreId
                  ? 'text-primary'
                  : 'text-text-secondary dark:text-text-dark-secondary'
              }`}
              numberOfLines={1}
            >
              {selectedStoreName}
            </Text>
          </Pressable>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Pressable
              onPress={handleClearFilters}
              className="flex-row items-center px-3 py-2 rounded-full bg-error/10 border border-error/30"
            >
              <Ionicons name="close" size={16} color="#980404" />
              <Text className="ml-1 text-sm text-error">{t('history.clearFilters')}</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* Receipt list */}
      <FlatList
        data={receipts}
        keyExtractor={(item) => item.receipt.id.toString()}
        renderItem={renderReceiptItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 20,
          flexGrow: receipts.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#93BD57"
            colors={['#93BD57']}
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
          {/* Modal Header */}
          <View
            className="flex-row items-center justify-between px-4 py-4 border-b border-border dark:border-border-dark"
            style={{ paddingTop: insets.top + 16 }}
          >
            <Pressable onPress={() => setShowFilters(false)}>
              <Text className="text-primary text-base">{t('common.cancel')}</Text>
            </Pressable>
            <Text
              className="text-lg text-text dark:text-text-dark"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('history.filters')}
            </Text>
            <Pressable onPress={() => setShowFilters(false)}>
              <Text className="text-primary text-base font-semibold">{t('common.done')}</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Date Range Section */}
            <Text
              className="text-base text-text dark:text-text-dark mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('history.dateRange')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {(['all', 'thisWeek', 'thisMonth', 'last3Months', 'thisYear'] as DatePreset[]).map(
                (preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setSelectedDatePreset(preset)}
                    className={`px-4 py-2 rounded-full border ${
                      selectedDatePreset === preset
                        ? 'bg-primary border-primary'
                        : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                    }`}
                  >
                    <Text
                      className={
                        selectedDatePreset === preset
                          ? 'text-white font-medium'
                          : 'text-text-secondary dark:text-text-dark-secondary'
                      }
                    >
                      {preset === 'all' ? t('history.allDates') : t(`history.${preset}`)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

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
                className={`px-4 py-2 rounded-full border ${
                  selectedStoreId === null
                    ? 'bg-primary border-primary'
                    : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                }`}
              >
                <Text
                  className={
                    selectedStoreId === null
                      ? 'text-white font-medium'
                      : 'text-text-secondary dark:text-text-dark-secondary'
                  }
                >
                  {t('history.allStores')}
                </Text>
              </Pressable>
              {stores.map((store) => (
                <Pressable
                  key={store.id}
                  onPress={() => setSelectedStoreId(store.id)}
                  className={`px-4 py-2 rounded-full border ${
                    selectedStoreId === store.id
                      ? 'bg-primary border-primary'
                      : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                  }`}
                >
                  <Text
                    className={
                      selectedStoreId === store.id
                        ? 'text-white font-medium'
                        : 'text-text-secondary dark:text-text-dark-secondary'
                    }
                  >
                    {store.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Pressable
                onPress={handleClearFilters}
                className="bg-error/10 border border-error/30 rounded-xl py-3 items-center mt-4"
              >
                <Text className="text-error font-medium">{t('history.clearFilters')}</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
