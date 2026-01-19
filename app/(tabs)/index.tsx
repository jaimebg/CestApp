import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge, Skeleton } from '@/src/components/ui';
import { ReceiptCard, ReceiptCardSkeleton } from '@/src/components/receipt';
import { useDatabaseReady } from '@/src/db/provider';
import { getReceiptsWithItemCount } from '@/src/db/queries/receipts';
import { getTotalSpending, getReceiptCount } from '@/src/db/queries/analytics';
import { useFormatPrice } from '@/src/store/preferences';
import type { Receipt } from '@/src/db/schema/receipts';
import type { Store } from '@/src/db/schema/stores';

type ReceiptWithStore = {
  receipt: Receipt;
  store: Store | null;
  itemCount: number;
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { isReady } = useDatabaseReady();
  const { formatPrice } = useFormatPrice();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);
  const [recentReceipts, setRecentReceipts] = useState<ReceiptWithStore[]>([]);

  const loadData = useCallback(async () => {
    if (!isReady) return;

    try {
      const [total, count, receipts] = await Promise.all([
        getTotalSpending('month'),
        getReceiptCount('month'),
        getReceiptsWithItemCount(),
      ]);

      setMonthlyTotal(total);
      setReceiptCount(count);
      setRecentReceipts(receipts.slice(0, 3)); // Show only 3 recent
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && !isLoading) {
        loadData();
      }
    }, [isReady, isLoading, loadData])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const handleReceiptPress = useCallback(
    (receiptId: number) => {
      router.push(`/receipt/${receiptId}`);
    },
    [router]
  );

  const handleScanPress = useCallback(() => {
    router.push('/(tabs)/scan');
  }, [router]);

  const handleViewAllPress = useCallback(() => {
    router.push('/(tabs)/history');
  }, [router]);

  if (!isReady || isLoading) {
    return (
      <ScrollView
        className="flex-1 bg-background dark:bg-background-dark"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
      >
        <View className="px-6 pt-4">
          <Text
            className="text-3xl text-text dark:text-text-dark"
            style={{ fontFamily: 'Inter_700Bold' }}
          >
            {t('dashboard.title')}
          </Text>
          <Text
            className="text-base text-text-secondary dark:text-text-dark-secondary mt-2"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('dashboard.subtitle')}
          </Text>

          {/* Monthly spending skeleton */}
          <View className="mt-8 bg-surface dark:bg-surface-dark rounded-2xl p-6">
            <Skeleton width={100} height={14} borderRadius={4} />
            <View className="h-3" />
            <Skeleton width={150} height={40} borderRadius={8} />
          </View>

          {/* Recent receipts skeleton */}
          <View className="mt-8">
            <Skeleton width={140} height={20} borderRadius={4} className="mb-4" />
            <ReceiptCardSkeleton />
            <ReceiptCardSkeleton />
          </View>
        </View>
      </ScrollView>
    );
  }

  const hasReceipts = recentReceipts.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#93BD57"
          colors={['#93BD57']}
        />
      }
    >
      <View className="px-6 pt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Animated.Text
              entering={FadeIn.duration(400)}
              className="text-3xl text-text dark:text-text-dark"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              {t('dashboard.title')}
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.delay(100).duration(400)}
              className="text-base text-text-secondary dark:text-text-dark-secondary mt-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('dashboard.subtitle')}
            </Animated.Text>
          </View>
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <Pressable
              onPress={() => router.push('/settings')}
              className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
              style={{ marginTop: 4 }}
            >
              <Ionicons name="settings-outline" size={24} color="#93BD57" />
            </Pressable>
          </Animated.View>
        </View>

        {/* Monthly Spending Card */}
        <Animated.View entering={FadeInUp.delay(200).duration(500).springify()}>
          <Card variant="elevated" padding="lg" className="mt-8">
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-sm text-text-secondary dark:text-text-dark-secondary"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {t('dashboard.thisMonth')}
              </Text>
              <Badge
                variant={receiptCount > 0 ? 'success' : 'default'}
                size="sm"
                label={`${receiptCount} ${receiptCount === 1 ? t('analytics.receipt') : t('analytics.receipts')}`}
              />
            </View>
            <Text
              className="text-4xl text-text dark:text-text-dark"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              {formatPrice(monthlyTotal)}
            </Text>
          </Card>
        </Animated.View>

        {/* Quick Scan CTA */}
        {!hasReceipts && (
          <Animated.View entering={FadeInUp.delay(300).duration(500).springify()}>
            <Pressable
              onPress={handleScanPress}
              className="mt-4 bg-primary rounded-2xl p-6 flex-row items-center active:opacity-90"
            >
              <View className="bg-white/20 rounded-full p-3 mr-4">
                <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                  {t('dashboard.scanFirst')}
                </Text>
                <Text
                  className="text-white/80 text-sm mt-0.5"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {t('dashboard.startScanning')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        )}

        {/* Recent Receipts */}
        <Animated.View entering={FadeInUp.delay(400).duration(500).springify()} className="mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className="text-lg text-text dark:text-text-dark"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('dashboard.recentReceipts')}
            </Text>
            {hasReceipts && (
              <Pressable onPress={handleViewAllPress} className="flex-row items-center">
                <Text className="text-primary text-sm mr-1">{t('common.all')}</Text>
                <Ionicons name="chevron-forward" size={16} color="#93BD57" />
              </Pressable>
            )}
          </View>

          {hasReceipts ? (
            recentReceipts.map((item, index) => (
              <Animated.View
                key={item.receipt.id}
                entering={FadeInDown.delay(500 + index * 100)
                  .duration(400)
                  .springify()}
              >
                <ReceiptCard
                  receipt={item.receipt}
                  store={item.store}
                  itemCount={item.itemCount}
                  onPress={() => handleReceiptPress(item.receipt.id)}
                />
              </Animated.View>
            ))
          ) : (
            <Animated.View entering={FadeIn.delay(500).duration(400)}>
              <Card variant="outlined" padding="md">
                <View className="flex-row items-center">
                  <View className="bg-primary/20 rounded-full p-3 mr-4">
                    <Ionicons name="receipt-outline" size={24} color="#93BD57" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base text-text dark:text-text-dark"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {t('dashboard.noReceipts')}
                    </Text>
                    <Text
                      className="text-sm text-text-secondary dark:text-text-dark-secondary mt-0.5"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      {t('dashboard.startScanning')}
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </ScrollView>
  );
}
