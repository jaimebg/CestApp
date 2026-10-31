import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Amount } from '@/src/components/ui/Amount';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';

/**
 * Vertical space one row occupies, hairline included. The dashboard uses it to
 * decide how many recent receipts fit; re-measure if padding or type changes.
 */
export const RECEIPT_ROW_BLOCK = 72;

interface ReceiptRowProps {
  storeName: string;
  /** `vie 30 oct · 10 artículos` */
  meta: string;
  amount: string;
  onPress: () => void;
  accessibilityHint?: string;
}

function ReceiptRowComponent({
  storeName,
  meta,
  amount,
  onPress,
  accessibilityHint,
}: ReceiptRowProps) {
  const colors = useAppColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${storeName}, ${meta}, ${amount}`}
      accessibilityHint={accessibilityHint}
      className="active:opacity-60"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.text }}
        >
          {storeName}
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 13,
            lineHeight: 18,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {meta}
        </Text>
      </View>
      <View testID="receipt-row-amount" style={{ flexShrink: 0, marginLeft: 12 }}>
        <Amount size="lg">{amount}</Amount>
      </View>
    </Pressable>
  );
}

/** Memoised: the history list re-renders on every keystroke in the search field. */
export const ReceiptRow = memo(ReceiptRowComponent);
