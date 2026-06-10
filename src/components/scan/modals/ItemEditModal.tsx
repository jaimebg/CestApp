/**
 * Modal for adding or editing a receipt line item
 */

import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { ReviewColors } from '../types';

interface ItemEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  isEditing: boolean;
  name: string;
  price: string;
  quantity: string;
  categoryLabel: string | null;
  onChangeName: (value: string) => void;
  onChangePrice: (value: string) => void;
  onChangeQuantity: (value: string) => void;
  onSelectCategory: () => void;
  colors: ReviewColors;
}

export function ItemEditModal({
  visible,
  onClose,
  onSave,
  isEditing,
  name,
  price,
  quantity,
  categoryLabel,
  onChangeName,
  onChangePrice,
  onChangeQuantity,
  onSelectCategory,
  colors,
}: ItemEditModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const canSave = !!name.trim() && !!price;

  const inputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
  };

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View
            className="flex-row items-center justify-between px-4 py-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
              <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
            <Text
              className="text-lg"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {isEditing ? t('scan.editItem') : t('scan.addItem')}
            </Text>
            <Pressable onPress={onSave} hitSlop={8} disabled={!canSave} accessibilityRole="button">
              <Text
                style={{
                  color: canSave ? colors.primary : colors.textSecondary,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {t('common.save')}
              </Text>
            </Pressable>
          </View>

          <ScrollView className="p-4">
            <Text
              className="text-sm mb-2"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
            >
              {t('item.name')}
            </Text>
            <TextInput
              value={name}
              onChangeText={onChangeName}
              placeholder={t('item.name')}
              placeholderTextColor={colors.textSecondary}
              className="px-4 py-3 rounded-xl text-base mb-4"
              style={inputStyle}
              autoFocus
            />

            <Text
              className="text-sm mb-2"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
            >
              {t('item.price')}
            </Text>
            <TextInput
              value={price}
              onChangeText={onChangePrice}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              className="px-4 py-3 rounded-xl text-base mb-4"
              style={inputStyle}
              keyboardType="decimal-pad"
            />

            <Text
              className="text-sm mb-2"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
            >
              {t('item.quantity')}
            </Text>
            <TextInput
              value={quantity}
              onChangeText={onChangeQuantity}
              placeholder="1"
              placeholderTextColor={colors.textSecondary}
              className="px-4 py-3 rounded-xl text-base mb-4"
              style={inputStyle}
              keyboardType="decimal-pad"
            />

            <Text
              className="text-sm mb-2"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
            >
              {t('item.category')}
            </Text>
            <Pressable
              onPress={onSelectCategory}
              className="flex-row items-center justify-between px-4 py-3 rounded-xl"
              style={{ backgroundColor: colors.surface }}
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: categoryLabel ? colors.text : colors.textSecondary,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                {categoryLabel || t('scan.selectCategory')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
