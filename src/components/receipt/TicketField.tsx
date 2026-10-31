import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';
import { MIN_TARGET } from '@/src/theme/a11y';

interface TicketFieldProps {
  value: string;
  accessibilityLabel: string;
  onPress: () => void;
  /** `title` for the store name, `line` for the date under it. */
  variant?: 'title' | 'line';
}

/** An editable line in a ticket's heading: the value, then a quiet pencil that never leaves the paper. */
export function TicketField({
  value,
  accessibilityLabel,
  onPress,
  variant = 'line',
}: TicketFieldProps) {
  const colors = useAppColors();
  const isTitle = variant === 'title';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: value }}
      className="flex-row items-center active:opacity-60"
      style={{ minHeight: MIN_TARGET, maxWidth: '100%' }}
    >
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          marginRight: 6,
          color: isTitle ? colors.text : colors.textSecondary,
          fontFamily: isTitle ? fonts.semibold : fonts.regular,
          fontSize: isTitle ? 17 : 13,
        }}
      >
        {value}
      </Text>
      <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}
