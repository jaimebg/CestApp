import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { getChainTemplate } from '@/src/config/spanishChains';
import { recordLlmAutoApplied, recordLlmFeedback } from '@/src/db/queries/parsingFeedback';
import { isLlmAvailable, mergeParsedReceipts, structureReceipt } from '@/src/services/llm';
import { decideOutcome, shouldRefine } from '@/src/services/llm/trigger';
import { validateReceipt, type ParsedReceipt } from '@/src/services/ocr/parser';
import { usePreferencesStore } from '@/src/store/preferences';
import { createScopedLogger } from '@/src/utils/debug';

const logger = createScopedLogger('LlmRefinement');

export type RefinementStatus = 'idle' | 'running' | 'applied' | 'proposed';

export interface LlmRefinement {
  status: RefinementStatus;
  proposal: ParsedReceipt | null;
  acceptProposal: () => void;
  dismissProposal: () => void;
  undoApplied: () => void;
  markEdited: () => void;
}

interface Params {
  initial: ParsedReceipt | null;
  currentRef: RefObject<ParsedReceipt | null>;
  lines: string[];
  detectedTotal: number | null;
  onApply: (receipt: ParsedReceipt) => void;
}

export function useLlmRefinement({
  initial,
  currentRef,
  lines,
  detectedTotal,
  onApply,
}: Params): LlmRefinement {
  const enabled = usePreferencesStore((state) => state.llmRefinementEnabled);
  const [status, setStatus] = useState<RefinementStatus>('idle');
  const [proposal, setProposal] = useState<ParsedReceipt | null>(null);

  const hasRun = useRef(false);
  const editedRef = useRef(false);
  const unmountedRef = useRef(false);

  /**
   * Exposed so edit handlers (event callbacks, not render) can flip this the
   * instant the user touches the receipt. The alternative — mirroring a
   * `hasUserEdited` prop into this ref from a passive effect — leaves a
   * window between the edit's `setState` call and that effect's flush where
   * a same-tick-resolving refinement would still read `false` and auto-apply
   * over the edit. A direct write from the handler itself has no such
   * window: it lands before the refinement's `.then()` can possibly run.
   */
  const markEdited = useCallback(() => {
    editedRef.current = true;
  }, []);

  /**
   * Tracked separately from the dispatch effect below so that a dependency
   * change on that effect (e.g. a caller passing a freshly-created `lines`
   * or `onApply` reference) can never be mistaken for real unmount: React
   * re-runs an effect's cleanup on every dependency change, not only on
   * unmount, but this effect's own dependency array is empty, so its
   * cleanup only fires when the component genuinely unmounts.
   */
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    if (!enabled || !initial || !isLlmAvailable()) return;
    if (!shouldRefine(initial)) return;

    hasRun.current = true;
    setStatus('running');

    const chainTemplate = initial.chainId ? getChainTemplate(initial.chainId) : null;
    const hint = initial.chainId
      ? {
          chainId: initial.chainId,
          chainName: initial.chainName || '',
          isColumnar: chainTemplate?.layout.type === 'columnar',
        }
      : undefined;

    structureReceipt(lines, hint)
      .then((llmResult) => {
        if (unmountedRef.current) return;
        if (!llmResult) {
          setStatus('idle');
          return;
        }

        /**
         * Merged against the live receipt (`currentRef.current`), not the
         * `initial` snapshot captured when this effect dispatched:
         * `structureReceipt` takes seconds, while a store template can apply
         * in the meantime in milliseconds (two SQLite queries). Merging
         * against a stale `initial` would silently overwrite that template's
         * result — the template's item count is exactly what makes
         * `mergeParsedReceipts`'s `losesItems` check meaningful. Falls back
         * to `initial` only for the render where nothing has been written to
         * the ref yet.
         */
        const baseline = currentRef.current ?? initial;
        const { merged, outcome } = mergeParsedReceipts(baseline, llmResult, lines, detectedTotal);
        const decision = decideOutcome(outcome, editedRef.current);
        logger.log('Refinement decision:', decision);

        if (decision === 'apply') {
          recordLlmAutoApplied({
            ocrContext: baseline.rawText,
            originalValue: JSON.stringify(baseline.items),
            correctedValue: JSON.stringify(merged.items),
            originalConfidence: baseline.confidence,
          }).catch((error) => logger.warn('Feedback failed:', error));
          onApply(merged);
          setStatus('applied');
        } else if (decision === 'propose') {
          setProposal(merged);
          setStatus('proposed');
        } else {
          setStatus('idle');
        }
      })
      .catch((error) => {
        logger.warn('Refinement failed:', error);
        if (!unmountedRef.current) setStatus('idle');
      });
  }, [enabled, initial, lines, detectedTotal, onApply, currentRef]);

  const logFeedback = useCallback(
    (accepted: boolean, candidate: ParsedReceipt) => {
      if (!initial) return;
      recordLlmFeedback({
        accepted,
        ocrContext: initial.rawText,
        originalValue: JSON.stringify(initial.items),
        correctedValue: JSON.stringify(candidate.items),
        originalConfidence: initial.confidence,
      }).catch((error) => logger.warn('Feedback failed:', error));
    },
    [initial]
  );

  const acceptProposal = useCallback(() => {
    if (!proposal) return;
    logFeedback(true, proposal);

    /**
     * Overlays the proposal's items and total onto the live receipt rather
     * than applying the frozen `proposal` object outright. The diff modal
     * only ever rendered items and the total, so if the user corrected a
     * field it never showed (store name, date, time) between when this
     * proposal was computed and when they tapped accept, applying `proposal`
     * verbatim would silently revert that correction. Rebuilding from
     * `currentRef.current` guarantees accepting an item-level proposal can
     * never touch a field the modal didn't put in front of them.
     */
    const base = currentRef.current ?? proposal;
    const appliedFields: ParsedReceipt = { ...base, items: proposal.items, total: proposal.total };
    const applied: ParsedReceipt = {
      ...appliedFields,
      confidence: validateReceipt(appliedFields).confidence,
    };

    onApply(applied);
    setProposal(null);
    setStatus('applied');
  }, [proposal, currentRef, onApply, logFeedback]);

  const dismissProposal = useCallback(() => {
    if (proposal) logFeedback(false, proposal);
    setProposal(null);
    setStatus('idle');
  }, [proposal, logFeedback]);

  const undoApplied = useCallback(() => {
    if (initial) onApply(initial);
    setStatus('idle');
  }, [initial, onApply]);

  return { status, proposal, acceptProposal, dismissProposal, undoApplied, markEdited };
}
