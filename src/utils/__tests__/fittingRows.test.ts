import { fittingRows } from '../fittingRows';

const base = { viewportHeight: 800, rowHeight: 72, min: 3, max: 8 };

describe('fittingRows', () => {
  it('counts only the rows that fit below the list top', () => {
    expect(fittingRows({ ...base, listTop: 300, parentTop: 0 })).toBe(6);
  });

  it('measures the list top from the scroll content, not from its wrapper', () => {
    expect(fittingRows({ ...base, listTop: 300, parentTop: 59 })).toBe(6);
    expect(fittingRows({ ...base, listTop: 340, parentTop: 59 })).toBe(5);
  });

  it('keeps the minimum before layout and caps at the maximum', () => {
    expect(fittingRows({ ...base, viewportHeight: 0, listTop: 0, parentTop: 0 })).toBe(3);
    expect(fittingRows({ ...base, viewportHeight: 4000, listTop: 0, parentTop: 0 })).toBe(8);
  });
});
