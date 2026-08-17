import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/src/hooks/useAppColors';

interface Props {
  dateLabel: string;
  totalLabel: string;
  onView: () => void;
}

/**
 * Warns that a receipt matching the one under review is already saved.
 *
 * Presentational: the caller formats the date and total so this stays free of
 * the preferences store. Saving is deliberately left enabled, since two real
 * trips to one shop on one day for the same amount also match.
 */
export function DuplicateBanner({ dateLabel, totalLabel, onView }: Props) {
  const { t } = useTranslation();
  const colors = useAppColors();

  return (
    <View
      className="mx-4 my-2 flex-row items-center justify-between rounded-xl px-3 py-2"
      style={{ backgroundColor: colors.surface, borderColor: colors.error, borderWidth: 1 }}
    >
      <View className="flex-1 flex-row items-center gap-2">
        <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
        <View className="flex-1">
          <Text className="text-sm" style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}>
            {t('scan.duplicateTitle')}
          </Text>
          <Text
            className="text-xs"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('scan.duplicateDetail', { date: dateLabel, total: totalLabel })}
          </Text>
        </View>
      </View>

      <Pressable onPress={onView} hitSlop={8}>
        <Text
          className="text-sm"
          style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('scan.duplicateView')}
        </Text>
      </Pressable>
    </View>
  );
}
