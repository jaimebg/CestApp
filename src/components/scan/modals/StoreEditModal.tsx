/**
 * Modal for editing the store name
 */

import { View, Text, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ModalHeader } from '../../ui/ModalHeader';
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
          <ModalHeader
            title={t('scan.editStore')}
            onClose={onClose}
            closeLabel={t('common.cancel')}
            confirmLabel={t('common.save')}
            onConfirm={onSave}
          />

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
