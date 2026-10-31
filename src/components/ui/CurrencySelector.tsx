/**
 * A segmented choice of currencies, in the look of the analytics period selector.
 */

import { View, Text, Pressable } from 'react-native';
import { MIN_TARGET } from '@/src/theme/a11y';
import { fonts } from '@/src/theme/type';

interface CurrencySelectorProps {
  currencies: string[];
  selected: string;
  onSelect: (code: string) => void;
  accessibilityLabel: string;
}

export function CurrencySelector({
  currencies,
  selected,
  onSelect,
  accessibilityLabel,
}: CurrencySelectorProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className="flex-row bg-surface dark:bg-surface-dark rounded-xl p-1"
    >
      {currencies.map((code) => {
        const isSelected = code === selected;
        return (
          <Pressable
            key={code}
            onPress={() => onSelect(code)}
            accessibilityRole="button"
            accessibilityLabel={code}
            accessibilityState={{ selected: isSelected }}
            style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
            className={`flex-1 py-2.5 rounded-lg items-center ${isSelected ? 'bg-primary-deep' : ''}`}
          >
            <Text
              className={`text-sm ${
                isSelected ? 'text-white' : 'text-text-secondary dark:text-text-dark-secondary'
              }`}
              style={{ fontFamily: isSelected ? fonts.semibold : fonts.medium }}
            >
              {code}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
