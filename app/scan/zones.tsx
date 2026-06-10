import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const logger = createScopedLogger('Zones');

type ToolMode = 'draw' | 'select' | 'delete';

export default function ZoneSelectionScreen() {
  const {
    uri,
    storeId,
    imageDimensions,
    mode: screenMode,
    source,
    existingZones,
  } = useLocalSearchParams<{
    uri: string;
    storeId?: string;
    imageDimensions?: string;
    mode?: 'template' | 'preview'; // 'template' saves to DB, 'preview' returns zones for one-time use
    source?: string;
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

  const handleSave = useCallback(async () => {
    if (zones.length === 0) {
      showErrorToast(t('common.error'), t('scan.zonesMinimumError'));
      return;
    }

    // In preview mode, return zones to preview screen via params
    if (isPreviewMode) {
      logger.log('Returning zones to preview:', zones.length);
      zones.forEach((z, i) => {
        logger.log(`Zone ${i}: type=${z.type}, bbox=${JSON.stringify(z.boundingBox)}`);
      });
      router.navigate({
        pathname: '/scan/preview',
        params: {
          uri,
          source,
          definedZones: JSON.stringify(zones),
          imageDimensions: imageDimensions,
        },
      });
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

      router.back();
    } catch (error) {
      logger.error('Error saving template:', error);
      showErrorToast(t('common.error'), t('errors.saveFailed'));
    }
  }, [storeId, zones, uri, source, router, t, isPreviewMode, imageDimensions, parsedDimensions]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (!uri) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: colors.background }}
      >
        <Ionicons name="alert-circle" size={48} color={colors.textSecondary} />
        <Text
          className="text-base mt-4"
          style={{ color: colors.text, fontFamily: 'Inter_500Medium' }}
        >
          {t('errors.loadFailed')}
        </Text>
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
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: colors.border }}
      >
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
      </View>

      {/* Instructions */}
      <View className="px-4 py-2" style={{ backgroundColor: colors.surface }}>
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
      </View>

      {/* Canvas */}
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
    </View>
  );
}
