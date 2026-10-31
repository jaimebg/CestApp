import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { useAppColors } from '@/src/hooks/useAppColors';

export function ReceiptRowSkeleton() {
  const colors = useAppColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Skeleton width="45%" height={16} borderRadius={4} />
        <View style={{ height: 6 }} />
        <Skeleton width="35%" height={12} borderRadius={4} />
      </View>
      <Skeleton width={72} height={18} borderRadius={4} />
    </View>
  );
}
