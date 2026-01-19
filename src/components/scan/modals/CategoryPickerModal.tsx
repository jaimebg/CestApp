/**
 * Modal for selecting a category for an item
 */

import { View, Text, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Category, ReviewColors } from '../types';

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (categoryId: number) => void;
  categories: Category[];
  selectedCategoryId: number | null;
  colors: ReviewColors;
}

export function CategoryPickerModal({
  visible,
  onClose,
  onSelect,
  categories,
  selectedCategoryId,
  colors,
}: CategoryPickerModalProps) {
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
            {t('item.category')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <FlashList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedCategoryId;
            return (
              <Pressable
                onPress={() => onSelect(item.id)}
                className="flex-row items-center px-4 py-3 border-b"
                style={{ borderColor: colors.border }}
              >
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: (item.color || colors.textSecondary) + '20' }}
                >
                  <Text className="text-base">{item.icon || '📦'}</Text>
                </View>
                <Text
                  className="flex-1 text-base"
                  style={{
                    color: colors.text,
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                  }}
                >
                  {item.name}
                </Text>
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
