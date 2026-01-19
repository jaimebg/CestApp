import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { type ZoneType, ZONE_COLORS, ZONE_LABELS } from '../../types/zones';

type ToolMode = 'draw' | 'select' | 'delete';

interface ZoneSelectionToolbarProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  activeZoneType: ZoneType;
  onZoneTypePress: () => void;
  onSave: () => void;
  onCancel: () => void;
  canSave: boolean;
}

export function ZoneSelectionToolbar({
  mode,
  onModeChange,
  activeZoneType,
  onZoneTypePress,
  onSave,
  onCancel,
  canSave,
}: ZoneSelectionToolbarProps) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';

  const tools: { id: ToolMode; icon: string; label: string }[] = [
    {
      id: 'draw',
      icon: 'edit-3',
      label: lang === 'es' ? 'Dibujar' : 'Draw',
    },
    {
      id: 'select',
      icon: 'mouse-pointer',
      label: lang === 'es' ? 'Seleccionar' : 'Select',
    },
    {
      id: 'delete',
      icon: 'trash-2',
      label: lang === 'es' ? 'Eliminar' : 'Delete',
    },
  ];

  return (
    <View className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark">
      <View className="flex-row justify-around py-3 px-4">
        {tools.map((tool) => (
          <Pressable
            key={tool.id}
            onPress={() => onModeChange(tool.id)}
            className={`items-center px-4 py-2 rounded-xl ${
              mode === tool.id ? 'bg-primary-deep' : 'bg-background dark:bg-background-dark'
            }`}
          >
            <Feather
              name={tool.icon as any}
              size={20}
              color={mode === tool.id ? '#FFFFFF' : '#666666'}
            />
            <Text
              className={`text-xs mt-1 ${
                mode === tool.id
                  ? 'text-white'
                  : 'text-text-secondary dark:text-text-secondary-dark'
              }`}
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {tool.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onZoneTypePress}
        className="flex-row items-center justify-between mx-4 mb-3 p-3 rounded-xl bg-background dark:bg-background-dark border border-border dark:border-border-dark"
      >
        <View className="flex-row items-center">
          <View
            style={{ backgroundColor: ZONE_COLORS[activeZoneType] }}
            className="w-6 h-6 rounded-full mr-3"
          />
          <Text className="text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
            {lang === 'es' ? 'Dibujando: ' : 'Drawing: '}
            {ZONE_LABELS[activeZoneType][lang]}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color="#666666" />
      </Pressable>

      <View className="flex-row px-4 pb-4 gap-3">
        <Pressable
          onPress={onCancel}
          className="flex-1 py-3 rounded-xl border border-border dark:border-border-dark items-center"
        >
          <Text
            className="text-text-secondary dark:text-text-secondary-dark"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {t('common.cancel')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={!canSave}
          className={`flex-1 py-3 rounded-xl items-center ${
            canSave ? 'bg-primary-deep' : 'bg-border dark:bg-border-dark'
          }`}
        >
          <Text
            className={canSave ? 'text-white' : 'text-text-secondary'}
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {t('common.save')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
