import { View } from 'react-native';
import { Skeleton, SkeletonCircle } from '../ui/Skeleton';

export function ReceiptCardSkeleton() {
  return (
    <View className="bg-surface dark:bg-surface-dark rounded-2xl p-4 mb-3">
      <View className="flex-row items-center">
        {/* Store icon */}
        <SkeletonCircle size={48} />

        {/* Store name and date */}
        <View className="flex-1 ml-3">
          <Skeleton width="50%" height={18} borderRadius={4} />
          <View className="h-2" />
          <Skeleton width="35%" height={14} borderRadius={4} />
        </View>

        {/* Total */}
        <View className="items-end">
          <Skeleton width={70} height={20} borderRadius={4} />
          <View className="h-2" />
          <Skeleton width={50} height={12} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function ReceiptListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View className="px-4">
      {Array.from({ length: count }).map((_, i) => (
        <ReceiptCardSkeleton key={i} />
      ))}
    </View>
  );
}
