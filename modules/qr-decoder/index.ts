import { requireOptionalNativeModule } from 'expo';

interface QrDecoderNativeModule {
  decode(uri: string): Promise<string[]>;
}

/** Null where the native module is not linked (tests, web, an older build). */
export const QrDecoder = requireOptionalNativeModule<QrDecoderNativeModule>('QrDecoder');
