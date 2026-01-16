import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFormatPrice } from '../../store/preferences';

interface ReceiptSummaryProps {
  subtotal?: number | null;
  tax?: number | null;
  discount?: number | null;
  total: number | null;
}

export function ReceiptSummary({ subtotal, tax, discount, total }: ReceiptSummaryProps) {
  const { t } = useTranslation();
  const { formatPrice } = useFormatPrice();

  const hasBreakdown = subtotal != null || tax != null || discount != null;

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-2xl p-4 mt-4">
      {hasBreakdown && (
        <>
          {subtotal != null && (
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary dark:text-text-dark-secondary text-base">
                {t('receipt.subtotal')}
              </Text>
              <Text className="text-text dark:text-text-dark text-base">
                {formatPrice(subtotal / 100)}
              </Text>
            </View>
          )}

          {tax != null && tax > 0 && (
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary dark:text-text-dark-secondary text-base">
                {t('receipt.tax')}
              </Text>
              <Text className="text-text dark:text-text-dark text-base">
                {formatPrice(tax / 100)}
              </Text>
            </View>
          )}

          {discount != null && discount > 0 && (
            <View className="flex-row justify-between py-2">
              <Text className="text-primary text-base">
                {t('receipt.discount')}
              </Text>
              <Text className="text-primary text-base">
                -{formatPrice(discount / 100)}
              </Text>
            </View>
          )}

          <View className="border-t border-border dark:border-border-dark mt-2 pt-2" />
        </>
      )}

      {/* Total */}
      <View className="flex-row justify-between py-2">
        <Text className="text-text dark:text-text-dark text-lg font-semibold">
          {t('receipt.total')}
        </Text>
        <Text className="text-text dark:text-text-dark text-xl font-bold">
          {formatPrice(total ? total / 100 : null)}
        </Text>
      </View>
    </View>
  );
}
