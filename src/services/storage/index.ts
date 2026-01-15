import {
  documentDirectory,
  copyAsync,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';

// Directory for storing receipt images
const RECEIPTS_DIR = `${documentDirectory}receipts/`;

/**
 * Ensures the receipts directory exists
 */
async function ensureReceiptsDirectory(): Promise<void> {
  const dirInfo = await getInfoAsync(RECEIPTS_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
  }
}

/**
 * Generates a simple random string for unique filenames
 */
function generateRandomId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a unique filename for a receipt file
 */
function generateFilename(extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomId = generateRandomId(8);
  return `receipt_${timestamp}_${randomId}.${extension}`;
}

/**
 * Gets the file extension from a URI or mime type
 */
function getExtension(uri: string, mimeType?: string): string {
  if (mimeType) {
    const mimeExtensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'application/pdf': 'pdf',
    };
    if (mimeExtensions[mimeType]) {
      return mimeExtensions[mimeType];
    }
  }

  // Extract from URI
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Saves a file (image or PDF) to the local receipts directory
 * @param sourceUri - The source URI of the file (from camera, gallery, or document picker)
 * @param mimeType - Optional mime type for better extension detection
 * @returns The local URI of the saved file
 */
export async function saveReceiptFile(
  sourceUri: string,
  mimeType?: string
): Promise<string> {
  await ensureReceiptsDirectory();

  const extension = getExtension(sourceUri, mimeType);
  const filename = generateFilename(extension);
  const destinationUri = `${RECEIPTS_DIR}${filename}`;

  await copyAsync({
    from: sourceUri,
    to: destinationUri,
  });

  return destinationUri;
}

/**
 * Deletes a receipt file from local storage
 * @param fileUri - The local URI of the file to delete
 */
export async function deleteReceiptFile(fileUri: string): Promise<void> {
  const fileInfo = await getInfoAsync(fileUri);
  if (fileInfo.exists) {
    await deleteAsync(fileUri, { idempotent: true });
  }
}

/**
 * Gets information about a file
 * @param fileUri - The URI of the file
 * @returns File info including size and modification time
 */
export async function getFileInfo(fileUri: string): Promise<{
  exists: boolean;
  size?: number;
  modificationTime?: number;
  isDirectory: boolean;
}> {
  const info = await getInfoAsync(fileUri);
  return {
    exists: info.exists,
    size: info.exists ? (info as any).size : undefined,
    modificationTime: info.exists ? (info as any).modificationTime : undefined,
    isDirectory: info.exists ? (info as any).isDirectory || false : false,
  };
}

/**
 * Lists all receipt files in the local storage
 * @returns Array of file URIs
 */
export async function listReceiptFiles(): Promise<string[]> {
  await ensureReceiptsDirectory();

  const files = await readDirectoryAsync(RECEIPTS_DIR);
  return files.map((filename) => `${RECEIPTS_DIR}${filename}`);
}

/**
 * Gets the total storage used by receipt files
 * @returns Total size in bytes
 */
export async function getStorageUsed(): Promise<number> {
  const files = await listReceiptFiles();
  let totalSize = 0;

  for (const fileUri of files) {
    const info = await getFileInfo(fileUri);
    if (info.exists && info.size) {
      totalSize += info.size;
    }
  }

  return totalSize;
}

/**
 * Clears all receipt files from local storage
 * Use with caution - this is irreversible
 */
export async function clearAllReceiptFiles(): Promise<void> {
  const dirInfo = await getInfoAsync(RECEIPTS_DIR);
  if (dirInfo.exists) {
    await deleteAsync(RECEIPTS_DIR, { idempotent: true });
    await ensureReceiptsDirectory();
  }
}

/**
 * Checks if a file is an image based on its extension
 */
export function isImageFile(uri: string): boolean {
  const extension = getExtension(uri).toLowerCase();
  return ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(extension);
}

/**
 * Checks if a file is a PDF based on its extension
 */
export function isPdfFile(uri: string): boolean {
  const extension = getExtension(uri).toLowerCase();
  return extension === 'pdf';
}
