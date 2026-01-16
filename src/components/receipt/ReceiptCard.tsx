import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import type { Receipt } from '../../db/schema/receipts';
import type { Store } from '../../db/schema/stores';
import { useFormatPrice } from '../../store/preferences';

interface ReceiptCardProps {
  receipt: Receipt;
  store: Store | null;
  itemCount?: number;
  onPress?: () => void;
}

export function ReceiptCard({ receipt, store, itemCount = 0, onPress }: ReceiptCardProps) {
  const { t } = useTranslation();
  const { formatPrice } = useFormatPrice();

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

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 border border-border dark:border-border-dark active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        {/* Left side: Store and date info */}
        <View className="flex-1 mr-4">
          <Text
            className="text-text dark:text-text-dark text-base font-semibold mb-1"
            numberOfLines={1}
          >
            {storeName}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#8D8680" />
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
          <Text className="text-text dark:text-text-dark text-lg font-bold">
            {formatPrice(receipt.totalAmount ? receipt.totalAmount / 100 : null)}
          </Text>
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
                color="#8D8680"
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
