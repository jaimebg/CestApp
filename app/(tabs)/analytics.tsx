import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useDatabaseReady } from '@/src/db/provider';
import { getAnalyticsSummary, TimePeriod } from '@/src/db/queries/analytics';
import { useFormatPrice } from '@/src/store/preferences';
import { useAppColors } from '@/src/hooks/useAppColors';
import { createScopedLogger } from '@/src/utils/debug';

const logger = createScopedLogger('Analytics');

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsSummary>>;

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useAppColors();
  const { isReady } = useDatabaseReady();
  const { formatPrice } = useFormatPrice();

  const [period, setPeriod] = useState<TimePeriod>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const categoryColors = [
    '#93BD57',
    '#5BA4D9',
    '#980404',
    '#FBE580',
    '#8B7EC8',
    '#4DB6AC',
    '#E8976C',
    '#8D8680',
    '#D4A574',
    '#A8CE6F',
  ];

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
        color: item.categoryColor || categoryColors[index % categoryColors.length],
        text: `${item.percentage.toFixed(0)}%`,
        textColor: colors.text,
        shiftTextX: -8,
        shiftTextY: 0,
      })) || [];

  const hasData = data && data.receiptCount > 0;

  if (!isReady || isLoading) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark justify-center items-center"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#93BD57" />
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
                className={`flex-1 py-2.5 rounded-lg items-center ${
                  period === option.key ? 'bg-primary' : ''
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
          <View className="flex-1 justify-center items-center py-20">
            <View className="bg-primary/20 rounded-full p-6 mb-4">
              <Ionicons name="stats-chart-outline" size={48} color={colors.primary} />
            </View>
            <Text
              className="text-lg text-text dark:text-text-dark text-center"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {t('analytics.noData')}
            </Text>
            <Text
              className="text-base text-text-secondary dark:text-text-dark-secondary text-center mt-2 px-8"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {t('analytics.noDataDesc')}
            </Text>
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
                <Text
                  className="text-xl text-text dark:text-text-dark"
                  style={{ fontFamily: 'Inter_700Bold' }}
                >
                  {formatPrice(data.total)}
                </Text>
              </View>
              <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl p-4">
                <Text
                  className="text-xs text-text-secondary dark:text-text-dark-secondary mb-1"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {t('analytics.average')}
                </Text>
                <Text
                  className="text-xl text-text dark:text-text-dark"
                  style={{ fontFamily: 'Inter_700Bold' }}
                >
                  {formatPrice(data.average)}
                </Text>
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
                    width={280}
                    height={180}
                    barWidth={period === 'week' ? 28 : period === 'month' ? 8 : 4}
                    spacing={period === 'week' ? 12 : period === 'month' ? 4 : 2}
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
                          <Text
                            className="text-sm text-text dark:text-text-dark"
                            style={{ fontFamily: 'Inter_600SemiBold' }}
                          >
                            {formatPrice(data.total)}
                          </Text>
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
                              category.categoryColor ||
                              categoryColors[index % categoryColors.length],
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
                      <Text
                        className="text-sm text-text dark:text-text-dark"
                        style={{ fontFamily: 'Inter_600SemiBold' }}
                      >
                        {formatPrice(store.amount)}
                      </Text>
                    </View>
                    <View className="h-2 bg-border dark:bg-border-dark rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${store.percentage}%`,
                          backgroundColor: categoryColors[index % categoryColors.length],
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
