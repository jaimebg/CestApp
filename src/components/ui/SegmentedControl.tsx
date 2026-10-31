import { Pressable, Text, View } from 'react-native';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';
import { MIN_TARGET } from '@/src/theme/a11y';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

const TRACK_RADIUS = 10;
const TRACK_PADDING = 4;

/** The one control for a short exclusive choice: language, appearance, period. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const colors = useAppColors();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        padding: TRACK_PADDING,
        borderRadius: TRACK_RADIUS,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: MIN_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              borderRadius: TRACK_RADIUS - TRACK_PADDING,
              backgroundColor: selected ? colors.primaryDeep : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: selected ? fonts.semibold : fonts.medium,
                fontSize: 15,
                textAlign: 'center',
                color: selected ? '#FFFFFF' : colors.textSecondary,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
