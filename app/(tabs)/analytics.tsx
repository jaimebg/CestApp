import { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import { useDatabaseReady } from '@/src/db/provider';
import { getAnalyticsSummary, getPeriodComparison } from '@/src/db/queries/analytics';
import { useFormatPrice, usePreferencesStore } from '@/src/store/preferences';
import { useAppColors } from '@/src/hooks/useAppColors';
import { useLayout } from '@/src/hooks/useLayout';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Amount } from '@/src/components/ui/Amount';
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { RankedList } from '@/src/components/analytics/RankedList';
import { fonts } from '@/src/theme/type';
import { DEFAULT_CURRENCY, getCurrency } from '@/src/config/currency';
import { createScopedLogger } from '@/src/utils/debug';
import { formatMonthName } from '@/src/utils/dateTime';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { axisLabels, fillBuckets, niceScale, type Bucket } from '@/src/utils/charts';
import { describeChange, type ComparablePeriod } from '@/src/utils/periods';

const logger = createScopedLogger('Analytics');

const CURRENCY = getCurrency(DEFAULT_CURRENCY);
const CHART_HEIGHT = 180;
/** Wide enough for `31` or a narrow weekday, centred under a bar narrower than it. */
const X_LABEL_WIDTH = 24;

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsSummary>>;

