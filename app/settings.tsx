/**
 * Settings Screen
 * Simplified: Only language selection
 * Spanish defaults for currency, date format, and number format
 */

import { ListGroup, ListRow } from '@/src/components/ui/ListGroup';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { fonts } from '@/src/theme/type';
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
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
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

  const sectionLabel = (label: string, first = false) => (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.textSecondary,
        fontFamily: fonts.medium,
        fontSize: 13,
        marginTop: first ? 8 : 32,
        marginBottom: 8,
        paddingHorizontal: 16,
      }}
    >
      {label}
    </Text>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center px-2 py-1">
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center active:opacity-60"
          style={{ width: MIN_TARGET, height: MIN_TARGET }}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="ml-2"
          style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 17 }}
        >
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ReadingColumn>
          {sectionLabel(t('settings.preferences'), true)}
          <ListGroup footer={t('settings.spanishDefaultsDesc')}>
            <ListRow title={t('settings.language')}>
              <SegmentedControl
                options={SUPPORTED_LANGUAGES.map((lang) => ({
                  value: lang.code as SupportedLanguage,
                  label: lang.nativeName,
                }))}
                value={language as SupportedLanguage}
                onChange={(code) => setLanguage(code)}
                accessibilityLabel={t('settings.language')}
              />
            </ListRow>
            <ListRow title={t('settings.appearance')}>
              <SegmentedControl
                options={[
                  { value: 'light' as const, label: t('settings.light') },
                  { value: 'dark' as const, label: t('settings.dark') },
                ]}
                value={colorScheme}
                onChange={setColorScheme}
                accessibilityLabel={t('settings.appearance')}
              />
            </ListRow>
            {llmSupported ? (
              <ListRow
                title={t('settings.llmRefinement')}
                description={t('settings.llmRefinementDescription')}
                accessory={
                  <Switch
                    value={llmRefinementEnabled}
                    onValueChange={setLlmRefinementEnabled}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    accessibilityLabel={t('settings.llmRefinement')}
                  />
                }
              />
            ) : null}
          </ListGroup>

          {sectionLabel(t('settings.data'))}
          <ListGroup>
            <ListRow
              title={t('settings.backup')}
              description={t('settings.backupDesc')}
              icon="cloud-upload-outline"
              disabled={isBackingUp}
              onPress={handleBackup}
            />
            <ListRow
              title={t('settings.clearAllData')}
              description={t('settings.clearAllDataDesc')}
              icon="trash-outline"
              destructive
              disabled={isLoading}
              onPress={() => setShowClearConfirm(true)}
            />
          </ListGroup>

          {sectionLabel(t('settings.about'))}
          <ListGroup>
            <ListRow
              title={t('settings.version')}
              value={Constants.expoConfig?.version ?? '1.0.0'}
              onPress={handleVersionTap}
            />
            <ListRow
              title={t('settings.privacyPolicy')}
              icon="shield-checkmark-outline"
              chevron
              onPress={() => WebBrowser.openBrowserAsync('https://jbgsoft.com/cestapp/privacy')}
            />
            <ListRow
              title={t('settings.diagnostics')}
              icon="bug-outline"
              chevron
              onPress={openDiagnostics}
            />
          </ListGroup>
        </ReadingColumn>
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

            <ListGroup>
              <ListRow
                title={t('settings.addDemoData')}
                description={t('settings.addDemoDataDesc')}
                icon="add-circle-outline"
                disabled={isLoading}
                onPress={handleSeedDemoData}
              />
            </ListGroup>
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
