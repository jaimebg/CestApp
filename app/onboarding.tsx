/**
 * Single-screen onboarding with language and appearance selection
 */

import { View, Text, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePreferencesStore, type ColorScheme } from '@/src/store/preferences';
import { useAppColors } from '@/src/hooks/useAppColors';
import type { SupportedLanguage } from '@/src/i18n';

type FeatureItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primaryColor: string;
  textColor: string;
};

function FeatureItem({
  icon,
  label,
  primaryColor,
  textColor,
  align,
}: FeatureItemProps & { align: 'left' | 'right' }) {
  return (
    <View
      className={`flex-row items-center py-2 px-3 ${align === 'left' ? 'justify-end' : 'justify-start'}`}
      style={{ width: '50%' }}
    >
      <Ionicons name={icon} size={18} color={primaryColor} />
      <Text className="text-sm ml-2" style={{ color: textColor, fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
    </View>
  );
}

type SegmentedControlProps = {
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  colors: {
    surface: string;
    border: string;
    primary: string;
    textSecondary: string;
  };
};

function SegmentedControl({ options, selectedValue, onSelect, colors }: SegmentedControlProps) {
  return (
    <View
      className="flex-row rounded-xl p-1"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <Pressable
            key={option.value}
            className="flex-1 items-center justify-center rounded-lg py-2.5"
            style={isSelected ? { backgroundColor: colors.primary } : undefined}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={{
                color: isSelected ? '#FFFFFF' : colors.textSecondary,
                fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                fontSize: 14,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useAppColors();

  const { language, setLanguage, colorScheme, setColorScheme, completeOnboarding } =
    usePreferencesStore();

  const handleGetStarted = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const features = [
    { icon: 'scan-outline' as const, labelKey: 'onboarding.features.scan.short' },
    { icon: 'list-outline' as const, labelKey: 'onboarding.features.track.short' },
    { icon: 'bar-chart-outline' as const, labelKey: 'onboarding.features.analytics.short' },
    { icon: 'shield-checkmark-outline' as const, labelKey: 'onboarding.features.privacy.short' },
  ];

  const languageOptions = [
    { value: 'en', label: 'EN' },
    { value: 'es', label: 'ES' },
  ];

  const appearanceOptions = [
    { value: 'light', label: t('onboarding.light') },
    { value: 'dark', label: t('onboarding.dark') },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-1 px-6 justify-center">
        <View className="items-center mb-6">
          <Image
            source={require('@/assets/images/cestapp-logo.png')}
            className="w-20 h-20 mb-4 overflow-hidden"
            style={{ borderRadius: 18 }}
            resizeMode="cover"
          />
          <Text
            className="text-3xl text-center"
            style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}
          >
            {t('onboarding.welcome')}
          </Text>
          <Text
            className="text-base text-center mt-2 px-4"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('onboarding.features.subtitle')}
          </Text>
        </View>

        <View className="mb-8">
          <View className="flex-row">
            <FeatureItem
              icon={features[0].icon}
              label={t(features[0].labelKey)}
              primaryColor={colors.primary}
              textColor={colors.textSecondary}
              align="left"
            />
            <FeatureItem
              icon={features[1].icon}
              label={t(features[1].labelKey)}
              primaryColor={colors.primary}
              textColor={colors.textSecondary}
              align="right"
            />
          </View>
          <View className="flex-row -mt-1">
            <FeatureItem
              icon={features[2].icon}
              label={t(features[2].labelKey)}
              primaryColor={colors.primary}
              textColor={colors.textSecondary}
              align="left"
            />
            <FeatureItem
              icon={features[3].icon}
              label={t(features[3].labelKey)}
              primaryColor={colors.primary}
              textColor={colors.textSecondary}
              align="right"
            />
          </View>
        </View>

        <View className="mb-5">
          <Text
            className="text-sm mb-2 ml-1"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('onboarding.language')}
          </Text>
          <SegmentedControl
            options={languageOptions}
            selectedValue={language}
            onSelect={(value) => setLanguage(value as SupportedLanguage)}
            colors={colors}
          />
        </View>

        <View className="mb-6">
          <Text
            className="text-sm mb-2 ml-1"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('onboarding.appearance')}
          </Text>
          <SegmentedControl
            options={appearanceOptions}
            selectedValue={colorScheme}
            onSelect={(value) => setColorScheme(value as ColorScheme)}
            colors={colors}
          />
        </View>
      </View>

      <View className="px-6 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleGetStarted}
          className="rounded-2xl py-4 items-center"
          style={{ backgroundColor: colors.primaryDeep }}
        >
          <Text className="text-white text-lg" style={{ fontFamily: 'Inter_600SemiBold' }}>
            {t('onboarding.getStarted')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
