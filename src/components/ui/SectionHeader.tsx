import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';
import { ICON_HIT_SLOP } from '@/src/theme/a11y';

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const colors = useAppColors();

  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.text }}
      >
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={ICON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          className="flex-row items-center active:opacity-60"
        >
          <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.action }}>
            {action.label}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.action} />
        </Pressable>
      ) : null}
    </View>
  );
}
