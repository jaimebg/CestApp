/**
 * Modal for selecting a currency
 */

import { View, Text, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Currency } from '@/src/config/currency';
import type { ReviewColors } from '../types';

interface CurrencyPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (currencyCode: string) => void;
  currencies: Currency[];
  selectedCurrencyCode: string;
  colors: ReviewColors;
}

export function CurrencyPickerModal({
  visible,
  onClose,
  onSelect,
  currencies,
  selectedCurrencyCode,
  colors,
}: CurrencyPickerModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View
          className="flex-row items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text className="text-lg" style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
            {t('settings.currency')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <FlashList
          data={currencies}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => {
            const isSelected = item.code === selectedCurrencyCode;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                }}
                className="flex-row items-center px-4 py-3 border-b"
                style={{ borderColor: colors.border }}
              >
                <View className="flex-1">
                  <Text
                    className="text-base"
                    style={{
                      color: colors.text,
                      fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                    }}
                  >
                    {item.symbol} - {item.name}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {item.code}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </SafeAreaView>
    </Modal>
  );
}
