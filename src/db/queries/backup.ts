import { db } from '../client';
import { receipts } from '../schema/receipts';
import { items } from '../schema/items';
import { stores } from '../schema/stores';
import { userLearnedItems } from '../schema/userLearnedItems';
import { getCategories } from './categories';
import type { BackupInput } from '@/src/utils/backup';

export async function getBackupData(): Promise<BackupInput> {
  const [storesData, receiptsData, itemsData, categoriesData, learnedData] = await Promise.all([
    db.select().from(stores),
    db.select().from(receipts),
    db.select().from(items),
    getCategories(),
    db.select().from(userLearnedItems),
  ]);

  return {
    stores: storesData,
    receipts: receiptsData,
    items: itemsData,
    categories: categoriesData,
    userLearnedItems: learnedData,
  };
}
