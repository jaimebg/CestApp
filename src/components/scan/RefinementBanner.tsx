import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/src/hooks/useAppColors';
import type { RefinementStatus } from '@/src/hooks/useLlmRefinement';

interface Props {
  status: RefinementStatus;
  onUndo: () => void;
  onCompare: () => void;
  onDismiss: () => void;
}

export function RefinementBanner({ status, onUndo, onCompare, onDismiss }: Props) {
  const { t } = useTranslation();
  const colors = useAppColors();

  if (status === 'idle') return null;

  if (status === 'running') {
    return (
      <View className="flex-row items-center gap-2 px-4 py-2">
        <ActivityIndicator size="small" color={colors.textSecondary} />
        <Text
          className="text-sm"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
        >
          {t('scan.refinementRunning')}
        </Text>
      </View>
    );
  }

  const isApplied = status === 'applied';

  return (
    <View
      className="mx-4 my-2 flex-row items-center justify-between rounded-xl px-3 py-2"
      style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
    >
      <View className="flex-1 flex-row items-center gap-2">
        <Ionicons
          name={isApplied ? 'sparkles' : 'git-compare-outline'}
          size={16}
          color={colors.primary}
        />
        <Text className="text-sm" style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}>
          {isApplied ? t('scan.refinementApplied') : t('scan.refinementProposed')}
        </Text>
      </View>

      {isApplied ? (
        <Pressable onPress={onUndo} hitSlop={8}>
          <Text
            className="text-sm"
            style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('scan.refinementUndo')}
          </Text>
        </Pressable>
      ) : (
        <View className="flex-row gap-3">
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Text
              className="text-sm"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}
            >
              {t('scan.refinementDismiss')}
            </Text>
          </Pressable>
          <Pressable onPress={onCompare} hitSlop={8}>
            <Text
              className="text-sm"
              style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('scan.refinementCompare')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
