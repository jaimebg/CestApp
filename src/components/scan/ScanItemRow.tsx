/**
 * One parsed line item on the scan review screen.
 *
 * Extracted and memoised because the review screen holds a dozen pieces of
 * edit state: without this, every keystroke in an item modal re-rendered all
 * ~60 rows of a full weekly shop.
 */

import { memo } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TicketLine } from '../receipt/TicketLine';
import { ICON_HIT_SLOP, MIN_TARGET } from '../../theme/a11y';
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
  const quantityLabel =
    quantity !== 1 && unitPriceLabel
      ? `${quantity}${unit ? ` ${unit}` : 'x'} @ ${unitPriceLabel}`
      : null;
  const meta = [quantityLabel, categoryName].filter(Boolean).join(' · ');

  return (
    <TicketLine
      label={name}
      amount={totalPriceLabel}
      meta={meta || undefined}
      onPress={() => onEdit(index)}
      trailing={
        <Pressable
          onPress={() => onRemove(index)}
          hitSlop={ICON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${t('common.delete')}: ${name}`}
          style={{
            minWidth: MIN_TARGET,
            minHeight: MIN_TARGET,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.textTertiary} />
        </Pressable>
      }
    />
  );
}

export const ScanItemRow = memo(ScanItemRowComponent);
