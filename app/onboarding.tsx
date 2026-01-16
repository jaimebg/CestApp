/**
 * Onboarding Screen
 * Collects user locale preferences on first launch
 */

import { View, Text, Pressable, ScrollView, Modal, FlatList, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  usePreferencesStore,
  DateFormat,
  DecimalSeparator,
  getInitialPreferences,
} from '@/src/store/preferences';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/src/i18n';
import { getSupportedCurrencies, Currency } from '@/src/config/currency';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const initialPrefs = getInitialPreferences();

  const [language, setLanguage] = useState<SupportedLanguage>(initialPrefs.language);
  const [currencyCode, setCurrencyCode] = useState(initialPrefs.currencyCode);
  const [dateFormat, setDateFormat] = useState<DateFormat>(initialPrefs.dateFormat);
  const [decimalSeparator, setDecimalSeparator] = useState<DecimalSeparator>(
    initialPrefs.decimalSeparator
  );
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const {
    setLanguage: saveLanguage,
    setCurrency: saveCurrency,
    setDateFormat: saveDateFormat,
    setDecimalSeparator: saveDecimalSeparator,
    completeOnboarding,
  } = usePreferencesStore();

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
    primary: '#93BD57',
    primaryDeep: '#3D6B23',
  };

  const currencies = getSupportedCurrencies();
  const selectedCurrency = currencies.find((c) => c.code === currencyCode) || currencies[0];

  const handleGetStarted = () => {
    saveLanguage(language);
    saveCurrency(currencyCode);
    saveDateFormat(dateFormat);
    saveDecimalSeparator(decimalSeparator);
    completeOnboarding();

    router.replace('/(tabs)');
  };

  const renderRadioOption = (
    selected: boolean,
    label: string,
    description: string,
    onPress: () => void
  ) => (
    <Pressable
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

  const renderCurrencyItem = ({ item }: { item: Currency }) => {
    const isSelected = item.code === currencyCode;
    return (
      <Pressable
        onPress={() => {
          setCurrencyCode(item.code);
          setShowCurrencyModal(false);
        }}
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderColor: colors.border }}
      >
        <View className="flex-1">
          <Text
            style={{
              color: colors.text,
              fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
              fontSize: 16,
            }}
          >
            {item.symbol} - {item.name}
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 14 }}
          >
            {item.code}
          </Text>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mt-8 mb-8">
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
            className="text-base text-center mt-2"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('onboarding.subtitle')}
          </Text>
        </View>

        {/* Language Section */}
        <View className="mb-6">
          <Text
            className="text-lg mb-1"
            style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('onboarding.language')}
          </Text>
          <Text
            className="text-sm mb-3"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('onboarding.languageDesc')}
          </Text>
          {SUPPORTED_LANGUAGES.map((lang) =>
            renderRadioOption(language === lang.code, lang.nativeName, lang.name, () =>
              setLanguage(lang.code as SupportedLanguage)
            )
          )}
        </View>

        {/* Currency Section */}
        <View className="mb-6">
          <Text
            className="text-lg mb-1"
            style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('onboarding.currency')}
          </Text>
          <Text
            className="text-sm mb-3"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('onboarding.currencyDesc')}
          </Text>
          <Pressable
            onPress={() => setShowCurrencyModal(true)}
            className="flex-row items-center justify-between p-4 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={22} color={colors.textSecondary} />
              <Text
                className="ml-3"
                style={{
                  color: colors.text,
                  fontFamily: 'Inter_500Medium',
                  fontSize: 16,
                }}
              >
                {selectedCurrency.symbol} - {selectedCurrency.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Date Format Section */}
        <View className="mb-6">
          <Text
            className="text-lg mb-1"
            style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('onboarding.dateFormat')}
          </Text>
          <Text
            className="text-sm mb-3"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('onboarding.dateFormatDesc')}
          </Text>
          {renderRadioOption(dateFormat === 'DMY', t('onboarding.dmy'), '31/12/2024', () =>
            setDateFormat('DMY')
          )}
          {renderRadioOption(dateFormat === 'MDY', t('onboarding.mdy'), '12/31/2024', () =>
            setDateFormat('MDY')
          )}
        </View>

        {/* Number Format Section */}
        <View className="mb-6">
          <Text
            className="text-lg mb-1"
            style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
          >
            {t('onboarding.numberFormat')}
          </Text>
          <Text
            className="text-sm mb-3"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('onboarding.numberFormatDesc')}
          </Text>
          {renderRadioOption(
            decimalSeparator === '.',
            t('onboarding.decimalDot'),
            '$1,234.56',
            () => setDecimalSeparator('.')
          )}
          {renderRadioOption(
            decimalSeparator === ',',
            t('onboarding.decimalComma'),
            '1.234,56 EUR',
            () => setDecimalSeparator(',')
          )}
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

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          <View
            className="flex-row items-center justify-between px-4 py-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <Pressable onPress={() => setShowCurrencyModal(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text
              className="text-lg"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('onboarding.currency')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={currencies}
            keyExtractor={(item) => item.code}
            renderItem={renderCurrencyItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>
    </View>
  );
}
