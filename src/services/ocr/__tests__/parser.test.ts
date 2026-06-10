import { parseReceipt, validateReceipt } from '../parser';

const MERCADONA_RECEIPT = [
  'MERCADONA, S.A.',
  'C/ MAYOR, 15',
  '28001 MADRID',
  'TELÉFONO: 914567890',
  'NIF: A-46103834',
  '10/03/2026 18:45 OP: 123456',
  'FACTURA SIMPLIFICADA: 2345-012-345678',
  '1 LECHE ENTERA 1L 0,98',
  '2 PAN INTEGRAL 1,20 2,40',
  'TOTAL (€) 5,42',
  'TARJETA BANCARIA 5,42',
  'IVA BASE IMPONIBLE (€) CUOTA (€)',
  '4% 1,15 0,05',
];

const GENERIC_RECEIPT = [
  'SUPERMERCADO LOPEZ',
  'CALLE FALSA 123, MADRID',
  '12/01/2026 10:30',
  'LECHE 1,10',
  'PAN 0,85',
  'TOTAL 1,95',
  'EFECTIVO 2,00',
  'CAMBIO 0,05',
];

describe('parseReceipt with a Mercadona receipt', () => {
  const result = parseReceipt(MERCADONA_RECEIPT);

  it('detects the chain', () => {
    expect(result.chainId).toBe('mercadona');
  });

  it('extracts the store name', () => {
    expect(result.storeName).toMatch(/mercadona/i);
  });

  it('extracts the total', () => {
    expect(result.total).toBe(5.42);
  });

  it('extracts the date in DD/MM/YYYY format', () => {
    expect(result.date).not.toBeNull();
    expect(result.date?.getFullYear()).toBe(2026);
    expect(result.date?.getMonth()).toBe(2);
    expect(result.date?.getDate()).toBe(10);
  });

  it('extracts the time', () => {
    expect(result.time).toBe('18:45');
  });

  it('detects card payment', () => {
    expect(result.paymentMethod).toBe('card');
  });

  it('extracts line items', () => {
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    const names = result.items.map((i) => i.name.toLowerCase());
    expect(names.some((n) => n.includes('leche'))).toBe(true);
  });
});

describe('parseReceipt with a generic receipt', () => {
  const result = parseReceipt(GENERIC_RECEIPT);

  it('extracts the total', () => {
    expect(result.total).toBe(1.95);
  });

  it('does not misattribute an independent store to a known chain', () => {
    expect(result.storeName).toBe('SUPERMERCADO LOPEZ');
  });

  it('extracts the date', () => {
    expect(result.date?.getFullYear()).toBe(2026);
    expect(result.date?.getMonth()).toBe(0);
    expect(result.date?.getDate()).toBe(12);
  });

  it('detects cash payment', () => {
    expect(result.paymentMethod).toBe('cash');
  });

  it('extracts line items', () => {
    expect(result.items.length).toBe(2);
  });

  it('produces a receipt that passes validation', () => {
    const validation = validateReceipt(result);
    expect(validation.isValid).toBe(true);
  });
});

describe('parseReceipt with empty input', () => {
  it('returns an empty receipt without throwing', () => {
    const result = parseReceipt([]);
    expect(result.items).toEqual([]);
    expect(result.total).toBeNull();
  });
});
