/**
 * The read-only item list on a receipt.
 *
 * A weekly shop can run past 60 lines, and every row mounts at once inside a
 * ScrollView. Showing the first 25 keeps the screen cheap to open and spares
 * the reader a wall of rows; the rest are one tap away.
 *
 * Deliberately not used on the scan review screen, whose whole purpose is
 * checking every parsed line before saving — hiding rows there would let
 * someone save data they never looked at.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ItemRow } from './ItemRow';
import { Button } from '../ui/Button';
import type { Item } from '../../db/schema/items';
import type { Category } from '../../db/schema/categories';

/** Chosen so a typical 5–20 item receipt never sees the control. */
export const COLLAPSE_THRESHOLD = 25;

interface CollapsibleItemListProps {
  items: { item: Item; category: Category | null }[];
}

export function CollapsibleItemList({ items }: CollapsibleItemListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const isCollapsed = !expanded && items.length > COLLAPSE_THRESHOLD;
  const visible = isCollapsed ? items.slice(0, COLLAPSE_THRESHOLD) : items;
  const hiddenCount = items.length - visible.length;

  return (
    <View>
      {visible.map(({ item, category }, index) => (
        <ItemRow
          key={item.id}
          item={item}
          category={category}
          isLast={index === visible.length - 1 && !isCollapsed}
        />
      ))}

      {isCollapsed && (
        <View className="py-3">
          <Button variant="ghost" onPress={() => setExpanded(true)}>
            {t('receipt.showAllItems', { count: hiddenCount })}
          </Button>
        </View>
      )}
    </View>
  );
}
