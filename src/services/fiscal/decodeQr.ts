import { QrDecoder } from '@/modules/qr-decoder';
import { createScopedLogger } from '../../utils/debug';

const logger = createScopedLogger('DecodeQr');

/**
 * The text of every QR code in a photo. Never throws: a photo with no readable
 * code, or a build without the decoder, simply yields none.
 */
export async function decodeQrCodes(uri: string): Promise<string[]> {
  if (!QrDecoder) return [];
  try {
    return await QrDecoder.decode(uri);
  } catch (error) {
    logger.warn('QR decoding failed:', error);
    return [];
  }
}
