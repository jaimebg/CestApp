import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useDatabaseReady } from '@/src/db/provider';
import { getAnalyticsSummary, TimePeriod } from '@/src/db/queries/analytics';
import { useFormatPrice } from '@/src/store/preferences';
import { useAppColors } from '@/src/hooks/useAppColors';
import { chartSeries } from '@/src/theme/colors';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Amount } from '@/src/components/ui/Amount';
import { MIN_TARGET } from '@/src/theme/a11y';
import { createScopedLogger } from '@/src/utils/debug';

const logger = createScopedLogger('Analytics');

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsSummary>>;

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useAppColors();
  const { isReady } = useDatabaseReady();
  const { formatPrice } = useFormatPrice();
  const { width: windowWidth } = useWindowDimensions();

  // The chart card is mx-4 (32) inside p-4 (32). A fixed 280 clipped its right
  // edge on a 320pt phone and left ~86pt of dead card on a Pro Max.
  const chartWidth = Math.max(240, windowWidth - 64 - 24);

  const [period, setPeriod] = useState<TimePeriod>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!isReady) return;

    setIsLoading(true);
    try {
      const analyticsData = await getAnalyticsSummary(period);
      setData(analyticsData);
    } catch (error) {
      logger.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isReady, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const periodOptions: { key: TimePeriod; label: string }[] = [
    { key: 'week', label: t('analytics.thisWeek') },
    { key: 'month', label: t('analytics.thisMonth') },
    { key: 'year', label: t('analytics.thisYear') },
  ];

  const barChartData =
    data?.spendingByDay.map((item, index) => {
      const date = new Date(item.date);
      const dayLabel = date.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
      });

      return {
        value: item.amount,
        label: period === 'week' ? dayLabel.split(' ')[0] : date.getDate().toString(),
        frontColor: colors.primary,
        topLabelComponent: () => null,
      };
    }) || [];

  const pieChartData =
    data?.spendingByCategory
      .filter((item) => item.amount > 0)
      .slice(0, 8)
      .map((item, index) => ({
        value: item.amount,
        color: item.categoryColor || chartSeries[index % chartSeries.length],
        text: `${item.percentage.toFixed(0)}%`,
        textColor: colors.text,
        shiftTextX: -8,
        shiftTextY: 0,
      })) || [];

  // Fit the bars to the width we actually have rather than to the period.
  const barLayout = (() => {
    const count = Math.max(barChartData.length, 1);
    const slot = chartWidth / count;
    const barWidth = Math.max(2, Math.min(28, Math.floor(slot * 0.7)));
    return { barWidth, spacing: Math.max(1, Math.floor(slot - barWidth)) };
  })();

  const hasData = data && data.receiptCount > 0;

  if (!isReady || isLoading) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark justify-center items-center"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color={colors.action} />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text
            className="text-3xl text-text dark:text-text-dark"
            style={{ fontFamily: 'Inter_700Bold' }}
          >
            {t('analytics.title')}
          </Text>
          <Text
            className="text-base text-text-secondary dark:text-text-dark-secondary mt-1"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {t('analytics.subtitle')}
          </Text>
        </View>

        {/* Period Selector */}
        <View className="px-4 py-3">
          <View className="flex-row bg-surface dark:bg-surface-dark rounded-xl p-1">
            {periodOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setPeriod(option.key)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: period === option.key }}
                style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
                className={`flex-1 py-2.5 rounded-lg items-center ${
                  period === option.key ? 'bg-primary-deep' : ''
                }`}
              >
                <Text
                  className={`text-sm ${
                    period === option.key
                      ? 'text-white'
                      : 'text-text-secondary dark:text-text-dark-secondary'
                  }`}
                  style={{
                    fontFamily: period === option.key ? 'Inter_600SemiBold' : 'Inter_500Medium',
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!hasData ? (
          <View className="py-20">
            <EmptyState
              icon="stats-chart-outline"
              title={t('analytics.noData')}
              description={t('analytics.noDataDesc')}
            />
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View className="flex-row px-4 gap-3 mb-4">
              <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4">
                <Text
                  className="text-xs text-text-secondary dark:text-text-dark-secondary mb-1"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {t('analytics.total')}
                </Text>
                <Amount size="xl">{formatPrice(data.total)}</Amount>
              </View>
              <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4">
                <Text
                  className="text-xs text-text-secondary dark:text-text-dark-secondary mb-1"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {t('analytics.average')}
                </Text>
                <Amount size="xl">{formatPrice(data.average)}</Amount>
              </View>
            </View>

            {/* Spending Over Time Chart */}
            {barChartData.length > 0 && (
              <View className="mx-4 mb-4 bg-surface dark:bg-surface-dark rounded-2xl p-4">
                <Text
                  className="text-base text-text dark:text-text-dark mb-4"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {t('analytics.spendingOverTime')}
                </Text>
                <View style={{ marginLeft: -10 }}>
                  <BarChart
                    data={barChartData}
                    width={chartWidth}
                    height={180}
                    barWidth={barLayout.barWidth}
                    spacing={barLayout.spacing}
                    barBorderRadius={4}
                    noOfSections={4}
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor={colors.border}
                    yAxisTextStyle={{
                      color: colors.textSecondary,
                      fontSize: 10,
                      fontFamily: 'Inter_400Regular',
                    }}
                    xAxisLabelTextStyle={{
                      color: colors.textSecondary,
                      fontSize: 9,
                      fontFamily: 'Inter_400Regular',
                    }}
                    hideRules
                    isAnimated
                    animationDuration={500}
                  />
                </View>
              </View>
            )}

            {/* Category Breakdown */}
            {pieChartData.length > 0 && (
              <View className="mx-4 mb-4 bg-surface dark:bg-surface-dark rounded-2xl p-4">
                <Text
                  className="text-base text-text dark:text-text-dark mb-4"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {t('analytics.byCategory')}
                </Text>
                <View className="flex-row items-center">
                  <View className="items-center" style={{ flex: 1 }}>
                    <PieChart
                      data={pieChartData}
                      donut
                      radius={70}
                      innerRadius={45}
                      innerCircleColor={colors.surface}
                      centerLabelComponent={() => (
                        <View className="items-center">
                          <Text
                            className="text-xs text-text-secondary dark:text-text-dark-secondary"
                            style={{ fontFamily: 'Inter_400Regular' }}
                          >
                            {t('analytics.total')}
                          </Text>
                          <Amount size="sm" weight="semibold">
                            {formatPrice(data.total)}
                          </Amount>
                        </View>
                      )}
                    />
                  </View>
                  <View className="flex-1 pl-2">
                    {data.spendingByCategory.slice(0, 5).map((category, index) => (
                      <View key={category.categoryId} className="flex-row items-center mb-2">
                        <View
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor:
                              category.categoryColor || chartSeries[index % chartSeries.length],
                          }}
                        />
                        <Text
                          className="flex-1 text-xs text-text dark:text-text-dark"
                          style={{ fontFamily: 'Inter_400Regular' }}
                          numberOfLines={1}
                        >
                          {category.categoryIcon} {category.categoryName}
                        </Text>
                        <Text
                          className="text-xs text-text-secondary dark:text-text-dark-secondary ml-1"
                          style={{ fontFamily: 'Inter_500Medium' }}
                        >
                          {category.percentage.toFixed(0)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Store Comparison */}
            {data.spendingByStore.length > 0 && (
              <View className="mx-4 mb-4 bg-surface dark:bg-surface-dark rounded-2xl p-4">
                <Text
                  className="text-base text-text dark:text-text-dark mb-4"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {t('analytics.byStore')}
                </Text>
                {data.spendingByStore.slice(0, 5).map((store, index) => (
                  <View key={store.storeId} className="mb-3">
                    <View className="flex-row justify-between mb-1">
                      <Text
                        className="text-sm text-text dark:text-text-dark flex-1"
                        style={{ fontFamily: 'Inter_500Medium' }}
                        numberOfLines={1}
                      >
                        {store.storeName}
                      </Text>
                      <Amount size="sm" weight="semibold">
                        {formatPrice(store.amount)}
                      </Amount>
                    </View>
                    <View className="h-2 bg-border dark:bg-border-dark rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${store.percentage}%`,
                          backgroundColor: chartSeries[index % chartSeries.length],
                        }}
                      />
                    </View>
                    <Text
                      className="text-xs text-text-secondary dark:text-text-dark-secondary mt-1"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      {store.receiptCount}{' '}
                      {store.receiptCount === 1 ? t('analytics.receipt') : t('analytics.receipts')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
