/**
 * Single-screen onboarding with language and appearance selection
 */

import { View, Text, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
import { useFormatPrice, usePreferencesStore, type ColorScheme } from '@/src/store/preferences';
import { Button } from '@/src/components/ui/Button';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { Ticket } from '@/src/components/receipt/Ticket';
import { TicketLine, TicketRule } from '@/src/components/receipt/TicketLine';
import { fonts } from '@/src/theme/type';
import { useAppColors } from '@/src/hooks/useAppColors';
import type { SupportedLanguage } from '@/src/i18n';

const SAMPLE_LINES = [
  { key: 'bread', amount: 1.2 },
  { key: 'tomatoes', amount: 2.35 },
  { key: 'olive', amount: 8.99 },
] as const;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useAppColors();
  const { formatPrice } = useFormatPrice();

  const { language, setLanguage, colorScheme, setColorScheme, completeOnboarding } =
    usePreferencesStore();

  const handleGetStarted = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const languageOptions: { value: SupportedLanguage; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'es', label: 'ES' },
  ];

  const appearanceOptions: { value: ColorScheme; label: string }[] = [
    { value: 'light', label: t('onboarding.light') },
    { value: 'dark', label: t('onboarding.dark') },
  ];

  const sampleTotal = SAMPLE_LINES.reduce((sum, line) => sum + line.amount, 0);
  const label = { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView
        testID="onboarding-scroll"
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <ReadingColumn className="px-6">
          <View className="items-center mb-6">
            <Image
              source={require('@/assets/images/cestapp-logo.png')}
              className="w-20 h-20 mb-4 overflow-hidden"
              style={{ borderRadius: 18 }}
              resizeMode="cover"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text
              className="text-center"
              style={{
                color: colors.text,
                fontFamily: fonts.semibold,
                fontSize: 28,
                lineHeight: 34,
              }}
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

          <View
            className="mb-8 self-center w-full"
            style={{ maxWidth: 280 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Ticket header={{ title: t('onboarding.sampleStore'), lines: [] }}>
              {SAMPLE_LINES.map((line) => (
                <TicketLine
                  key={line.key}
                  label={t(`onboarding.sample.${line.key}`)}
                  amount={formatPrice(line.amount)}
                />
              ))}
              <TicketRule />
              <TicketLine
                variant="total"
                label={t('receipt.total')}
                amount={formatPrice(sampleTotal)}
              />
            </Ticket>
          </View>

          <View className="mb-5">
            <Text className="mb-2 ml-1" style={label}>
              {t('onboarding.language')}
            </Text>
            <SegmentedControl
              options={languageOptions}
              value={language as SupportedLanguage}
              onChange={setLanguage}
              accessibilityLabel={t('onboarding.language')}
            />
          </View>

          <View className="mb-6">
            <Text className="mb-2 ml-1" style={label}>
              {t('onboarding.appearance')}
            </Text>
            <SegmentedControl
              options={appearanceOptions}
              value={colorScheme}
              onChange={setColorScheme}
              accessibilityLabel={t('onboarding.appearance')}
            />
          </View>
        </ReadingColumn>
      </ScrollView>

      <ReadingColumn className="px-6 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button size="lg" onPress={handleGetStarted}>
          {t('onboarding.getStarted')}
        </Button>
      </ReadingColumn>
    </View>
  );
}
