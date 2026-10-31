import { Text, View } from 'react-native';
import { Amount } from '@/src/components/ui/Amount';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';

export type RankedRow = {
  key: string;
  label: string;
  amount: string;
  /** Percentage of the period's spending, 0–100. */
  share: number;
  meta?: string;
};

/**
 * Where the money went, largest first. One accent on the leader; every other
 * bar is a neutral step sized against it, so the ranking reads at a glance.
 */
export function RankedList({ rows }: { rows: RankedRow[] }) {
  const colors = useAppColors();
  const leader = rows[0]?.share || 1;

  return (
    <View>
      {rows.map((row, index) => (
        <View key={row.key} style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text }}
            >
              {row.label}
            </Text>
            <Amount size="sm">{row.amount}</Amount>
            <Text
              style={{
                width: 48,
                textAlign: 'right',
                fontFamily: fonts.regular,
                fontSize: 13,
                color: colors.textSecondary,
              }}
            >
              {`${Math.round(row.share)} %`}
            </Text>
          </View>
          <View style={{ height: 4, marginTop: 6, borderRadius: 2, overflow: 'hidden' }}>
            <View
              testID={`ranked-bar-${row.key}`}
              style={{
                height: 4,
                borderRadius: 2,
                width: `${Math.max(2, Math.round((row.share / leader) * 100))}%`,
                backgroundColor: index === 0 ? colors.action : colors.border,
              }}
            />
          </View>
          {row.meta ? (
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              {row.meta}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
