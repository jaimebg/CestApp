import { mergePages } from '../pagination';

describe('mergePages', () => {
  const first = [{ id: 1 }, { id: 2 }];
  const second = [{ id: 2 }, { id: 3 }];

  it('replaces when reset is true', () => {
    expect(mergePages(first, second, true, (i) => i.id)).toEqual([{ id: 2 }, { id: 3 }]);
  });

  it('appends deduped when reset is false', () => {
    expect(mergePages(first, second, false, (i) => i.id)).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
  });

  it('returns next when previous is empty', () => {
    expect(mergePages([], second, false, (i) => i.id)).toEqual([{ id: 2 }, { id: 3 }]);
  });
});
