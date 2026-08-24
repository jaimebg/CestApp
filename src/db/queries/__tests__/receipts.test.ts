import { createReceiptWithItems } from '../receipts';
import { db } from '@/src/db/client';

jest.mock('@/src/db/client', () => ({ db: { transaction: jest.fn() } }));

describe('createReceiptWithItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps receipt + items in a single transaction', async () => {
    const txResult = { id: 1 };
    (db.transaction as jest.Mock).mockImplementation(async () => txResult);
    const result = await createReceiptWithItems({ totalAmount: 100 } as never, []);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual(txResult);
  });
});
