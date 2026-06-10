/**
 * Modal for editing the store name
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

interface StoreEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  value: string;
  onChangeText: (text: string) => void;
  colors: ReviewColors;
}

export function StoreEditModal({
  visible,
  onClose,
  onSave,
  value,
  onChangeText,
  colors,
}: StoreEditModalProps) {
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
              {t('scan.editStore')}
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
              {t('scan.storeName')}
            </Text>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={t('scan.unknownStore')}
              placeholderTextColor={colors.textSecondary}
              className="px-4 py-3 rounded-xl text-base"
              style={{
                backgroundColor: colors.surface,
                color: colors.text,
                fontFamily: 'Inter_400Regular',
              }}
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
