/**
 * Onboarding Features Screen
 * Introduces app features before collecting preferences
 */

import { View, Text, Pressable, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type FeatureItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: {
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
  };
};

function FeatureItem({ icon, title, description, colors }: FeatureItemProps) {
  return (
    <View
      className="flex-row items-start p-4 rounded-2xl mb-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: `${colors.primary}20` }}
      >
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text
          className="text-base mb-1"
          style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
        >
          {title}
        </Text>
        <Text
          className="text-sm leading-5"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function OnboardingFeaturesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
    primary: '#93BD57',
    primaryDeep: '#3D6B23',
  };

  const features = [
    {
      icon: 'scan-outline' as const,
      titleKey: 'onboarding.features.scan.title',
      descKey: 'onboarding.features.scan.desc',
    },
    {
      icon: 'list-outline' as const,
      titleKey: 'onboarding.features.track.title',
      descKey: 'onboarding.features.track.desc',
    },
    {
      icon: 'bar-chart-outline' as const,
      titleKey: 'onboarding.features.analytics.title',
      descKey: 'onboarding.features.analytics.desc',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      titleKey: 'onboarding.features.privacy.title',
      descKey: 'onboarding.features.privacy.desc',
    },
  ];

  const handleContinue = () => {
    router.push('/onboarding/preferences');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="items-center mt-8 mb-6">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.primaryDeep }}
          >
            <Ionicons name="receipt-outline" size={40} color="#FFFFFF" />
          </View>
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

        {/* Features List */}
        <View className="flex-1 justify-center pb-4">
          {features.map((feature, index) => (
            <FeatureItem
              key={index}
              icon={feature.icon}
              title={t(feature.titleKey)}
              description={t(feature.descKey)}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* Continue Button */}
      <View
        className="px-6 pb-8 pt-4"
        style={{
          backgroundColor: colors.background,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <Pressable
          onPress={handleContinue}
          className="rounded-2xl py-4 flex-row items-center justify-center"
          style={{ backgroundColor: colors.primaryDeep }}
        >
          <Text className="text-white text-lg mr-2" style={{ fontFamily: 'Inter_600SemiBold' }}>
            {t('onboarding.continue')}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
