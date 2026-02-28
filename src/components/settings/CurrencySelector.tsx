/**
 * Currency Selector Component
 * Allows users to select their preferred currency
 */

import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '@/src/store/preferences';
import { getSupportedCurrencies, Currency } from '@/src/config/currency';
import { useIsDarkMode } from '@/src/hooks/useAppColors';

interface CurrencySelectorProps {
  showLabel?: boolean;
}

export function CurrencySelector({ showLabel = true }: CurrencySelectorProps) {
  const { t } = useTranslation();
  const isDark = useIsDarkMode();
  const [modalVisible, setModalVisible] = useState(false);

  const { currency, setCurrency } = usePreferencesStore();
  const currencies = getSupportedCurrencies();

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
    primary: '#93BD57',
  };

  const handleSelect = (selected: Currency) => {
    setCurrency(selected.code);
    setModalVisible(false);
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => {
    const isSelected = item.code === currency.code;

    return (
      <Pressable
        onPress={() => handleSelect(item)}
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
        {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        className="flex-row items-center justify-between px-4 py-3 rounded-xl"
        style={{ backgroundColor: colors.surface }}
      >
        <View className="flex-row items-center">
          <Ionicons name="cash-outline" size={22} color={colors.textSecondary} />
          {showLabel && (
            <Text
              className="text-base ml-3"
              style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
            >
              {t('settings.currency')}
            </Text>
          )}
        </View>
        <View className="flex-row items-center">
          <Text
            className="text-base mr-2"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {currency.symbol} {currency.code}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-4 py-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text
              className="text-lg"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('settings.currency')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Currency List */}
          <FlatList
            data={currencies}
            keyExtractor={(item) => item.code}
            renderItem={renderCurrencyItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>
    </>
  );
}
