import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { saveReceiptFile } from '../storage';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('Capture');

export type CaptureSource = 'gallery' | 'pdf' | 'scanner';

export interface CaptureResult {
  success: boolean;
  uri?: string;
  localUri?: string;
  source: CaptureSource;
  mimeType?: string;
  width?: number;
  height?: number;
  fileName?: string;
  error?: string;
}

/**
 * Request media library permissions
 */
export async function requestGalleryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if gallery permission is granted
 */
export async function hasGalleryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Select a receipt image from the gallery
 */
export async function selectFromGallery(): Promise<CaptureResult> {
  try {
    const hasPermission = await hasGalleryPermission();
    if (!hasPermission) {
      const granted = await requestGalleryPermission();
      if (!granted) {
        return {
          success: false,
          source: 'gallery',
          error: 'galleryPermission',
        };
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
      exif: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return {
        success: false,
        source: 'gallery',
        error: 'cancelled',
      };
    }

    const asset = result.assets[0];

    const localUri = await saveReceiptFile(asset.uri, asset.mimeType);

    return {
      success: true,
      uri: asset.uri,
      localUri,
      source: 'gallery',
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName || undefined,
    };
  } catch (error) {
    logger.error('Gallery selection error:', error);
    return {
      success: false,
      source: 'gallery',
      error: 'unknown',
    };
  }
}

/**
 * Scan a document using the native document scanner.
 * iOS: VNDocumentCameraViewController (perspective correction, auto-crop, contrast enhancement)
 * Android: Google ML Kit Document Scanner (same features)
 */
export async function scanDocument(): Promise<CaptureResult> {
  try {
    const { scannedImages, status } = await DocumentScanner.scanDocument({
      croppedImageQuality: 90,
      maxNumDocuments: 1,
    });

    if (status !== 'success' || !scannedImages || scannedImages.length === 0) {
      return {
        success: false,
        source: 'scanner',
        error: 'cancelled',
      };
    }

    const imageUri = scannedImages[0];
    const localUri = await saveReceiptFile(imageUri, 'image/jpeg');

    return {
      success: true,
      uri: imageUri,
      localUri,
      source: 'scanner',
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    logger.error('Document scan error:', error);
    return {
      success: false,
      source: 'scanner',
      error: 'unknown',
    };
  }
}

/**
 * Select a PDF document
 */
export async function selectPdf(): Promise<CaptureResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return {
        success: false,
        source: 'pdf',
        error: 'cancelled',
      };
    }

    const asset = result.assets[0];

    const localUri = await saveReceiptFile(asset.uri, asset.mimeType);

    return {
      success: true,
      uri: asset.uri,
      localUri,
      source: 'pdf',
      mimeType: asset.mimeType,
      fileName: asset.name,
    };
  } catch (error) {
    logger.error('PDF selection error:', error);
    return {
      success: false,
      source: 'pdf',
      error: 'unknown',
    };
  }
}
