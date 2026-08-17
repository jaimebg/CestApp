/**
 * Settings Screen
 * Simplified: Only language selection
 * Spanish defaults for currency, date format, and number format
 */

import { View, Text, Pressable, ScrollView, Modal, Alert, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import Constants from 'expo-constants';
import { usePreferencesStore } from '@/src/store/preferences';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/src/i18n';
import { seedDemoData, clearAllData } from '@/src/db/demoData';
import { useReceiptsStore } from '@/src/store/receipts';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import { useAppColors } from '@/src/hooks/useAppColors';
import { ModalHeader } from '@/src/components/ui/ModalHeader';
import { MIN_TARGET } from '@/src/theme/a11y';
import { isLlmAvailable } from '@/src/services/llm';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useAppColors();

  const { language, setLanguage, colorScheme, setColorScheme } = usePreferencesStore();
  const llmRefinementEnabled = usePreferencesStore((state) => state.llmRefinementEnabled);
  const setLlmRefinementEnabled = usePreferencesStore((state) => state.setLlmRefinementEnabled);
  const invalidateCache = useReceiptsStore((s) => s.invalidateCache);

  const [llmSupported, setLlmSupported] = useState(false);

  useEffect(() => {
    // Deferred out of the render path: the first call to `isLlmAvailable()`
    // performs a synchronous TurboModule check and `require`s the LLM
    // package barrel (pulling in zod and @ai-sdk/provider-utils), which
    // should never block this screen's initial paint.
    setLlmSupported(isLlmAvailable());
  }, []);

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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full items-center justify-center"
          style={{ backgroundColor: colors.surface, width: MIN_TARGET, height: MIN_TARGET }}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
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
          accessibilityRole="header"
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
                  style={[
                    isSelected ? { backgroundColor: colors.primaryDeep } : undefined,
                    { minHeight: MIN_TARGET },
                  ]}
                  onPress={() => setLanguage(lang.code as SupportedLanguage)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={lang.nativeName}
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
                  style={[
                    isSelected ? { backgroundColor: colors.primaryDeep } : undefined,
                    { minHeight: MIN_TARGET },
                  ]}
                  onPress={() => setColorScheme(scheme)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={scheme === 'light' ? t('settings.light') : t('settings.dark')}
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

        {llmSupported && (
          <View
            className="p-4 rounded-xl mb-3 flex-row items-center justify-between"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View className="flex-1 pr-3">
              <Text style={{ color: colors.text, fontFamily: 'Inter_500Medium', fontSize: 15 }}>
                {t('settings.llmRefinement')}
              </Text>
              <Text
                className="mt-1"
                style={{
                  color: colors.textSecondary,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 13,
                }}
              >
                {t('settings.llmRefinementDescription')}
              </Text>
            </View>
            <Switch
              value={llmRefinementEnabled}
              onValueChange={setLlmRefinementEnabled}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel={t('settings.llmRefinement')}
            />
          </View>
        )}

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
            <Ionicons name="information-circle-outline" size={20} color={colors.action} />
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
          accessibilityRole="header"
          className="text-sm uppercase tracking-wide mb-3 mt-6"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('settings.about')}
        </Text>

        <Pressable
          onPress={handleVersionTap}
          accessibilityRole="button"
          accessibilityLabel={`${t('settings.version')} ${Constants.expoConfig?.version ?? '0.1.0'}`}
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
              {Constants.expoConfig?.version ?? '0.1.0'}
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
        <View
          className="flex-1"
          style={{
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <ModalHeader title={t('settings.devMenu')} onClose={() => setShowDevMenu(false)} />

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
              accessibilityRole="button"
              accessibilityLabel={t('settings.addDemoData')}
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
              className="flex-row items-center p-4 rounded-xl mb-3"
              style={{
                backgroundColor: `${colors.primary}15`,
                borderWidth: 1,
                borderColor: colors.action,
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.action} />
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
              accessibilityRole="button"
              accessibilityLabel={t('settings.clearAllData')}
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
              className="flex-row items-center p-4 rounded-xl"
              style={{
                backgroundColor: `${colors.error}15`,
                borderWidth: 1,
                borderColor: colors.error,
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <Ionicons name="trash-outline" size={24} color={colors.error} />
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
        </View>
      </Modal>
    </View>
  );
}
