import { useEffect, useState } from 'react';

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (listener: () => void) => () => void;
};

/**
 * Whether a persisted store has loaded from storage.
 *
 * Hydration can finish after the first render but before the effect subscribes,
 * and `onFinishHydration` does not replay; the check after subscribing catches
 * that window, which otherwise left the app on a blank screen for good.
 */
export function useStoreHydrated(persist: PersistApi): boolean {
  const [hydrated, setHydrated] = useState(persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = persist.onFinishHydration(() => setHydrated(true));
    if (persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, [persist]);

  return hydrated;
}