function bucketLabel(
  bucket: Bucket,
  period: ComparablePeriod,
  language: 'en' | 'es',
  today: number
): string {
  const [year, month, day] = bucket.key.split('-').map(Number);
  if (period === 'year') {
    return new Date(year, month - 1, 1).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-GB', {
      month: 'narrow',
    });
  }
  if (period === 'week') {
    return new Date(year, month - 1, day).toLocaleDateString(
      language === 'es' ? 'es-ES' : 'en-GB',
      { weekday: 'narrow' }
    );
  }
  const roundDay = day % 5 === 0 && today - day >= 3;
  return day === 1 || roundDay || bucket.isCurrent ? String(day) : '';
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useAppColors();
  const { isReady } = useDatabaseReady();
  const { formatPrice } = useFormatPrice();
  const language = usePreferencesStore((state) => state.language);
  const layout = useLayout();

  const chartWidth = Math.max(240, layout.contentWidth - 40 - 56);

  const [period, setPeriod] = useState<ComparablePeriod>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasDataRef = useRef(false);

  const loadAnalytics = useCallback(
    async (refresh = false) => {
      if (!isReady) return;

      if (refresh) {
        setIsRefreshing(true);
      } else if (!hasDataRef.current) {
        setIsLoading(true);
      }
      try {
        const [analyticsData, comparison] = await Promise.all([
          getAnalyticsSummary(period),
          getPeriodComparison(period),
        ]);
        hasDataRef.current = true;
        setData(analyticsData);
        setPreviousTotal(comparison.previous);
      } catch (error) {
        logger.error('Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isReady, period]
  );

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [loadAnalytics])
  );

  const periodOptions: { value: ComparablePeriod; label: string }[] = [
    { value: 'week', label: t('analytics.thisWeek') },
    { value: 'month', label: t('analytics.thisMonth') },
    { value: 'year', label: t('analytics.thisYear') },
  ];
  const periodLabel = periodOptions.find((option) => option.value === period)?.label ?? '';

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

  const hasData = !!data && data.receiptCount > 0;
  const buckets = data ? fillBuckets(period, data.spendingByDay) : [];
  const scale = niceScale(Math.max(0, ...buckets.map((bucket) => bucket.amount)));
  const barSlot = chartWidth / Math.max(buckets.length, 1);
  const barWidth = Math.max(3, Math.min(24, Math.floor(barSlot * 0.6)));
  const barData = buckets.map((bucket) => ({
    value: bucket.amount,
    label: bucketLabel(bucket, period, language, new Date().getDate()),
    frontColor: bucket.isCurrent ? colors.action : colors.chartRest,
  }));

  const now = new Date();
  const change = data ? describeChange(data.total, previousTotal) : null;
  const comparisonText = change
    ? t(`comparison.${period}.${change.direction}`, {
        amount: formatPrice(change.delta),
        month: formatMonthName(new Date(now.getFullYear(), now.getMonth() - 1, 1), language),
        year: now.getFullYear() - 1,
      })
    : null;

  const secondary = { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary };
  const categoryRows =
    data?.spendingByCategory
      .filter((item) => item.amount > 0)
      .slice(0, 6)
      .map((item) => ({
        key: String(item.categoryId),
        label: categoryLabel(item.categoryName, t),
        amount: formatPrice(item.amount),
        share: item.percentage,
      })) ?? [];
  const storeRows =
    data?.spendingByStore.slice(0, 5).map((store) => ({
      key: String(store.storeId),
      label: store.storeName || t('scan.unknownStore'),
      amount: formatPrice(store.amount),
      share: store.percentage,
      meta: t('common.receiptCount', { count: store.receiptCount }),
    })) ?? [];

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadAnalytics(true)}
            tintColor={colors.action}
            colors={[colors.action]}
          />
        }
      >
        <ReadingColumn>
          <ScreenHeader title={t('analytics.title')} />
          <View className="px-5 py-3">
            <SegmentedControl
              options={periodOptions}
              value={period}
              onChange={setPeriod}
              accessibilityLabel={t('analytics.title')}
            />
          </View>
        </ReadingColumn>

        {!hasData || !data ? (
          <ReadingColumn>
            <View className="py-20">
              <EmptyState
                icon="stats-chart-outline"
                title={t('analytics.noData')}
                description={t('analytics.noDataDesc')}
              />
            </View>
          </ReadingColumn>
        ) : (
          <View className="w-full mx-auto px-5" style={{ maxWidth: layout.contentWidth }}>
            <View className="mt-3">
              <Text style={{ ...secondary, fontSize: 15 }}>{periodLabel}</Text>
              <Amount size="hero" className="mt-1">
                {formatPrice(data.total)}
              </Amount>
              {comparisonText ? (
                <Text style={{ ...secondary, marginTop: 6 }}>{comparisonText}</Text>
              ) : null}
              <Text style={{ ...secondary, marginTop: comparisonText ? 2 : 6 }}>
                {t('analytics.averagePerReceipt', { amount: formatPrice(data.average) })}
              </Text>
            </View>

            <View className="mt-8">
              <SectionHeader title={t('analytics.spendingOverTime')} />
              <View style={{ marginLeft: -8 }}>
                <BarChart
                  data={barData}
                  width={chartWidth}
                  height={CHART_HEIGHT}
                  barWidth={barWidth}
                  spacing={Math.max(1, Math.floor(barSlot - barWidth))}
                  initialSpacing={Math.max(1, Math.floor((barSlot - barWidth) / 2))}
                  barBorderRadius={2}
                  labelWidth={X_LABEL_WIDTH}
                  maxValue={scale.top}
                  noOfSections={scale.sections}
                  stepValue={scale.step}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={colors.border}
                  rulesColor={colors.border}
                  rulesType="solid"
                  yAxisLabelWidth={52}
                  yAxisTextStyle={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    fontFamily: fonts.regular,
                  }}
                  xAxisLabelTextStyle={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    fontFamily: fonts.regular,
                    width: X_LABEL_WIDTH,
                    marginLeft: (barWidth - X_LABEL_WIDTH) / 2,
                    textAlign: 'center',
                  }}
                  yAxisLabelTexts={axisLabels(scale, CURRENCY)}
                  isAnimated={false}
                  disablePress
                />
              </View>
            </View>

            <View className={layout.columns === 2 ? 'flex-row gap-8 mt-8' : 'mt-8'}>
              {categoryRows.length > 0 && (
                <View className={layout.columns === 2 ? 'flex-1' : 'mb-8'}>
                  <SectionHeader title={t('analytics.byCategory')} />
                  <RankedList rows={categoryRows} />
                </View>
              )}
              {storeRows.length > 0 && (
                <View className={layout.columns === 2 ? 'flex-1' : ''}>
                  <SectionHeader title={t('analytics.byStore')} />
                  <RankedList rows={storeRows} />
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
