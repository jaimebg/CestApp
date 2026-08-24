import { documentDirectory, deleteAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import type { Store } from '@/src/db/schema/stores';
import type { Receipt } from '@/src/db/schema/receipts';
import type { Item } from '@/src/db/schema/items';
import type { Category } from '@/src/db/schema/categories';
import type { UserLearnedItem } from '@/src/db/schema/userLearnedItems';

export const BACKUP_VERSION = 1;

export interface BackupPayload {
  version: number;
  exportedAt: string;
  stores: Store[];
  receipts: Receipt[];
  items: Item[];
  categories: Category[];
  userLearnedItems: UserLearnedItem[];
}

export interface BackupInput {
  stores: Store[];
  receipts: Receipt[];
  items: Item[];
  categories: Category[];
  userLearnedItems: UserLearnedItem[];
}

export function buildBackupPayload(input: BackupInput): BackupPayload {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    stores: input.stores,
    receipts: input.receipts,
    items: input.items,
    categories: input.categories,
    userLearnedItems: input.userLearnedItems,
  };
}

export async function exportBackup(input: BackupInput): Promise<boolean> {
  const payload = buildBackupPayload(input);
  const fileName = `cestapp-backup-${Date.now()}.json`;
  const fileUri = `${documentDirectory}${fileName}`;

  try {
    await writeAsStringAsync(fileUri, JSON.stringify(payload));
    if (!(await isAvailableAsync())) return false;
    await shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: payload.exportedAt,
      UTI: 'public.json',
    });
    return true;
  } finally {
    await deleteAsync(fileUri, { idempotent: true });
  }
}
