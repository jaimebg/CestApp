/**
 * One parsed line item on the scan review screen.
 *
 * Extracted and memoised because the review screen holds a dozen pieces of
 * edit state: without this, every keystroke in an item modal re-rendered all
 * ~60 rows of a full weekly shop.
 */

import { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Amount } from '../ui/Amount';
import { ICON_HIT_SLOP } from '../../theme/a11y';
import { fonts } from '../../theme/type';
import type { ReviewColors } from './types';

interface ScanItemRowProps {
  index: number;
  name: string;
  quantity: number;
  unit?: string | null;
  unitPriceLabel: string | null;
  totalPriceLabel: string;
  categoryName: string | null;
  colors: ReviewColors;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

function ScanItemRowComponent({
  index,
  name,
  quantity,
  unit,
  unitPriceLabel,
  totalPriceLabel,
  categoryName,
  colors,
  onEdit,
  onRemove,
}: ScanItemRowProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => onEdit(index)}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${totalPriceLabel}`}
      accessibilityHint={t('scan.editItem')}
      className="flex-row items-center py-3 border-b"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-1 mr-2">
        <Text
          className="text-sm"
          style={{ color: colors.text, fontFamily: fonts.medium }}
          numberOfLines={2}
        >
          {name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {quantity !== 1 && unitPriceLabel && (
            <Text
              className="text-xs mr-2"
              style={{ color: colors.textSecondary, fontFamily: fonts.regular }}
            >
              {quantity} {unit || 'x'} @ {unitPriceLabel}
            </Text>
          )}
          {categoryName && (
            <Text className="text-xs" style={{ color: colors.action, fontFamily: fonts.regular }}>
              {categoryName}
            </Text>
          )}
        </View>
      </View>
      <Amount size="sm" className="mr-3">
        {totalPriceLabel}
      </Amount>
      <Pressable
        onPress={() => onRemove(index)}
        hitSlop={ICON_HIT_SLOP}
        className="p-1"
        accessibilityRole="button"
        accessibilityLabel={`${t('common.delete')}: ${name}`}
      >
        <Ionicons name="close-circle" size={20} color={colors.error} />
      </Pressable>
    </Pressable>
  );
}

export const ScanItemRow = memo(ScanItemRowComponent);
