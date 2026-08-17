/**
 * Modal for selecting a category for an item
 */

import { View, Text, Pressable, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ModalHeader } from '../../ui/ModalHeader';
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
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <ModalHeader title={t('item.category')} onClose={onClose} />

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
                {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.action} />}
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </Modal>
  );
}
