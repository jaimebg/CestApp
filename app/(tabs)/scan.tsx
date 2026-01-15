import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 px-6 pt-4">
        <Text className="text-3xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
          Scan Receipt
        </Text>
        <Text className="text-base text-text-secondary dark:text-text-dark-secondary mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
          Choose how to add your receipt
        </Text>

        <View className="flex-1 justify-center gap-4">
          {/* Primary action - dark green bg with white text for good contrast */}
          <Pressable className="bg-primary-deep rounded-2xl p-6 flex-row items-center active:bg-primary-dark">
            <View className="bg-white/20 rounded-full p-3 mr-4">
              <Ionicons name="camera-outline" size={28} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                Take Photo
              </Text>
              <Text className="text-white/80 text-sm mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
                Capture a receipt with your camera
              </Text>
            </View>
          </Pressable>

          {/* Secondary actions - light bg with dark text */}
          <Pressable className="bg-surface dark:bg-surface-dark rounded-2xl p-6 flex-row items-center border border-border dark:border-border-dark active:bg-border dark:active:bg-border-dark">
            <View className="bg-primary/20 rounded-full p-3 mr-4">
              <Ionicons name="images-outline" size={28} color="#3D6B23" />
            </View>
            <View className="flex-1">
              <Text className="text-text dark:text-text-dark text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                From Gallery
              </Text>
              <Text className="text-text-secondary dark:text-text-dark-secondary text-sm mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
                Select an existing photo
              </Text>
            </View>
          </Pressable>

          <Pressable className="bg-surface dark:bg-surface-dark rounded-2xl p-6 flex-row items-center border border-border dark:border-border-dark active:bg-border dark:active:bg-border-dark">
            <View className="bg-primary/20 rounded-full p-3 mr-4">
              <Ionicons name="document-outline" size={28} color="#3D6B23" />
            </View>
            <View className="flex-1">
              <Text className="text-text dark:text-text-dark text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
                Import PDF
              </Text>
              <Text className="text-text-secondary dark:text-text-dark-secondary text-sm mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
                Upload a PDF receipt
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
