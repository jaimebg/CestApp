import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { type ZoneType, ZONE_COLORS, ZONE_ICONS, ZONE_LABELS } from '../../types/zones';

interface ZoneTypePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: ZoneType) => void;
  currentType: ZoneType;
}

const ZONE_TYPES: ZoneType[] = [
  'product_names',
  'prices',
  'quantities',
  'total',
  'subtotal',
  'tax',
  'date',
  'store_name',
];

export function ZoneTypePicker({ visible, onClose, onSelect, currentType }: ZoneTypePickerProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';

  const handleSelect = (type: ZoneType) => {
    onSelect(type);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          className="bg-background dark:bg-background-dark rounded-t-3xl max-h-[70%]"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center py-3">
            <View className="w-10 h-1 bg-border dark:bg-border-dark rounded-full" />
          </View>

          <Text
            className="text-lg text-text dark:text-text-dark text-center mb-4"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {lang === 'es' ? 'Seleccionar Tipo de Zona' : 'Select Zone Type'}
          </Text>

          <ScrollView className="px-4 pb-8">
            {ZONE_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => handleSelect(type)}
                className={`flex-row items-center p-4 mb-2 rounded-xl border ${
                  currentType === type
                    ? 'border-primary-deep bg-primary/10'
                    : 'border-border dark:border-border-dark'
                }`}
              >
                <View
                  style={{ backgroundColor: ZONE_COLORS[type] }}
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                >
                  <Feather name={ZONE_ICONS[type] as any} size={20} color="white" />
                </View>

                <View className="flex-1">
                  <Text
                    className="text-text dark:text-text-dark text-base"
                    style={{ fontFamily: 'Inter_600SemiBold' }}
                  >
                    {ZONE_LABELS[type][lang]}
                  </Text>
                </View>

                {currentType === type && <Feather name="check" size={24} color="#3D6B23" />}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
