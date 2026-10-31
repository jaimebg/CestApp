import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';
import { MIN_TARGET } from '@/src/theme/a11y';
import type { IoniconName } from './ListGroup';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IoniconName;
  accessibilityLabel?: string;
}

/** A filter choice. Selected chips carry the action ink; nothing else does. */
export function Chip({ label, selected = false, onPress, icon, accessibilityLabel }: ChipProps) {
  const colors = useAppColors();
  const ink = selected ? colors.action : colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        minHeight: MIN_TARGET,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: selected ? colors.action : colors.border,
        backgroundColor: selected ? `${colors.action}1A` : colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={16} color={ink} style={{ marginRight: 6 }} /> : null}
      <Text
        style={{ fontFamily: selected ? fonts.semibold : fonts.medium, fontSize: 14, color: ink }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
