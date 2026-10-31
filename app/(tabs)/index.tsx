import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Amount } from '@/src/components/ui/Amount';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { ReceiptRow, RECEIPT_ROW_BLOCK } from '@/src/components/receipt/ReceiptRow';
import { ReceiptRowSkeleton } from '@/src/components/receipt/ReceiptRowSkeleton';
import { createScopedLogger } from '@/src/utils/debug';
import { useDatabaseReady } from '@/src/db/provider';
import { getReceiptsWithItemCount } from '@/src/db/queries/receipts';
import { getPeriodComparison, getReceiptCount } from '@/src/db/queries/analytics';
import { useFormatPrice, usePreferencesStore } from '@/src/store/preferences';
import { useAppColors } from '@/src/hooks/useAppColors';
import { useEntering } from '@/src/hooks/useEntering';
import { useLayout } from '@/src/hooks/useLayout';
import { MIN_TARGET } from '@/src/theme/a11y';
import { fonts } from '@/src/theme/type';
import { describeChange } from '@/src/utils/periods';
import { formatMonthName, formatMonthYear } from '@/src/utils/dateTime';
import { receiptMeta } from '@/src/utils/receiptMeta';
import type { Receipt } from '@/src/db/schema/receipts';
import type { Store } from '@/src/db/schema/stores';

const logger = createScopedLogger('Dashboard');

/** Never show fewer than this, even on a short screen. */
const MIN_RECEIPT_ROWS = 3;
/** Beyond this the dashboard stops being a summary. */
const MAX_RECEIPT_ROWS = 8;

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
  const language = usePreferencesStore((state) => state.language);
  const colors = useAppColors();
  const entering = useEntering();
  const layout = useLayout();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [monthTotal, setMonthTotal] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);
  const [recentReceipts, setRecentReceipts] = useState<ReceiptWithStore[]>([]);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [listTop, setListTop] = useState(0);

  const now = new Date();
  const title = formatMonthYear(now, language);
  const previousMonth = formatMonthName(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    language
  );
  const change = describeChange(monthTotal, previousTotal);

  const visibleReceipts = useMemo(() => {
    const available = viewportHeight - listTop;
    const rows =
      available > 0
        ? Math.min(
            MAX_RECEIPT_ROWS,
            Math.max(MIN_RECEIPT_ROWS, Math.floor(available / RECEIPT_ROW_BLOCK))
          )
        : MIN_RECEIPT_ROWS;
    return recentReceipts.slice(0, rows * layout.columns);
  }, [recentReceipts, viewportHeight, listTop, layout.columns]);

  const loadData = useCallback(async () => {
    if (!isReady) return;

    try {
      const [comparison, count, receipts] = await Promise.all([
        getPeriodComparison('month'),
        getReceiptCount('month'),
        getReceiptsWithItemCount(),
      ]);

      setMonthTotal(comparison.current);
      setPreviousTotal(comparison.previous);
      setReceiptCount(count);
      setRecentReceipts(receipts);
    } catch (error) {
      logger.error('Failed to load dashboard data:', error);
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

  const settingsButton = (
    <Pressable
      onPress={() => router.push('/settings')}
      className="items-center justify-center active:opacity-60"
      style={{ width: MIN_TARGET, height: MIN_TARGET, marginRight: -10 }}
      accessibilityRole="button"
      accessibilityLabel={t('settings.title')}
    >
      <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
    </Pressable>
  );

  if (!isReady || isLoading) {
    return (
      <ScrollView
        className="flex-1 bg-background dark:bg-background-dark"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
      >
        <ReadingColumn>
          <ScreenHeader title={title} action={settingsButton} />
          <View className="px-5 mt-4">
            <Skeleton width={90} height={14} borderRadius={4} />
            <View className="h-3" />
            <Skeleton width={180} height={40} borderRadius={8} />
          </View>
          <View className="px-5 mt-8">
            <Skeleton width={140} height={18} borderRadius={4} className="mb-2" />
            <ReceiptRowSkeleton />
            <ReceiptRowSkeleton />
            <ReceiptRowSkeleton />
          </View>
        </ReadingColumn>
      </ScrollView>
    );
  }

  const hasReceipts = recentReceipts.length > 0;
  const secondary = { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.action}
          colors={[colors.action]}
        />
      }
    >
      <Animated.View entering={entering(FadeIn, 0, 300)}>
        <ReadingColumn>
          <ScreenHeader title={title} action={settingsButton} />

          <View className="px-5 mt-4">
            <Text style={secondary}>{t('dashboard.thisMonth')}</Text>
            <Amount size="hero" className="mt-1">
              {formatPrice(monthTotal)}
            </Amount>
            {change ? (
              <Text style={{ ...secondary, fontSize: 13, marginTop: 6 }}>
                {t(`comparison.month.${change.direction}`, {
                  amount: formatPrice(change.delta),
                  month: previousMonth,
                })}
              </Text>
            ) : null}
            <Text style={{ ...secondary, fontSize: 13, marginTop: change ? 2 : 6 }}>
              {t('common.receiptCount', { count: receiptCount })}
            </Text>
          </View>

          {!hasReceipts && (
            <View className="px-5 mt-8">
              <Text style={{ ...secondary, marginBottom: 16 }}>{t('dashboard.startScanning')}</Text>
              <Button
                size="lg"
                onPress={() => router.push('/(tabs)/scan')}
                leftIcon={<Ionicons name="scan-outline" size={20} color="#FFFFFF" />}
              >
                {t('dashboard.scanAction')}
              </Button>
            </View>
          )}
        </ReadingColumn>

        {hasReceipts && (
          <View
            className="w-full mx-auto px-5 mt-8"
            style={{ maxWidth: layout.contentWidth }}
            onLayout={(event) => setListTop(event.nativeEvent.layout.y)}
          >
            <SectionHeader
              title={t('dashboard.recentReceipts')}
              action={{ label: t('common.all'), onPress: () => router.push('/(tabs)/history') }}
            />
            <View className={layout.columns === 2 ? 'flex-row flex-wrap -mx-3' : ''}>
              {visibleReceipts.map((item) => (
                <View
                  key={item.receipt.id}
                  style={layout.columns === 2 ? { width: '50%', paddingHorizontal: 12 } : undefined}
                >
                  <ReceiptRow
                    storeName={item.store?.name || t('scan.unknownStore')}
                    meta={receiptMeta(item.receipt.dateTime, item.itemCount, language, t)}
                    amount={formatPrice(
                      item.receipt.totalAmount ? item.receipt.totalAmount / 100 : null
                    )}
                    onPress={() => router.push(`/receipt/${item.receipt.id}`)}
                    accessibilityHint={t('history.openReceipt')}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}
