import { Tabs } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { usePreferencesStore } from '@/src/store/preferences';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';

export default function TabLayout() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Font scaling is (correctly) left enabled app-wide, so a constant 60pt bar
  // clipped its label at the larger accessibility text sizes. `useWindowDimensions`
  // (unlike `PixelRatio.getFontScale()`) is reactive, so the bar resizes if the
  // user changes Dynamic Type while the app is open, not just on next launch.
  // Cap the multiplier so the label cannot outgrow the bar it sits in.
  const { fontScale: rawFontScale } = useWindowDimensions();
  const fontScale = Math.min(rawFontScale, 1.6);
  const barHeight = Math.round(60 * fontScale);
  const hasCompletedOnboarding = usePreferencesStore((state) => state.hasCompletedOnboarding);

  if (!hasCompletedOnboarding) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: barHeight + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 12,
          marginTop: 4,
        },
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabs.scan'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('tabs.analytics'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
