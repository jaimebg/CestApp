import { memo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFormatPrice } from '../../store/preferences';
import { useAppColors } from '../../hooks/useAppColors';
import { Amount } from '../ui/Amount';
import type { Item } from '../../db/schema/items';
import type { Category } from '../../db/schema/categories';
import { categoryLabel } from '../../utils/categoryLabel';

interface ItemRowProps {
  item: Item;
  category?: Category | null;
  showCategory?: boolean;
  /** Hides the bottom rule on the last row of a list. */
  isLast?: boolean;
}

function ItemRowComponent({ item, category, showCategory = true, isLast = false }: ItemRowProps) {
  const { t } = useTranslation();
  const { formatPrice } = useFormatPrice();
  const colors = useAppColors();

  const hasQuantity = item.quantity && item.quantity > 1;
  const unitDisplay = item.unit && item.unit !== 'each' ? ` / ${item.unit}` : '';

  return (
    <View
      className={`flex-row items-center py-3 ${
        isLast ? '' : 'border-b border-border/50 dark:border-border-dark/50'
      }`}
    >
      {/* Category indicator */}
      {showCategory && (
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-3"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            backgroundColor: `${category?.color || colors.textTertiary}20`,
          }}
        >
          <Text className="text-sm" style={{ fontFamily: 'Inter_400Regular' }}>
            {category?.icon || '📦'}
          </Text>
        </View>
      )}

      {/* Item details */}
      <View className="flex-1 mr-3">
        <Text
          className="text-text dark:text-text-dark text-base"
          numberOfLines={2}
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          {item.name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {hasQuantity && (
            <Text
              className="text-text-secondary dark:text-text-dark-secondary text-sm"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {item.quantity}x
            </Text>
          )}
          {item.unitPrice && hasQuantity && (
            <Text
              className="text-text-secondary dark:text-text-dark-secondary text-sm ml-1"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              @ {formatPrice(item.unitPrice / 100)}
              {unitDisplay}
            </Text>
          )}
          {showCategory && category && (
            <Text
              className="text-text-secondary dark:text-text-dark-secondary text-xs ml-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {categoryLabel(category.name, t)}
            </Text>
          )}
        </View>
      </View>

      {/* Price */}
      <Amount size="base">{formatPrice(item.price / 100)}</Amount>
    </View>
  );
}

/** Memoised so editing one item does not re-render the whole receipt. */
export const ItemRow = memo(ItemRowComponent);
