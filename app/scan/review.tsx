import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/src/components/ui';

export default function ScanReviewScreen() {
  const { uri, source, ocrText, ocrLines, isPdf } = useLocalSearchParams<{
    uri: string;
    source: string;
    ocrText?: string;
    ocrLines?: string;
    isPdf?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    border: isDark ? '#4A4640' : '#E8E4D9',
  };

  // Parse OCR lines if available
  const lines: string[] = ocrLines ? JSON.parse(ocrLines) : [];
  const hasOcrResult = ocrText && ocrText.length > 0;
  const isPdfFile = isPdf === 'true';

  const handleDone = () => {
    // Navigate back to the scan tab
    router.dismissAll();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.background, paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={handleBack} className="flex-row items-center" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text
          className="text-lg"
          style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
        >
          {t('scan.reviewTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {isPdfFile ? (
          // PDF - OCR not yet implemented
          <Card variant="filled" padding="lg">
            <View className="items-center">
              <View className="bg-primary/20 rounded-full p-4 mb-3">
                <Ionicons name="document-text-outline" size={32} color="#3D6B23" />
              </View>
              <Text
                className="text-base text-center"
                style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
              >
                {t('scan.pdfOcrPending')}
              </Text>
              <Text
                className="text-sm text-center mt-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('scan.pdfOcrPendingDesc')}
              </Text>
            </View>
          </Card>
        ) : hasOcrResult ? (
          // Image with OCR results
          <>
            {/* Success indicator */}
            <Card variant="filled" padding="md" className="mb-4">
              <View className="flex-row items-center">
                <View className="bg-primary rounded-full p-2 mr-3">
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base"
                    style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
                  >
                    {t('scan.ocrSuccess')}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                  >
                    {t('scan.linesDetected', { count: lines.length })}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Raw OCR text */}
            <Text
              className="text-base mb-2"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('scan.extractedText')}
            </Text>
            <Card variant="outlined" padding="md">
              <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
                {lines.map((line, index) => (
                  <Text
                    key={index}
                    className="text-sm mb-1"
                    style={{
                      color: colors.text,
                      fontFamily: 'Inter_400Regular',
                      lineHeight: 20,
                    }}
                  >
                    {line}
                  </Text>
                ))}
              </ScrollView>
            </Card>

            {/* Placeholder for parsed data */}
            <Text
              className="text-base mt-6 mb-2"
              style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
            >
              {t('scan.parsedData')}
            </Text>
            <Card variant="outlined" padding="lg">
              <View className="items-center py-4">
                <Ionicons name="construct-outline" size={32} color={colors.textSecondary} />
                <Text
                  className="text-sm text-center mt-2"
                  style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
                >
                  {t('scan.parsingPending')}
                </Text>
              </View>
            </Card>
          </>
        ) : (
          // No OCR results
          <Card variant="outlined" padding="lg">
            <View className="items-center py-4">
              <View className="bg-error/20 rounded-full p-4 mb-3">
                <Ionicons name="alert-circle-outline" size={32} color="#980404" />
              </View>
              <Text
                className="text-base text-center"
                style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
              >
                {t('scan.noTextDetected')}
              </Text>
              <Text
                className="text-sm text-center mt-2"
                style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
              >
                {t('scan.noTextDetectedDesc')}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View
        className="px-4 pb-4 gap-3"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
      >
        <Button variant="primary" size="lg" onPress={handleDone}>
          {t('common.done')}
        </Button>
      </View>
    </View>
  );
}
