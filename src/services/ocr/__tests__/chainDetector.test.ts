import { detectChainFromText, detectChainFromLines } from '../chainDetector';

describe('detectChainFromText', () => {
  it('detects Mercadona by NIF with highest confidence', () => {
    const result = detectChainFromText('MERCADONA, S.A.\nNIF: A-46103834\nC/ MAYOR 15');
    expect(result.chainId).toBe('mercadona');
    expect(result.detectionMethod).toBe('nif');
    expect(result.confidence).toBeGreaterThanOrEqual(90);
  });

  it('detects Mercadona by name when NIF is absent', () => {
    const result = detectChainFromText('MERCADONA, S.A.\nGRACIAS POR SU VISITA');
    expect(result.chainId).toBe('mercadona');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('detects Lidl by NIF', () => {
    const result = detectChainFromText('LIDL SUPERMERCADOS S.A.U.\nNIF A60195278');
    expect(result.chainId).toBe('lidl');
  });

  it('detects Mercadona by own-brand fingerprints', () => {
    const result = detectChainFromText('1 GEL HACENDADO 1,50\n1 CHAMPU DELIPLUS 2,20');
    expect(result.chainId).toBe('mercadona');
    expect(result.detectionMethod).toBe('fingerprint');
  });

  it('returns no chain for unknown stores', () => {
    const result = detectChainFromText('SUPERMERCADO LOPEZ\nCALLE FALSA 123');
    expect(result.chainId).toBeNull();
    expect(result.detectionMethod).toBe('none');
  });
});

describe('detectChainFromLines', () => {
  it('detects chain from line array', () => {
    const result = detectChainFromLines(['MERCADONA, S.A.', 'NIF: A-46103834']);
    expect(result.chainId).toBe('mercadona');
  });
});
