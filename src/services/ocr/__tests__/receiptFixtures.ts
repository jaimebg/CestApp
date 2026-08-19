import { PDF_LINE_SETS } from './fixtures.receiptPdfLines';
import { LIDL_LINE_SETS } from './fixtures.lidlReceipts';

export interface ReceiptFixture {
  id: string;
  chainId: string;
  /** Where the lines came from: an e-receipt PDF, or a photo of the receipt. */
  source: 'pdf' | 'photo';
  lines: string[];
  /**
   * What the parsed line items have to add up to.
   *
   * A receipt that prints a subtotal settles its basket-wide coupons between
   * that subtotal and the total, so the items match the subtotal. Everywhere
   * else they match the printed total.
   */
  itemsTotal: number;
  /** The total printed on the receipt. */
  total: number;
  itemCount: number;
}

/**
 * The reference receipts, with the figures each one prints on itself.
 *
 * Every expectation here was read off the receipt, not off the parser: the
 * item count is what the receipt lists, and the sum is its own printed total.
 * That is the assertion worth having, because it is the one a wrong parse
 * cannot satisfy by accident.
 */
export const RECEIPT_FIXTURES: ReceiptFixture[] = [
  {
    id: 'carrefour/vecindario 08-09-2025',
    chainId: 'carrefour',
    source: 'pdf',
    lines: PDF_LINE_SETS.carrefourMarket20250908,
    itemsTotal: 6.53,
    total: 6.53,
    itemCount: 3,
  },
  {
    // 9 articles over 8 lines: the water is a two-for-one, priced on its own
    // continuation line and discounted on the line after that.
    id: 'carrefour/valladolid 31-07-2025',
    chainId: 'carrefour',
    source: 'pdf',
    lines: PDF_LINE_SETS.carrefourMarket20250731,
    itemsTotal: 10.59,
    total: 10.59,
    itemCount: 8,
  },
  {
    id: 'carrefour/las arenas 05-10-2024',
    chainId: 'carrefour',
    source: 'pdf',
    lines: PDF_LINE_SETS.carrefourArenas20241005,
    itemsTotal: 12.28,
    total: 12.28,
    itemCount: 4,
  },
  {
    id: 'carrefour/las arenas 01-08-2024',
    chainId: 'carrefour',
    source: 'pdf',
    lines: PDF_LINE_SETS.carrefourArenas20240801,
    itemsTotal: 7.5,
    total: 7.5,
    itemCount: 4,
  },
  {
    // A basket coupon lands between the subtotal and the total: 4,88 - 0,32.
    id: 'carrefour/las arenas 11-03-2024',
    chainId: 'carrefour',
    source: 'pdf',
    lines: PDF_LINE_SETS.carrefourArenas20240311,
    itemsTotal: 4.88,
    total: 4.56,
    itemCount: 2,
  },
  {
    id: 'carrefour/las arenas 04-04-2026',
    chainId: 'carrefour',
    source: 'pdf',
    lines: PDF_LINE_SETS.carrefourArenas20260404,
    itemsTotal: 4.65,
    total: 4.65,
    itemCount: 3,
  },
  {
    id: 'mercadona/madrid 09-07-2024',
    chainId: 'mercadona',
    source: 'pdf',
    lines: PDF_LINE_SETS.mercadonaMadrid20240709,
    itemsTotal: 8.01,
    total: 8.01,
    itemCount: 7,
  },
  {
    id: 'mercadona/ingenio 20-02-2026',
    chainId: 'mercadona',
    source: 'pdf',
    lines: PDF_LINE_SETS.mercadona20260220,
    itemsTotal: 39.83,
    total: 39.83,
    itemCount: 15,
  },
  {
    id: 'mercadona/culleredo 17-06-2026',
    chainId: 'mercadona',
    source: 'pdf',
    lines: PDF_LINE_SETS.mercadonaCulleredo20260617,
    itemsTotal: 37.02,
    total: 37.02,
    itemCount: 17,
  },
  {
    id: 'mercadona/ingenio 11-08-2026',
    chainId: 'mercadona',
    source: 'pdf',
    lines: PDF_LINE_SETS.mercadonaIngenio20260811,
    itemsTotal: 28.58,
    total: 28.58,
    itemCount: 9,
  },
  {
    id: 'mercadona/ingenio 17-08-2026',
    chainId: 'mercadona',
    source: 'pdf',
    lines: PDF_LINE_SETS.mercadona20260817,
    itemsTotal: 54.2,
    total: 54.2,
    itemCount: 17,
  },
  {
    id: 'lidl/los llanos 20-05-2024',
    chainId: 'lidl',
    source: 'photo',
    lines: LIDL_LINE_SETS.lidlLosLlanos20240520,
    itemsTotal: 45.48,
    total: 45.48,
    itemCount: 16,
  },
  {
    id: 'lidl/los llanos 26-12-2023',
    chainId: 'lidl',
    source: 'photo',
    lines: LIDL_LINE_SETS.lidlLosLlanos20231226,
    itemsTotal: 68.62,
    total: 68.62,
    itemCount: 27,
  },
  {
    // 19 "Dto. Lidl Plus" lines, which the receipt itself totals at 5,39.
    id: 'lidl/los llanos 24-12-2023',
    chainId: 'lidl',
    source: 'photo',
    lines: LIDL_LINE_SETS.lidlLosLlanos20231224,
    itemsTotal: 35.7,
    total: 35.7,
    itemCount: 18,
  },
  {
    id: 'lidl/los llanos 20-08-2024',
    chainId: 'lidl',
    source: 'photo',
    lines: LIDL_LINE_SETS.lidlLosLlanos20240820,
    itemsTotal: 67.05,
    total: 67.05,
    itemCount: 25,
  },
];
