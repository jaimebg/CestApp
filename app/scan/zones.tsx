import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/core/usePreventRemove';
import type { NavigationAction } from 'expo-router/build/react-navigation/routers';
import { ConfirmationModal } from '@/src/components/ui/ConfirmationModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import { createScopedLogger } from '@/src/utils/debug';
import { ZoneSelectionCanvas } from '@/src/components/zones/ZoneSelectionCanvas';
import { ZoneTypePicker } from '@/src/components/zones/ZoneTypePicker';
import { ZoneSelectionToolbar } from '@/src/components/zones/ZoneSelectionToolbar';
import { type ZoneDefinition, type ZoneType, type ParsingHints } from '@/src/types/zones';
import { upsertStoreTemplate, getTemplateByStoreId } from '@/src/db/queries/storeParsingTemplates';
import { useAppColors } from '@/src/hooks/useAppColors';
import { useScanDraftStore } from '@/src/store/scanDraft';
import { Button } from '@/src/components/ui/Button';
import { ReadingColumn } from '@/src/components/ui/ReadingColumn';
import { isPdfFile } from '@/src/services/storage';

const logger = createScopedLogger('Zones');

type ToolMode = 'draw' | 'select' | 'delete';

export default function ZoneSelectionScreen() {
  const {
    uri,
    storeId,
    imageDimensions,
    mode: screenMode,
    existingZones,
  } = useLocalSearchParams<{
    uri: string;
    storeId?: string;
    imageDimensions?: string;
    mode?: 'template' | 'preview'; // 'template' saves to DB, 'preview' hands zones back to the review screen
    existingZones?: string; // Auto-detected or previously defined zones (for preview mode)
  }>();
  const isPreviewMode = screenMode === 'preview';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useAppColors();

  const parsedDimensions = useMemo(
    () => (imageDimensions ? JSON.parse(imageDimensions) : { width: 1000, height: 1500 }),
    [imageDimensions]
  );

  logger.log('Using imageDimensions:', parsedDimensions);
  logger.log('Raw imageDimensions param:', imageDimensions);

  const [zones, setZones] = useState<ZoneDefinition[]>([]);
  const [mode, setMode] = useState<ToolMode>('draw');
  const [activeZoneType, setActiveZoneType] = useState<ZoneType>('product_names');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Load existing zones (auto-detected or from template)
  useEffect(() => {
    async function loadExistingZones() {
      // In preview mode, load existing zones passed from preview screen
      if (isPreviewMode) {
        if (existingZones) {
          try {
            const parsedZones = JSON.parse(existingZones) as ZoneDefinition[];
            logger.log('Loading existing zones in preview mode:', parsedZones.length);
            setZones(parsedZones);
            setIsEditing(true);
            // Switch to select mode when editing existing zones
            setMode('select');
          } catch (error) {
            logger.error('Error parsing existing zones:', error);
          }
        }
        setIsLoading(false);
        return;
      }

      // In template mode, load from database
      if (!storeId) {
        setIsLoading(false);
        return;
      }

      try {
        const template = await getTemplateByStoreId(parseInt(storeId, 10));
        if (template && template.zones && template.zones.length > 0) {
          setZones(template.zones);
          setIsEditing(true);
          // Switch to select mode when editing existing zones
          setMode('select');
        }
      } catch (error) {
        logger.error('Error loading template:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadExistingZones();
  }, [storeId, isPreviewMode, existingZones]);

  const canSave = zones.length > 0;

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [forceLeave, setForceLeave] = useState(false);
  const pendingRemoveAction = useRef<NavigationAction | null>(null);
  const navigation = useNavigation();

  usePreventRemove(zones.length > 0 && !forceLeave, ({ data }) => {
    pendingRemoveAction.current = data.action;
    setShowDiscardConfirm(true);
  });

  useEffect(() => {
    if (forceLeave) {
      router.back();
    }
  }, [forceLeave, router]);

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    const action = pendingRemoveAction.current;
    pendingRemoveAction.current = null;
    if (action) {
      navigation.dispatch(action);
    } else {
      setForceLeave(true);
    }
  };

  const handleSave = useCallback(async () => {
    if (zones.length === 0) {
      showErrorToast(t('common.error'), t('scan.zonesMinimumError'));
      return;
    }

    // In preview mode the zones belong to the receipt being reviewed, not to a
    // store: they go back into the draft the review screen reads.
    if (isPreviewMode) {
      logger.log('Handing', zones.length, 'zones back to the review screen');
      useScanDraftStore.getState().setZones(zones);
      setForceLeave(true);
      return;
    }

    // Template mode - save to database
    if (!storeId) {
      showErrorToast(t('common.error'), t('scan.storeNotSpecified'));
      return;
    }

    try {
      const parsingHints: ParsingHints = {};

      await upsertStoreTemplate(parseInt(storeId, 10), {
        zones,
        parsingHints,
        sampleImagePath: uri,
        confidence: 70,
        imageDimensions: parsedDimensions,
      });

      showSuccessToast(t('common.success'), t('scan.templateSaved'));

      setForceLeave(true);
    } catch (error) {
      logger.error('Error saving template:', error);
      showErrorToast(t('common.error'), t('errors.saveFailed'));
    }
  }, [storeId, zones, uri, t, isPreviewMode, parsedDimensions]);

  const handleCancel = useCallback(() => {
    setForceLeave(true);
  }, []);

  if (!uri || isPdfFile(uri)) {
    return (
      <View
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: colors.background }}
      >
        <Ionicons
          name={!uri ? 'alert-circle' : 'document-text-outline'}
          size={48}
          color={colors.textSecondary}
        />
        <Text
          className="text-base mt-4 text-center"
          style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
        >
          {!uri ? t('errors.loadFailed') : t('scan.zonesPdfUnsupported')}
        </Text>
        <View className="mt-6 w-48">
          <Button variant="primary" size="md" onPress={() => router.back()}>
            {t('common.back')}
          </Button>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: colors.background }}
      >
        <Text
          className="text-base"
          style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
        >
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View className="border-b" style={{ borderColor: colors.border }}>
        <ReadingColumn className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg" style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
            {isPreviewMode
              ? t('scan.zonesTitlePreview')
              : isEditing
                ? t('scan.zonesTitleEdit')
                : t('scan.zonesTitleDefine')}
          </Text>
          <Text
            className="text-sm"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {t('scan.zoneCount', { count: zones.length })}
          </Text>
        </ReadingColumn>
      </View>

      {/* Instructions */}
      <View style={{ backgroundColor: colors.surface }}>
        <ReadingColumn className="px-4 py-2">
          <Text
            className="text-xs text-center"
            style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
          >
            {isPreviewMode
              ? t('scan.zonesInstructionsPreview')
              : isEditing
                ? t('scan.zonesInstructionsEdit')
                : t('scan.zonesInstructionsDefine')}
          </Text>
        </ReadingColumn>
      </View>

      {/* The canvas is deliberately not capped: ZoneSelectionCanvas fits the
          receipt to the box it is given, and a 640pt cap would shrink the
          surface the user draws zones on. */}
      <View className="flex-1">
        <ZoneSelectionCanvas
          imageUri={uri}
          zones={zones}
          onZonesChange={setZones}
          activeZoneType={activeZoneType}
          mode={mode}
          selectedZoneId={selectedZoneId}
          onSelectZone={setSelectedZoneId}
          imageDimensions={parsedDimensions}
        />
      </View>

      {/* Toolbar */}
      <ZoneSelectionToolbar
        mode={mode}
        onModeChange={setMode}
        activeZoneType={activeZoneType}
        onZoneTypePress={() => setShowTypePicker(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        canSave={canSave}
      />

      {/* Zone Type Picker Modal */}
      <ZoneTypePicker
        visible={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        onSelect={setActiveZoneType}
        currentType={activeZoneType}
      />

      <ConfirmationModal
        visible={showDiscardConfirm}
        title={t('receipt.discardConfirm')}
        message={t('receipt.discardConfirmDesc')}
        confirmText={t('receipt.discardChanges')}
        cancelText={t('common.cancel')}
        isDestructive
        onConfirm={confirmDiscard}
        onCancel={() => {
          pendingRemoveAction.current = null;
          setShowDiscardConfirm(false);
        }}
      />
    </View>
  );
}
