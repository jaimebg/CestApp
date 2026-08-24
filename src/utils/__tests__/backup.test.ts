import { buildBackupPayload, BACKUP_VERSION } from '../backup';

describe('buildBackupPayload', () => {
  it('stamps the schema version and ISO strings', () => {
    const payload = buildBackupPayload({
      stores: [],
      receipts: [
        {
          id: 1,
          storeId: null,
          dateTime: new Date(2026, 7, 24, 12, 0, 0),
          totalAmount: 1234,
          subtotal: null,
          taxAmount: null,
          discountAmount: null,
          paymentMethod: 'card' as const,
          imagePath: null,
          pdfPath: null,
          rawText: 'mercadona',
          processingStatus: 'completed' as const,
          confidence: 90,
          notes: null,
          createdAt: new Date(2026, 7, 24),
          updatedAt: new Date(2026, 7, 24),
          syncId: null,
        },
      ],
      items: [],
      categories: [],
      userLearnedItems: [],
    });

    expect(payload.version).toBe(BACKUP_VERSION);
    expect(Object.keys(payload)).toEqual([
      'version',
      'exportedAt',
      'stores',
      'receipts',
      'items',
      'categories',
      'userLearnedItems',
    ]);
    expect(typeof payload.exportedAt).toBe('string');
    expect(payload.receipts[0].dateTime).toBeInstanceOf(Date);
    expect(payload.receipts[0].totalAmount).toBe(1234);
  });
});
