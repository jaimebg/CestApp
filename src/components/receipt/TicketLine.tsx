import type { ReactNode } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Amount } from '@/src/components/ui/Amount';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';
import { MIN_TARGET } from '@/src/theme/a11y';

type TicketLineVariant = 'item' | 'subtotal' | 'total';

interface TicketLineProps {
  label: string;
  amount: string;
  /** Quantity, category: whatever the printed ticket shows under the concept. */
  meta?: string;
  variant?: TicketLineVariant;
  /** The amount is wrong in a way the user must fix, e.g. a total that does not add up. */
  danger?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  /** A non-interactive mark after the amount, inside the row's tap area (e.g. a pencil). */
  adornment?: ReactNode;
  /** A control after the amount, such as the quiet delete in review. */
  trailing?: ReactNode;
}

/**
 * Dotted leader between concept and amount, as a thermal printer sets it.
 * Drawn with SVG because a one-sided dotted border is unreliable on Android.
 */
function Leader({ color }: { color: string }) {
  return (
    <View
      testID="ticket-leader"
      style={{ flex: 1, minWidth: 12, height: 2, marginHorizontal: 6, marginBottom: 5 }}
    >
      <Svg width="100%" height={2}>
        <Line
          x1="1"
          y1="1"
          x2="100%"
          y2="1"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="0.1 4"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

/**
 * From this text size on, a long concept beside a fixed amount squeezes into a
 * column a few letters wide, so the amount moves to its own line instead.
 */
const STACK_FONT_SCALE = 1.6;

/** A dashed rule across the ticket, like the one above a printed total. */
export function TicketRule() {
  const colors = useAppColors();
  return (
    <View style={{ height: 2, marginVertical: 12, opacity: 0.6 }}>
      <Svg width="100%" height={2}>
        <Line
          x1="0"
          y1="1"
          x2="100%"
          y2="1"
          stroke={colors.textTertiary}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      </Svg>
    </View>
  );
}

export function TicketLine({
  label,
  amount,
  meta,
  variant = 'item',
  danger = false,
  onPress,
  accessibilityHint,
  adornment,
  trailing,
}: TicketLineProps) {
  const colors = useAppColors();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= STACK_FONT_SCALE;
  const isTotal = variant === 'total';
  const ink = variant === 'subtotal' ? colors.textSecondary : colors.text;

  const labelText = (
    <Text
      style={{
        flexShrink: 1,
        fontFamily: isTotal ? fonts.semibold : fonts.regular,
        fontSize: isTotal ? 17 : 15,
        lineHeight: isTotal ? 24 : 20,
        color: ink,
      }}
    >
      {label}
    </Text>
  );
  const amountView = (
    <View
      testID="ticket-amount"
      style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center' }}
    >
      <Amount size={isTotal ? 'xl' : 'base'} style={danger ? { color: colors.error } : undefined}>
        {amount}
      </Amount>
      {adornment ? <View style={{ marginLeft: 8 }}>{adornment}</View> : null}
    </View>
  );
  const metaText = meta ? (
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
  ) : null;

  const body = stacked ? (
    <View testID="ticket-line-stacked" style={{ flex: 1 }}>
      {labelText}
      {metaText}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }}>
        {isTotal ? <View style={{ flex: 1 }} /> : <Leader color={colors.textTertiary} />}
        {amountView}
      </View>
    </View>
  ) : (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {labelText}
        {isTotal ? (
          <View style={{ flex: 1, minWidth: 12 }} />
        ) : (
          <Leader color={colors.textTertiary} />
        )}
        {amountView}
      </View>
      {metaText}
    </View>
  );

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: onPress ? MIN_TARGET : undefined,
    paddingVertical: variant === 'item' ? 8 : 4,
  };
  const accessibilityLabel = [label, meta, amount].filter(Boolean).join(', ');

  if (!onPress) {
    return (
      <View style={rowStyle} accessible accessibilityLabel={accessibilityLabel}>
        {body}
        {trailing ? <View style={{ marginLeft: 4 }}>{trailing}</View> : null}
      </View>
    );
  }

  return (
    <View style={rowStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        className="active:opacity-60"
        style={{ flex: 1 }}
      >
        {body}
      </Pressable>
      {trailing ? <View style={{ marginLeft: 4 }}>{trailing}</View> : null}
    </View>
  );
}
