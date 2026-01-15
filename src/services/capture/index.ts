import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { saveReceiptFile } from '../storage';

export type CaptureSource = 'camera' | 'gallery' | 'pdf';

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
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestGalleryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if camera permission is granted
 */
export async function hasCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.getCameraPermissionsAsync();
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
 * Capture a receipt using the camera
 */
export async function captureFromCamera(): Promise<CaptureResult> {
  try {
    // Check/request permission
    const hasPermission = await hasCameraPermission();
    if (!hasPermission) {
      const granted = await requestCameraPermission();
      if (!granted) {
        return {
          success: false,
          source: 'camera',
          error: 'cameraPermission',
        };
      }
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
      exif: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return {
        success: false,
        source: 'camera',
        error: 'cancelled',
      };
    }

    const asset = result.assets[0];

    // Save to local storage
    const localUri = await saveReceiptFile(asset.uri, asset.mimeType);

    return {
      success: true,
      uri: asset.uri,
      localUri,
      source: 'camera',
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName || undefined,
    };
  } catch (error) {
    console.error('Camera capture error:', error);
    return {
      success: false,
      source: 'camera',
      error: 'unknown',
    };
  }
}

/**
 * Select a receipt image from the gallery
 */
export async function selectFromGallery(): Promise<CaptureResult> {
  try {
    // Check/request permission
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

    // Launch gallery picker
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

    // Save to local storage
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
    console.error('Gallery selection error:', error);
    return {
      success: false,
      source: 'gallery',
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

    // Save to local storage
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
    console.error('PDF selection error:', error);
    return {
      success: false,
      source: 'pdf',
      error: 'unknown',
    };
  }
}
