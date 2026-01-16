import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFormatPrice } from '../../store/preferences';
import type { Item } from '../../db/schema/items';
import type { Category } from '../../db/schema/categories';

interface ItemRowProps {
  item: Item;
  category?: Category | null;
  showCategory?: boolean;
}

export function ItemRow({ item, category, showCategory = true }: ItemRowProps) {
  const { t } = useTranslation();
  const { formatPrice } = useFormatPrice();

  const hasQuantity = item.quantity && item.quantity > 1;
  const unitDisplay = item.unit && item.unit !== 'each' ? ` / ${item.unit}` : '';

  return (
    <View className="flex-row items-center py-3 border-b border-border/50 dark:border-border-dark/50">
      {/* Category indicator */}
      {showCategory && (
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: category?.color ? `${category.color}20` : '#8D868020' }}
        >
          <Text className="text-sm">{category?.icon || '📦'}</Text>
        </View>
      )}

      {/* Item details */}
      <View className="flex-1 mr-3">
        <Text
          className="text-text dark:text-text-dark text-base"
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {hasQuantity && (
            <Text className="text-text-secondary dark:text-text-dark-secondary text-sm">
              {item.quantity}x
            </Text>
          )}
          {item.unitPrice && hasQuantity && (
            <Text className="text-text-secondary dark:text-text-dark-secondary text-sm ml-1">
              @ {formatPrice(item.unitPrice / 100)}{unitDisplay}
            </Text>
          )}
          {showCategory && category && (
            <Text className="text-text-secondary dark:text-text-dark-secondary text-xs ml-2">
              {category.name}
            </Text>
          )}
        </View>
      </View>

      {/* Price */}
      <Text className="text-text dark:text-text-dark text-base font-medium">
        {formatPrice(item.price / 100)}
      </Text>
    </View>
  );
}
