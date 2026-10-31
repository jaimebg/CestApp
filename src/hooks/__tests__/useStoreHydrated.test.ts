import { act, renderHook } from '@testing-library/react-native';
import { useStoreHydrated } from '../useStoreHydrated';

function persistThatHydratesBeforeSubscribing() {
  let hydrated = false;
  return {
    hasHydrated: jest.fn(() => {
      const value = hydrated;
      hydrated = true;
      return value;
    }),
    onFinishHydration: jest.fn(() => () => {}),
  };
}

describe('useStoreHydrated', () => {
  it('notices a hydration that finished between render and subscription', () => {
    const persist = persistThatHydratesBeforeSubscribing();
    const { result } = renderHook(() => useStoreHydrated(persist));
    expect(result.current).toBe(true);
  });

  it('turns true when hydration finishes later', () => {
    let finish: () => void = () => {};
    const persist = {
      hasHydrated: () => false,
      onFinishHydration: (listener: () => void) => {
        finish = listener;
        return () => {};
      },
    };
    const { result } = renderHook(() => useStoreHydrated(persist));
    expect(result.current).toBe(false);
    act(() => finish());
    expect(result.current).toBe(true);
  });
});
