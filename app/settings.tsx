/**
 * Settings Screen
 * Allows users to change app preferences
 */

import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  FlatList,
  useColorScheme,
  Alert,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { usePreferencesStore, DateFormat, DecimalSeparator } from '@/src/store/preferences';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/src/i18n';
import { getSupportedCurrencies, Currency } from '@/src/config/currency';
import {
  getAllTemplatesWithStoreNames,
  deleteTemplate,
} from '@/src/db/queries/storeParsingTemplates';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import type { ZoneDefinition } from '@/src/types/zones';

type TemplateWithStore = {
  id: number;
  storeId: number;
  storeName: string;
  zones: ZoneDefinition[];
  confidence: number;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type SettingItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  colors: {
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
};

function SettingItem({ icon, label, value, onPress, colors }: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between p-4 rounded-xl mb-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center flex-1">
        <Ionicons name={icon} size={22} color={colors.textSecondary} />
        <Text
          className="text-base ml-3"
          style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Text
          className="text-base mr-2"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
        >
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

type OptionModalProps = {
  visible: boolean;
  title: string;
  options: { key: string; label: string; description?: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
};

function OptionModal({
  visible,
  title,
  options,
  selectedKey,
  onSelect,
  onClose,
  colors,
}: OptionModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
        edges={['bottom']}
      >
        <View
          className="flex-row items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text className="text-lg" style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
            {title}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView className="flex-1 p-4">
          {options.map((option) => {
            const isSelected = option.key === selectedKey;
            return (
              <Pressable
                key={option.key}
                onPress={() => {
                  onSelect(option.key);
                  onClose();
                }}
                className="flex-row items-center p-4 rounded-xl mb-2"
                style={{
                  backgroundColor: isSelected ? `${colors.primary}15` : colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primary : colors.border,
                }}
              >
                <View
                  className="w-6 h-6 rounded-full border-2 items-center justify-center mr-3"
                  style={{ borderColor: isSelected ? colors.primary : colors.border }}
                >
                  {isSelected && (
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                      fontSize: 16,
                    }}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontFamily: 'Inter_400Regular',
                        fontSize: 13,
                        marginTop: 2,
                      }}
                    >
                      {option.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    language,
    currency,
    dateFormat,
    decimalSeparator,
    setLanguage,
    setCurrency,
    setDateFormat,
    setDecimalSeparator,
  } = usePreferencesStore();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<TemplateWithStore[]>([]);

  // Load templates when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplates = async () => {
    try {
      const result = await getAllTemplatesWithStoreNames();
      setTemplates(result);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleDeleteTemplate = (storeId: number, storeName: string) => {
    Alert.alert(
      t('settings.deleteTemplate'),
      t('settings.deleteTemplateConfirm', { store: storeName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate(storeId);
              await loadTemplates();
              showSuccessToast(t('common.success'), t('scan.templateDeleted'));
            } catch (error) {
              console.error('Error deleting template:', error);
              showErrorToast(t('common.error'), t('errors.deleteFailed'));
            }
          },
        },
      ]
    );
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

  const currencies = getSupportedCurrencies();

  const languageOptions = SUPPORTED_LANGUAGES.map((lang) => ({
    key: lang.code,
    label: lang.nativeName,
    description: lang.name,
  }));

  const currencyOptions = currencies.map((c) => ({
    key: c.code,
    label: `${c.symbol} - ${c.name}`,
    description: c.code,
  }));

  const dateOptions = [
    { key: 'DMY', label: t('onboarding.dmy'), description: '31/12/2024' },
    { key: 'MDY', label: t('onboarding.mdy'), description: '12/31/2024' },
  ];

  const numberOptions = [
    { key: '.', label: t('onboarding.decimalDot'), description: '$1,234.56' },
    { key: ',', label: t('onboarding.decimalComma'), description: '1.234,56 EUR' },
  ];

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.surface }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <Text
          className="text-xl ml-4"
          style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences Section */}
        <Text
          className="text-sm uppercase tracking-wide mb-3 mt-4"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('settings.preferences')}
        </Text>

        <SettingItem
          icon="language-outline"
          label={t('settings.language')}
          value={currentLanguage?.nativeName || language}
          onPress={() => setShowLanguageModal(true)}
          colors={colors}
        />

        <SettingItem
          icon="cash-outline"
          label={t('settings.currency')}
          value={`${currency.symbol} ${currency.code}`}
          onPress={() => setShowCurrencyModal(true)}
          colors={colors}
        />

        <SettingItem
          icon="calendar-outline"
          label={t('settings.dateFormat')}
          value={dateFormat}
          onPress={() => setShowDateModal(true)}
          colors={colors}
        />

        <SettingItem
          icon="calculator-outline"
          label={t('settings.numberFormat')}
          value={decimalSeparator === '.' ? '1,234.56' : '1.234,56'}
          onPress={() => setShowNumberModal(true)}
          colors={colors}
        />

        {/* Templates Section */}
        <Text
          className="text-sm uppercase tracking-wide mb-3 mt-8"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('settings.parsingTemplates')}
        </Text>

        <Pressable
          onPress={() => setShowTemplatesModal(true)}
          className="flex-row items-center justify-between p-4 rounded-xl mb-3"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons name="grid-outline" size={22} color={colors.textSecondary} />
            <View className="ml-3 flex-1">
              <Text
                className="text-base"
                style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
              >
                {t('settings.manageTemplates')}
              </Text>
              <Text
                className="text-sm mt-0.5"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {templates.length === 0
                  ? t('settings.noTemplates')
                  : t('settings.templatesCount', { count: templates.length })}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>

        {/* About Section */}
        <Text
          className="text-sm uppercase tracking-wide mb-3 mt-8"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('settings.about')}
        </Text>

        <View
          className="p-4 rounded-xl"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text
              className="text-base"
              style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
            >
              {t('settings.version')}
            </Text>
            <Text
              className="text-base"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
            >
              1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Modal */}
      <OptionModal
        visible={showLanguageModal}
        title={t('settings.language')}
        options={languageOptions}
        selectedKey={language}
        onSelect={(key) => setLanguage(key as SupportedLanguage)}
        onClose={() => setShowLanguageModal(false)}
        colors={colors}
      />

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <SafeAreaView
          className="flex-1"
          style={{ backgroundColor: colors.background }}
          edges={['bottom']}
        >
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
              {t('settings.currency')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={currencies}
            keyExtractor={(item) => item.code}
            renderItem={({ item }: { item: Currency }) => {
              const isSelected = item.code === currency.code;
              return (
                <Pressable
                  onPress={() => {
                    setCurrency(item.code);
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
                      style={{
                        color: colors.textSecondary,
                        fontFamily: 'Inter_400Regular',
                        fontSize: 14,
                      }}
                    >
                      {item.code}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </SafeAreaView>
      </Modal>

      {/* Date Format Modal */}
      <OptionModal
        visible={showDateModal}
        title={t('settings.dateFormat')}
        options={dateOptions}
        selectedKey={dateFormat}
        onSelect={(key) => setDateFormat(key as DateFormat)}
        onClose={() => setShowDateModal(false)}
        colors={colors}
      />

      {/* Number Format Modal */}
      <OptionModal
        visible={showNumberModal}
        title={t('settings.numberFormat')}
        options={numberOptions}
        selectedKey={decimalSeparator}
        onSelect={(key) => setDecimalSeparator(key as DecimalSeparator)}
        onClose={() => setShowNumberModal(false)}
        colors={colors}
      />

      {/* Templates Modal */}
      <Modal
        visible={showTemplatesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTemplatesModal(false)}
      >
        <SafeAreaView
          className="flex-1"
          style={{ backgroundColor: colors.background }}
          edges={['bottom']}
        >
          <View
            className="flex-row items-center justify-between px-4 py-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <Pressable onPress={() => setShowTemplatesModal(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text
              className="text-lg"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('settings.parsingTemplates')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {templates.length === 0 ? (
            <View className="flex-1 justify-center items-center p-8">
              <Ionicons name="grid-outline" size={48} color={colors.textSecondary} />
              <Text
                className="text-base text-center mt-4"
                style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
              >
                {t('settings.noTemplates')}
              </Text>
              <Text
                className="text-sm text-center mt-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('settings.noTemplatesDesc')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View
                  className="flex-row items-center px-4 py-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <View className="flex-1">
                    <Text
                      className="text-base"
                      style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
                    >
                      {item.storeName}
                    </Text>
                    <Text
                      className="text-sm mt-0.5"
                      style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                    >
                      {item.zones.length} {item.zones.length === 1 ? 'zone' : 'zones'} •{' '}
                      {t('settings.confidence')}: {item.confidence}%
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteTemplate(item.storeId, item.storeName)}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.primary + '15' }}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.primaryDeep} />
                  </Pressable>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
