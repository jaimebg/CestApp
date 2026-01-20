/**
 * Onboarding Preferences Screen
 * Simplified: Only language selection (Spanish defaults for everything else)
 */

import { View, Text, Pressable, ScrollView, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePreferencesStore } from '@/src/store/preferences';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/src/i18n';

export default function OnboardingPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Use language directly from store so changes are reflected immediately
  const { language, setLanguage, completeOnboarding } = usePreferencesStore();

  // Handle language selection - changes language immediately
  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang); // This calls i18n.changeLanguage internally
  };

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
    primary: '#93BD57',
    primaryDeep: '#3D6B23',
  };

  const handleGetStarted = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const renderRadioOption = (
    key: string,
    selected: boolean,
    label: string,
    description: string,
    onPress: () => void
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      className="flex-row items-center p-4 rounded-xl mb-2"
      style={{
        backgroundColor: selected ? `${colors.primary}15` : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
      }}
    >
      <View
        className="w-6 h-6 rounded-full border-2 items-center justify-center mr-3"
        style={{ borderColor: selected ? colors.primary : colors.border }}
      >
        {selected && (
          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
        )}
      </View>
      <View className="flex-1">
        <Text
          style={{
            color: colors.text,
            fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_500Medium',
            fontSize: 16,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            marginTop: 2,
          }}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mt-6 mb-8">
          <View
            className="w-14 h-14 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Ionicons name="language-outline" size={28} color={colors.primary} />
          </View>
          <Text
            className="text-2xl text-center"
            style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}
          >
            {t('onboarding.preferencesTitle')}
          </Text>
          <Text
            className="text-base text-center mt-2"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('onboarding.languageDesc')}
          </Text>
        </View>

        {/* Language Section */}
        <View className="mb-6">
          <Text
            className="text-lg mb-3"
            style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('onboarding.language')}
          </Text>
          {SUPPORTED_LANGUAGES.map((lang) =>
            renderRadioOption(lang.code, language === lang.code, lang.nativeName, lang.name, () =>
              handleLanguageChange(lang.code as SupportedLanguage)
            )
          )}
        </View>

        {/* Info Card */}
        <View
          className="p-4 rounded-xl mt-4"
          style={{
            backgroundColor: `${colors.primary}10`,
            borderWidth: 1,
            borderColor: `${colors.primary}30`,
          }}
        >
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <View className="flex-1 ml-2">
              <Text
                className="text-sm"
                style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
              >
                {t('onboarding.spanishDefaults')}
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('onboarding.spanishDefaultsDesc')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Get Started Button */}
      <View
        className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-4"
        style={{
          backgroundColor: colors.background,
          paddingBottom: insets.bottom + 16,
        }}
      >
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
