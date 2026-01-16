import { View, Text, Pressable, Modal } from 'react-native';
import { useColorScheme } from 'react-native';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false,
}: ConfirmationModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
    primary: '#93BD57',
    error: isDark ? '#C94444' : '#980404',
    overlay: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-center items-center px-6">
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: colors.overlay }}
          onPress={onCancel}
        />
        <View
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            backgroundColor: colors.background,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="p-6">
            <Text
              className="text-lg text-center mb-2"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {title}
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
            >
              {message}
            </Text>
          </View>

          <View
            className="flex-row border-t"
            style={{ borderColor: colors.border }}
          >
            <Pressable
              onPress={onCancel}
              disabled={isLoading}
              className="flex-1 py-4 items-center justify-center border-r active:opacity-70"
              style={{ borderColor: colors.border, opacity: isLoading ? 0.5 : 1 }}
            >
              <Text
                className="text-base"
                style={{ color: colors.primary, fontFamily: 'Inter_500Medium' }}
              >
                {cancelText}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              className="flex-1 py-4 items-center justify-center active:opacity-70"
              style={{ opacity: isLoading ? 0.5 : 1 }}
            >
              <Text
                className="text-base"
                style={{
                  color: isDestructive ? colors.error : colors.primary,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
