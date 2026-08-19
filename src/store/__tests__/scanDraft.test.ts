import { useScanDraftStore, type ScanDraft } from '../scanDraft';
import type { ZoneDefinition } from '../../types/zones';

const DRAFT: ScanDraft = {
  uri: 'file:///receipt.jpg',
  source: 'gallery',
  isPdf: false,
  ocrText: 'MERCADONA\nTOTAL 5,42',
  lines: ['MERCADONA', 'TOTAL 5,42'],
  blocks: [],
  dimensions: { width: 612, height: 1122 },
  zones: [],
  detectedTotal: 5.42,
};

const ZONE: ZoneDefinition = {
  id: 'z1',
  type: 'total',
  boundingBox: { x: 0.1, y: 0.8, width: 0.8, height: 0.05 },
  isRequired: false,
};

describe('the scan draft', () => {
  afterEach(() => useScanDraftStore.getState().reset());

  it('starts empty, so a review screen opened cold has nothing to show', () => {
    expect(useScanDraftStore.getState().draft).toBeNull();
  });

  it('holds the capture the review screen reads', () => {
    useScanDraftStore.getState().setDraft(DRAFT);

    expect(useScanDraftStore.getState().draft).toEqual(DRAFT);
  });

  it('takes redrawn zones without disturbing the rest of the capture', () => {
    useScanDraftStore.getState().setDraft(DRAFT);

    useScanDraftStore.getState().setZones([ZONE]);

    const draft = useScanDraftStore.getState().draft;
    expect(draft?.zones).toEqual([ZONE]);
    expect(draft?.lines).toEqual(DRAFT.lines);
  });

  it('ignores zones drawn after the draft was let go', () => {
    useScanDraftStore.getState().setZones([ZONE]);

    expect(useScanDraftStore.getState().draft).toBeNull();
  });

  it('is emptied when the scan flow ends', () => {
    useScanDraftStore.getState().setDraft(DRAFT);

    useScanDraftStore.getState().reset();

    expect(useScanDraftStore.getState().draft).toBeNull();
  });
});
