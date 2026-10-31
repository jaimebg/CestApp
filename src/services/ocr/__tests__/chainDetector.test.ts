import { getAllTemplates, getChainTemplate, type ChainTemplate } from '../../../config/countries';
import { detectChainFromText, detectChainFromLines, findTemplateByTaxId } from '../chainDetector';

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

describe('chain and country together', () => {
  const lidlPt: ChainTemplate = {
    ...getChainTemplate('ES', 'lidl')!,
    country: 'PT',
    nifPatterns: ['503340855'],
  };
  const templates = [...getAllTemplates(), lidlPt];

  it('a Spanish NIF yields chain and country', () => {
    expect(detectChainFromText('MERCADONA\nA-46103834', { templates })).toMatchObject({
      chainId: 'mercadona',
      countryCode: 'ES',
    });
  });

  it('a Portuguese NIF picks the Portuguese template of the same chain', () => {
    expect(detectChainFromText('LIDL\nNIF 503340855', { templates }).chain?.country).toBe('PT');
  });

  it('a name shared across countries is settled by country signals', () => {
    expect(detectChainFromText('LIDL\nOBRIGADO\nTROCO 0,50', { templates }).countryCode).toBe('PT');
    expect(detectChainFromText('LIDL\nGRACIAS\nEFECTIVO', { templates }).countryCode).toBe('ES');
  });

  it('a tax id hint wins over the text', () => {
    expect(detectChainFromText('TICKET', { templates, taxIdHint: '503340855' }).countryCode).toBe(
      'PT'
    );
  });

  it('a NIF inside a longer number does not match', () => {
    expect(findTemplateByTaxId('REF 15033408559', templates)).toBeNull();
  });
});

describe('a chain from another country', () => {
  it('does not apply a Spanish template to a receipt with a Portuguese tax ID', () => {
    const result = detectChainFromText(
      'MERCADONA\nNIF: 510962750\nIVA 23%\nATCUD:AB12-1\nOBRIGADO'
    );
    expect(result).toMatchObject({ chainId: null, countryCode: null });
  });

  it('still recognises a Spanish receipt by name', () => {
    expect(detectChainFromText('MERCADONA, S.A.\nGRACIAS POR SU VISITA').chainId).toBe('mercadona');
  });
});

describe('tax IDs touching punctuation', () => {
  it('finds a NIF glued to a dotted label', () => {
    expect(detectChainFromText('C.I.F.A-46103834').chainId).toBe('mercadona');
  });

  it('finds a NIF followed by a dot', () => {
    expect(detectChainFromText('A46103834.TEL 900').chainId).toBe('mercadona');
  });

  it('finds a NIF printed with thousands dots', () => {
    expect(findTemplateByTaxId('NIF A-46.103.834')?.chainId).toBe('mercadona');
  });
});
