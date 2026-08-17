import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Leaves the scan flow for the receipt that was just saved.
 *
 * `replace` rather than `dismissAll()` followed by `push`. Expo Router resolves
 * an href against the navigator where the target and the current stack diverge:
 * `/receipt/:id` and `/scan/...` differ at the root, so both actions target the
 * root stack. `push` appends, leaving the scan route underneath, and pairing it
 * with `dismissAll` does not help because the action is built from
 * `navigationRef.getRootState()`, which still reports the un-popped stack when
 * both are dispatched in the same batch.
 *
 * `replace` swaps the root's active `scan` route for `receipt` in a single
 * action, so the root stack becomes [(tabs), receipt/:id] and Back returns to
 * the tabs instead of re-entering review.
 */
export function openSavedReceipt(router: Router, receiptId: number): void {
  router.replace(`/receipt/${receiptId}`);
}
