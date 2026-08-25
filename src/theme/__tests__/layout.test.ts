import { fitInBox, resolveLayout } from '../layout';

describe('resolveLayout', () => {
  it('treats a phone as compact in both orientations', () => {
    expect(resolveLayout({ width: 440, height: 956 }).isTablet).toBe(false);
    expect(resolveLayout({ width: 956, height: 440 }).isTablet).toBe(false);
  });

  it('treats a tablet as a tablet in both orientations', () => {
    expect(resolveLayout({ width: 744, height: 1133 }).isTablet).toBe(true);
    expect(resolveLayout({ width: 1133, height: 744 }).isTablet).toBe(true);
  });

  it('switches on the shortest side, not the width', () => {
    expect(resolveLayout({ width: 2000, height: 599 }).isTablet).toBe(false);
    expect(resolveLayout({ width: 2000, height: 600 }).isTablet).toBe(true);
  });

  it('caps reading width so wide screens do not stretch body text', () => {
    expect(resolveLayout({ width: 1133, height: 744 }).readingWidth).toBe(640);
    expect(resolveLayout({ width: 390, height: 844 }).readingWidth).toBe(390);
  });

  it('offers a second column only once the grid is wide enough', () => {
    expect(resolveLayout({ width: 899, height: 600 }).columns).toBe(1);
    expect(resolveLayout({ width: 900, height: 600 }).columns).toBe(2);
  });

  it('widens the content column only once a grid forms', () => {
    expect(resolveLayout({ width: 899, height: 600 }).contentWidth).toBe(640);
    expect(resolveLayout({ width: 900, height: 600 }).contentWidth).toBe(900);
  });

  it('caps the content column at the grid maximum, never the screen', () => {
    expect(resolveLayout({ width: 1133, height: 744 }).contentWidth).toBe(1080);
    expect(resolveLayout({ width: 390, height: 844 }).contentWidth).toBe(390);
  });

  it('reports orientation', () => {
    expect(resolveLayout({ width: 1133, height: 744 }).isLandscape).toBe(true);
    expect(resolveLayout({ width: 744, height: 1133 }).isLandscape).toBe(false);
  });
});

describe('fitInBox', () => {
  it('binds a tall receipt by height, not width', () => {
    const box = fitInBox({ aspect: 0.53, maxWidth: 1101, maxHeight: 410 });
    expect(box.height).toBeCloseTo(410, 5);
    expect(box.width).toBeCloseTo(217.3, 1);
  });

  it('binds a wide image by width', () => {
    const box = fitInBox({ aspect: 2, maxWidth: 300, maxHeight: 400 });
    expect(box.width).toBe(300);
    expect(box.height).toBe(150);
  });

  it('never exceeds either bound', () => {
    for (const aspect of [0.3, 0.53, 1, 1.8, 3]) {
      const box = fitInBox({ aspect, maxWidth: 500, maxHeight: 500 });
      expect(box.width).toBeLessThanOrEqual(500);
      expect(box.height).toBeLessThanOrEqual(500);
    }
  });

  it('rejects a non-positive aspect', () => {
    expect(() => fitInBox({ aspect: 0, maxWidth: 10, maxHeight: 10 })).toThrow(/aspect/);
  });
});
