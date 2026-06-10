/**
 * Modal for editing the receipt total
 */

import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { ReviewColors } from '../types';

interface TotalEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  value: string;
  onChangeText: (value: string) => void;
  itemsSumLabel: string;
  colors: ReviewColors;
}

export function TotalEditModal({
  visible,
  onClose,
  onSave,
  value,
  onChangeText,
  itemsSumLabel,
  colors,
}: TotalEditModalProps) {
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
              {t('receipt.total')}
            </Text>
            <Pressable onPress={onSave} hitSlop={8} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                {t('common.save')}
              </Text>
            </Pressable>
          </View>

          <View className="p-4">
            <Text
              className="text-sm mb-2"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
            >
              {t('receipt.total')}
            </Text>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              className="px-4 py-3 rounded-xl text-base"
              style={{
                backgroundColor: colors.surface,
                color: colors.text,
                fontFamily: 'Inter_400Regular',
              }}
              keyboardType="decimal-pad"
              autoFocus
            />

            <View className="mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <Text
                className="text-sm"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('scan.itemsSum')}: {itemsSumLabel}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
