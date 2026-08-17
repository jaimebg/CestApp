/**
 * The header bar every full-screen modal in the app shares.
 *
 * Previously rebuilt in nine places with three different spacer widths, so
 * titles sat off-centre by different amounts from screen to screen. Balancing
 * with `flex-1` side slots instead of a magic-number spacer keeps the title
 * centred whatever the actions are.
 */

import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '@/src/hooks/useAppColors';
import { ICON_HIT_SLOP, MIN_TARGET } from '@/src/theme/a11y';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  /** Text for the dismiss control. Omit for an X icon. */
  closeLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
}

export function ModalHeader({
  title,
  onClose,
  closeLabel,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
}: ModalHeaderProps) {
  const { t } = useTranslation();
  const colors = useAppColors();

  return (
    <View
      className="flex-row items-center px-4 py-3 border-b"
      style={{ borderColor: colors.border, minHeight: MIN_TARGET + 12 }}
    >
      <View className="flex-1 items-start">
        <Pressable
          onPress={onClose}
          hitSlop={ICON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={closeLabel ?? t('common.close')}
          style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
        >
          {closeLabel ? (
            <Text style={{ color: colors.action, fontFamily: 'Inter_500Medium', fontSize: 16 }}>
              {closeLabel}
            </Text>
          ) : (
            <Ionicons name="close" size={24} color={colors.text} />
          )}
        </Pressable>
      </View>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        className="text-lg flex-[2] text-center"
        style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
      >
        {title}
      </Text>

      <View className="flex-1 items-end">
        {confirmLabel && onConfirm ? (
          <Pressable
            onPress={onConfirm}
            disabled={confirmDisabled}
            hitSlop={ICON_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            accessibilityState={{ disabled: confirmDisabled }}
            style={{
              minHeight: MIN_TARGET,
              justifyContent: 'center',
              opacity: confirmDisabled ? 0.5 : 1,
            }}
          >
            <Text style={{ color: colors.action, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>
              {confirmLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
