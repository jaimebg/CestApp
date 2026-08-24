/**
 * Settings Screen
 * Simplified: Only language selection
 * Spanish defaults for currency, date format, and number format
 */

import { View, Text, Pressable, ScrollView, Modal, Platform, Switch, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { usePreferencesStore } from '@/src/store/preferences';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/src/i18n';
import { seedDemoData, clearAllData } from '@/src/db/demoData';
import { useReceiptsStore } from '@/src/store/receipts';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import { useAppColors } from '@/src/hooks/useAppColors';
import { ModalHeader } from '@/src/components/ui/ModalHeader';
import { ConfirmationModal } from '@/src/components/ui/ConfirmationModal';
import { MIN_TARGET } from '@/src/theme/a11y';
import { isLlmAvailable } from '@/src/services/llm';
import { getBackupData } from '@/src/db/queries/backup';
import { exportBackup } from '@/src/utils/backup';
import { createScopedLogger } from '@/src/utils/debug';
import { getErrorLog, clearErrorLog, type ErrorLogEntry } from '@/src/utils/errorLog';

const logger = createScopedLogger('Settings');

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
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([]);
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const handleVersionTap = () => {
    if (!__DEV__) return;
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
    } catch (error) {
      logger.error('Demo seed failed:', error);
      showErrorToast(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      const data = await getBackupData();
      const shared = await exportBackup(data);
      if (shared) {
        showSuccessToast(t('common.success'), t('settings.backupDone'));
      } else {
        showErrorToast(t('common.error'), t('errors.backupFailed'));
      }
    } catch (error) {
      logger.error('Backup failed:', error);
      showErrorToast(t('common.error'), t('errors.backupFailed'));
    } finally {
      setIsBackingUp(false);
    }
  };

  const openDiagnostics = async () => {
    setErrorLog(await getErrorLog());
    setShowDiagnostics(true);
  };

  const copyDiagnostics = () => {
    const text = errorLog
      .map(
        (entry) =>
          `[${entry.timestamp}] ${entry.scope}: ${entry.message}${entry.stack ? `\n${entry.stack}` : ''}`
      )
      .join('\n\n');
    Share.share({ message: text || t('settings.diagnosticsEmpty') });
  };

  const clearDiagnostics = async () => {
    try {
      await clearErrorLog();
      setErrorLog([]);
    } catch (error) {
      logger.error('Clear diagnostics failed:', error);
    }
  };

  const handleClearAllData = async () => {
    setShowClearConfirm(false);
    setIsLoading(true);
    try {
      await clearAllData();
      invalidateCache();
      showSuccessToast(t('settings.dataCleared'));
    } catch (error) {
      logger.error('Clear data failed:', error);
      showErrorToast(t('common.error'));
    } finally {
      setIsLoading(false);
    }
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

        {/* Data */}
        <Text
          accessibilityRole="header"
          className="text-sm uppercase tracking-wide mb-3 mt-6"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('settings.data')}
        </Text>

        <Pressable
          onPress={() => setShowClearConfirm(true)}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={t('settings.clearAllData')}
          accessibilityState={{ disabled: isLoading, busy: isLoading }}
          className="p-4 rounded-xl mb-3 flex-row items-center"
          style={{
            backgroundColor: `${colors.error}15`,
            borderWidth: 1,
            borderColor: colors.error,
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <Ionicons name="trash-outline" size={24} color={colors.error} />
          <View className="flex-1 ml-3">
            <Text
              className="text-base"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('settings.clearAllData')}
            </Text>
            <Text
              className="text-sm mt-1"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
            >
              {t('settings.clearAllDataDesc')}
            </Text>
          </View>
        </Pressable>

        {/* Backup */}
        <Pressable
          onPress={handleBackup}
          disabled={isBackingUp}
          accessibilityRole="button"
          accessibilityLabel={t('settings.backup')}
          accessibilityState={{ disabled: isBackingUp, busy: isBackingUp }}
          className="p-4 rounded-xl mb-3 flex-row items-center"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: isBackingUp ? 0.5 : 1,
          }}
        >
          <Ionicons name="cloud-upload-outline" size={24} color={colors.action} />
          <View className="flex-1 ml-3">
            <Text
              className="text-base"
              style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
            >
              {t('settings.backup')}
            </Text>
            <Text
              className="text-sm mt-1"
              style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
            >
              {t('settings.backupDesc')}
            </Text>
          </View>
        </Pressable>

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
          accessibilityLabel={`${t('settings.version')} ${Constants.expoConfig?.version ?? '1.0.0'}`}
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
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => WebBrowser.openBrowserAsync('https://jbgsoft.com/cestapp/privacy')}
          accessibilityRole="button"
          accessibilityLabel={t('settings.privacyPolicy')}
          className="p-4 rounded-xl mt-3 flex-row items-center"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.textSecondary} />
          <Text
            className="text-base flex-1 ml-3"
            style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
          >
            {t('settings.privacyPolicy')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={openDiagnostics}
          accessibilityRole="button"
          accessibilityLabel={t('settings.diagnostics')}
          className="p-4 rounded-xl mt-3 flex-row items-center"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="bug-outline" size={22} color={colors.textSecondary} />
          <Text
            className="text-base flex-1 ml-3"
            style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
          >
            {t('settings.diagnostics')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
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
          </ScrollView>
        </View>
      </Modal>

      <ConfirmationModal
        visible={showClearConfirm}
        title={t('settings.clearDataTitle')}
        message={t('settings.clearDataMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDestructive
        isLoading={isLoading}
        onConfirm={handleClearAllData}
        onCancel={() => setShowClearConfirm(false)}
      />

      <Modal
        visible={showDiagnostics}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDiagnostics(false)}
      >
        <View
          className="flex-1"
          style={{
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
          }}
        >
          <ModalHeader
            title={t('settings.diagnostics')}
            onClose={() => setShowDiagnostics(false)}
            closeLabel={t('common.cancel')}
            confirmLabel={t('common.share')}
            onConfirm={copyDiagnostics}
          />
          {errorLog.length === 0 ? (
            <View className="py-16 items-center px-6">
              <Text
                className="text-sm text-center"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('settings.diagnosticsEmpty')}
              </Text>
            </View>
          ) : (
            <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 40 }}>
              {errorLog.map((entry, index) => (
                <View
                  key={`${entry.timestamp}-${index}`}
                  className="p-3 mb-3 rounded-xl"
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    className="text-xs"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {entry.timestamp} · {entry.scope}
                  </Text>
                  <Text
                    className="text-sm mt-1"
                    style={{ color: colors.text, fontFamily: 'Inter_400Regular' }}
                  >
                    {entry.message}
                  </Text>
                </View>
              ))}
              <Pressable
                onPress={clearDiagnostics}
                accessibilityRole="button"
                accessibilityLabel={t('common.clear')}
                style={{ minHeight: MIN_TARGET, justifyContent: 'center' }}
                className="items-center py-3"
              >
                <Text
                  className="text-error dark:text-error-light text-sm"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {t('common.clear')}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
