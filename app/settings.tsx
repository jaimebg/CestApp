/**
 * Settings Screen
 * Simplified: Only language selection
 * Spanish defaults for currency, date format, and number format
 */

import { View, Text, Pressable, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { usePreferencesStore } from '@/src/store/preferences';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/src/i18n';
import { seedDemoData, clearAllData } from '@/src/db/demoData';
import { useReceiptsStore } from '@/src/store/receipts';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import { useIsDarkMode } from '@/src/hooks/useAppColors';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useIsDarkMode();

  const { language, setLanguage, colorScheme, setColorScheme } = usePreferencesStore();
  const invalidateCache = useReceiptsStore((s) => s.invalidateCache);

  const [showDevMenu, setShowDevMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 500) {
      tapCountRef.current = 0;
    }
    lastTapRef.current = now;
    tapCountRef.current++;

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setShowDevMenu(true);
    }
  };

  const handleSeedDemoData = async () => {
    setIsLoading(true);
    try {
      const result = await seedDemoData();
      invalidateCache();
      showSuccessToast(
        t('settings.demoDataAdded', {
          receipts: result.receiptsCreated,
          items: result.itemsCreated,
        })
      );
      setShowDevMenu(false);
    } catch {
      showErrorToast(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(t('settings.clearDataTitle'), t('settings.clearDataMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            await clearAllData();
            invalidateCache();
            showSuccessToast(t('settings.dataCleared'));
            setShowDevMenu(false);
          } catch {
            showErrorToast(t('common.error'));
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
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

        <View
          className="p-4 rounded-xl mb-3"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            className="text-base mb-3"
            style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
          >
            {t('settings.language')}
          </Text>
          <View
            className="flex-row rounded-lg p-1"
            style={{
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  className="flex-1 items-center justify-center rounded-md py-2"
                  style={isSelected ? { backgroundColor: colors.primary } : undefined}
                  onPress={() => setLanguage(lang.code as SupportedLanguage)}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                      fontSize: 14,
                    }}
                  >
                    {lang.nativeName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          className="p-4 rounded-xl mb-3"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            className="text-base mb-3"
            style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
          >
            {t('settings.appearance')}
          </Text>
          <View
            className="flex-row rounded-lg p-1"
            style={{
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {(['light', 'dark'] as const).map((scheme) => {
              const isSelected = colorScheme === scheme;
              return (
                <Pressable
                  key={scheme}
                  className="flex-1 items-center justify-center rounded-md py-2"
                  style={isSelected ? { backgroundColor: colors.primary } : undefined}
                  onPress={() => setColorScheme(scheme)}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                      fontSize: 14,
                    }}
                  >
                    {scheme === 'light' ? t('settings.light') : t('settings.dark')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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

        <Pressable
          onPress={handleVersionTap}
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
        </Pressable>
      </ScrollView>

      {/* Dev Menu Modal */}
      <Modal
        visible={showDevMenu}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDevMenu(false)}
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
            <Pressable onPress={() => setShowDevMenu(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text
              className="text-lg"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('settings.devMenu')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView className="flex-1 p-4">
            <Text
              className="text-sm mb-4"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
            >
              {t('settings.devMenuDesc')}
            </Text>

            <Pressable
              onPress={handleSeedDemoData}
              disabled={isLoading}
              className="flex-row items-center p-4 rounded-xl mb-3"
              style={{
                backgroundColor: `${colors.primary}15`,
                borderWidth: 1,
                borderColor: colors.primary,
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <View className="flex-1 ml-3">
                <Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>
                  {t('settings.addDemoData')}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {t('settings.addDemoDataDesc')}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleClearAllData}
              disabled={isLoading}
              className="flex-row items-center p-4 rounded-xl"
              style={{
                backgroundColor: '#98040415',
                borderWidth: 1,
                borderColor: '#980404',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#980404" />
              <View className="flex-1 ml-3">
                <Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>
                  {t('settings.clearAllData')}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {t('settings.clearAllDataDesc')}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
