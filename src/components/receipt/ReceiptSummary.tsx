import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFormatPrice } from '../../store/preferences';
import { Amount } from '../ui/Amount';
import { fonts } from '../../theme/type';

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
              <Amount size="base">{formatPrice(subtotal / 100)}</Amount>
            </View>
          )}

          {tax != null && tax > 0 && (
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary dark:text-text-dark-secondary text-base">
                {t('receipt.tax')}
              </Text>
              <Amount size="base">{formatPrice(tax / 100)}</Amount>
            </View>
          )}

          {discount != null && discount > 0 && (
            <View className="flex-row justify-between py-2">
              <Text className="text-action dark:text-action-dark text-base">
                {t('receipt.discount')}
              </Text>
              <Amount size="base" tone="action">
                -{formatPrice(discount / 100)}
              </Amount>
            </View>
          )}

          <View className="border-t border-border dark:border-border-dark mt-2 pt-2" />
        </>
      )}

      {/* Total */}
      <View className="flex-row justify-between py-2">
        <Text
          className="text-text dark:text-text-dark text-lg"
          style={{ fontFamily: fonts.semibold }}
        >
          {t('receipt.total')}
        </Text>
        <Amount size="xl">{formatPrice(total ? total / 100 : null)}</Amount>
      </View>
    </View>
  );
}
