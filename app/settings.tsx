/**
 * Settings Screen
 * Simplified: Only language selection
 * Spanish defaults for currency, date format, and number format
 */

import { View, Text, Pressable, ScrollView, Modal, useColorScheme } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { usePreferencesStore } from '@/src/store/preferences';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/src/i18n';

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

  const { language, setLanguage } = usePreferencesStore();

  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
    primary: '#93BD57',
    primaryDeep: '#3D6B23',
  };

  const languageOptions = SUPPORTED_LANGUAGES.map((lang) => ({
    key: lang.code,
    label: lang.nativeName,
    description: lang.name,
  }));

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
        {/* Language Section */}
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

        {/* Spanish Defaults Info */}
        <View
          className="p-4 rounded-xl mb-3"
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
                {t('settings.spanishDefaults')}
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('settings.spanishDefaultsDesc')}
              </Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <Text
          className="text-sm uppercase tracking-wide mb-3 mt-6"
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
    </SafeAreaView>
  );
}
