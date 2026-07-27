import type { ParsedItem } from '../ocr/parser';

export interface LlmReceipt {
  storeName: string | null;
  date: string | null;
  time: string | null;
  total: number | null;
  items: ParsedItem[];
}

export type ChainHint = {
  chainId: string;
  chainName: string;
  isColumnar: boolean;
};

export interface AppleMessage {
  role: 'system' | 'user';
  content: string;
}
