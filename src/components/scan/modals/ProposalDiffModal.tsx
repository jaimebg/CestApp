/**
 * Modal for comparing the current reading against an LLM-proposed reading
 * that could not be auto-applied because arithmetic alone could not
 * validate it. The user is the judge here, so both readings are shown
 * side by side with the differing items and total highlighted.
 */

import { useMemo } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '@/src/hooks/useAppColors';
import { ICON_HIT_SLOP } from '@/src/theme/a11y';
import { usePreferencesStore } from '@/src/store/preferences';
import { Button } from '@/src/components/ui/Button';
import type { ParsedItem, ParsedReceipt } from '@/src/services/ocr/parser';

interface Props {
  visible: boolean;
  current: ParsedReceipt | null;
  proposed: ParsedReceipt | null;
  onAccept: () => void;
  onDismiss: () => void;
}

function itemSignature(item: ParsedItem): string {
  return `${item.name.trim().toLowerCase()}|${item.totalPrice.toFixed(2)}`;
}

function countSignatures(items: ParsedItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = itemSignature(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Returns the indices of `items` that have no matching counterpart (same
 * name + price) left in `otherCounts`, consuming matches as it goes so
 * duplicate item names are paired one-to-one instead of all matching at
 * once.
 */
function findDifferingIndices(items: ParsedItem[], otherCounts: Map<string, number>): Set<number> {
  const remaining = new Map(otherCounts);
  const differing = new Set<number>();

  items.forEach((item, index) => {
    const key = itemSignature(item);
    const available = remaining.get(key) ?? 0;
    if (available > 0) {
      remaining.set(key, available - 1);
    } else {
      differing.add(index);
    }
  });

  return differing;
}

function totalsDiffer(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a !== b;
  return Math.abs(a - b) > 0.01;
}

interface ColumnProps {
  receipt: ParsedReceipt;
  title: string;
  differingIndices: Set<number>;
  totalDiffers: boolean;
}

function Column({ receipt, title, differingIndices, totalDiffers }: ColumnProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const formatPrice = usePreferencesStore((state) => state.formatPrice);

  return (
    <View className="flex-1">
      <Text
        className="mb-2"
        style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}
      >
        {title}
      </Text>
      <Text
        className="mb-2"
        style={{ color: colors.text, fontFamily: 'Inter_500Medium', fontSize: 13 }}
      >
        {t('scan.refinementItemsCount', { count: receipt.items.length })}
      </Text>
      {receipt.items.map((item, index) => {
        const differs = differingIndices.has(index);
        return (
          <View key={`${item.name}-${index}`} className="mb-1 flex-row justify-between gap-2">
            <Text
              className="flex-1"
              numberOfLines={1}
              style={{
                color: differs ? colors.action : colors.text,
                fontFamily: differs ? 'Inter_600SemiBold' : 'Inter_400Regular',
                fontSize: 12,
              }}
            >
              {item.name}
            </Text>
            <Text
              style={{
                color: differs ? colors.action : colors.text,
                fontFamily: differs ? 'Inter_600SemiBold' : 'Inter_500Medium',
                fontSize: 12,
              }}
            >
              {formatPrice(item.totalPrice)}
            </Text>
          </View>
        );
      })}
      <View className="mt-2 border-t pt-2" style={{ borderColor: colors.border }}>
        <Text
          style={{
            color: totalDiffers ? colors.action : colors.text,
            fontFamily: 'Inter_700Bold',
            fontSize: 13,
          }}
        >
          {formatPrice(receipt.total)}
        </Text>
      </View>
    </View>
  );
}

export function ProposalDiffModal({ visible, current, proposed, onAccept, onDismiss }: Props) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const currentDiffIndices = useMemo(() => {
    if (!current || !proposed) return new Set<number>();
    return findDifferingIndices(current.items, countSignatures(proposed.items));
  }, [current, proposed]);

  const proposedDiffIndices = useMemo(() => {
    if (!current || !proposed) return new Set<number>();
    return findDifferingIndices(proposed.items, countSignatures(current.items));
  }, [current, proposed]);

  if (!current || !proposed) return null;

  const totalDiffers = totalsDiffer(current.total, proposed.total);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View
          className="flex-row items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <Pressable onPress={onDismiss} hitSlop={ICON_HIT_SLOP} accessibilityRole="button">
            <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>
              {t('common.cancel')}
            </Text>
          </Pressable>
          <Text className="text-lg" style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
            {t('scan.refinementCompareTitle')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView className="flex-1">
          <View className="flex-row gap-4 px-4 py-4">
            <Column
              receipt={current}
              title={t('scan.refinementCurrent')}
              differingIndices={currentDiffIndices}
              totalDiffers={totalDiffers}
            />
            <Column
              receipt={proposed}
              title={t('scan.refinementProposedReading')}
              differingIndices={proposedDiffIndices}
              totalDiffers={totalDiffers}
            />
          </View>
        </ScrollView>

        <View className="flex-row gap-3 px-4 py-4 border-t" style={{ borderColor: colors.border }}>
          <View className="flex-1">
            <Button variant="ghost" onPress={onDismiss}>
              {t('scan.refinementDismiss')}
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="primary" onPress={onAccept}>
              {t('scan.refinementAccept')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
