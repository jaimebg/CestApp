import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormatPrice } from '../../store/preferences';
import { TicketLine } from './TicketLine';
import type { Item } from '../../db/schema/items';
import type { Category } from '../../db/schema/categories';
import { categoryLabel } from '../../utils/categoryLabel';

interface ItemRowProps {
  item: Item;
  category?: Category | null;
  showCategory?: boolean;
}

function ItemRowComponent({ item, category, showCategory = true }: ItemRowProps) {
  const { t } = useTranslation();
  const { formatPrice } = useFormatPrice();

  const hasQuantity = !!item.quantity && item.quantity > 1;
  const unitDisplay = item.unit && item.unit !== 'each' ? ` / ${item.unit}` : '';
  const quantity = hasQuantity
    ? item.unitPrice
      ? `${item.quantity}x @ ${formatPrice(item.unitPrice / 100)}${unitDisplay}`
      : `${item.quantity}x`
    : null;
  const meta = [quantity, showCategory && category ? categoryLabel(category.name, t) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <TicketLine label={item.name} amount={formatPrice(item.price / 100)} meta={meta || undefined} />
  );
}

/** Memoised so editing one item does not re-render the whole receipt. */
export const ItemRow = memo(ItemRowComponent);
