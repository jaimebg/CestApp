/**
 * Modal for editing the receipt date and time
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

interface DateEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  day: string;
  month: string;
  year: string;
  time: string;
  onChangeDay: (value: string) => void;
  onChangeMonth: (value: string) => void;
  onChangeYear: (value: string) => void;
  onChangeTime: (value: string) => void;
  dateFormat: string;
  colors: ReviewColors;
}

export function DateEditModal({
  visible,
  onClose,
  onSave,
  day,
  month,
  year,
  time,
  onChangeDay,
  onChangeMonth,
  onChangeYear,
  onChangeTime,
  dateFormat,
  colors,
}: DateEditModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const monthFirst = dateFormat === 'MDY';

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
              {t('scan.editDate')}
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
              {t('receipt.date')}
            </Text>

            <View className="flex-row gap-2 mb-4">
              <View className="flex-1">
                <Text
                  className="text-xs mb-1"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                >
                  {monthFirst ? t('scan.month') : t('scan.day')}
                </Text>
                <TextInput
                  value={monthFirst ? month : day}
                  onChangeText={monthFirst ? onChangeMonth : onChangeDay}
                  placeholder={monthFirst ? 'MM' : 'DD'}
                  placeholderTextColor={colors.textSecondary}
                  className="px-4 py-3 rounded-xl text-base text-center"
                  style={inputStyle}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xs mb-1"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                >
                  {monthFirst ? t('scan.day') : t('scan.month')}
                </Text>
                <TextInput
                  value={monthFirst ? day : month}
                  onChangeText={monthFirst ? onChangeDay : onChangeMonth}
                  placeholder={monthFirst ? 'DD' : 'MM'}
                  placeholderTextColor={colors.textSecondary}
                  className="px-4 py-3 rounded-xl text-base text-center"
                  style={inputStyle}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xs mb-1"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                >
                  {t('scan.year')}
                </Text>
                <TextInput
                  value={year}
                  onChangeText={onChangeYear}
                  placeholder="YYYY"
                  placeholderTextColor={colors.textSecondary}
                  className="px-4 py-3 rounded-xl text-base text-center"
                  style={inputStyle}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>

            <Text
              className="text-sm mb-2"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
            >
              {t('scan.time')}
            </Text>
            <TextInput
              value={time}
              onChangeText={onChangeTime}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
              className="px-4 py-3 rounded-xl text-base"
              style={inputStyle}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
