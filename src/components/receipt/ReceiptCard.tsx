import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import type { Receipt } from '../../db/schema/receipts';
import type { Store } from '../../db/schema/stores';
import { useFormatPrice } from '../../store/preferences';
import { useAppColors } from '../../hooks/useAppColors';
import { Amount } from '../ui/Amount';
import { fonts } from '../../theme/type';

interface ReceiptCardProps {
  receipt: Receipt;
  store: Store | null;
  itemCount?: number;
  onPress?: () => void;
}

function ReceiptCardComponent({ receipt, store, itemCount = 0, onPress }: ReceiptCardProps) {
  const { t } = useTranslation();
  const { formatPrice } = useFormatPrice();
  const colors = useAppColors();

  const formattedDate = receipt.dateTime
    ? new Date(receipt.dateTime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : t('scan.noDateFound');

  const formattedTime = receipt.dateTime
    ? new Date(receipt.dateTime).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const storeName = store?.name || t('scan.unknownStore');
  const formattedTotal = formatPrice(receipt.totalAmount ? receipt.totalAmount / 100 : null);

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 border border-border dark:border-border-dark active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${storeName}, ${formattedDate}, ${formattedTotal}`}
      accessibilityHint={t('history.openReceipt')}
    >
      <View className="flex-row items-start justify-between">
        {/* Left side: Store and date info */}
        <View className="flex-1 mr-4">
          <Text
            className="text-text dark:text-text-dark text-base mb-1"
            style={{ fontFamily: fonts.semibold }}
            numberOfLines={1}
          >
            {storeName}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text className="text-text-secondary dark:text-text-dark-secondary text-sm ml-1">
              {formattedDate}
            </Text>
            {formattedTime && (
              <>
                <Text className="text-text-secondary dark:text-text-dark-secondary text-sm mx-1">
                  •
                </Text>
                <Text className="text-text-secondary dark:text-text-dark-secondary text-sm">
                  {formattedTime}
                </Text>
              </>
            )}
          </View>
          {itemCount > 0 && (
            <Text className="text-text-secondary dark:text-text-dark-secondary text-xs mt-1">
              {t('scan.itemsFound', { count: itemCount })}
            </Text>
          )}
        </View>

        {/* Right side: Total amount */}
        <View className="items-end">
          <Amount size="lg">{formattedTotal}</Amount>
          {receipt.paymentMethod && (
            <View className="flex-row items-center mt-1">
              <Ionicons
                name={
                  receipt.paymentMethod === 'card'
                    ? 'card-outline'
                    : receipt.paymentMethod === 'digital'
                      ? 'phone-portrait-outline'
                      : 'cash-outline'
                }
                size={12}
                color={colors.textSecondary}
              />
              <Text className="text-text-secondary dark:text-text-dark-secondary text-xs ml-1 capitalize">
                {t(`receipt.${receipt.paymentMethod}`)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Memoised: the history list re-renders on every keystroke in the search
 * field, and without this each one re-rendered every mounted row.
 */
export const ReceiptCard = memo(ReceiptCardComponent);
