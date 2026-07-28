import { useCallback, useEffect, useRef, useState } from 'react';
import { getChainTemplate } from '@/src/config/spanishChains';
import { recordLlmAutoApplied, recordLlmFeedback } from '@/src/db/queries/parsingFeedback';
import { isLlmAvailable, mergeParsedReceipts, structureReceipt } from '@/src/services/llm';
import { decideOutcome, shouldRefine } from '@/src/services/llm/trigger';
import type { ParsedReceipt } from '@/src/services/ocr/parser';
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
}

interface Params {
  initial: ParsedReceipt | null;
  lines: string[];
  detectedTotal: number | null;
  hasUserEdited: boolean;
  onApply: (receipt: ParsedReceipt) => void;
}

export function useLlmRefinement({
  initial,
  lines,
  detectedTotal,
  hasUserEdited,
  onApply,
}: Params): LlmRefinement {
  const enabled = usePreferencesStore((state) => state.llmRefinementEnabled);
  const [status, setStatus] = useState<RefinementStatus>('idle');
  const [proposal, setProposal] = useState<ParsedReceipt | null>(null);

  const hasRun = useRef(false);
  const editedRef = useRef(hasUserEdited);
  const unmountedRef = useRef(false);

  useEffect(() => {
    editedRef.current = hasUserEdited;
  }, [hasUserEdited]);

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

        const { merged, outcome } = mergeParsedReceipts(initial, llmResult, lines, detectedTotal);
        const decision = decideOutcome(outcome, editedRef.current);
        logger.log('Refinement decision:', decision);

        if (decision === 'apply') {
          recordLlmAutoApplied({
            ocrContext: initial.rawText,
            originalValue: JSON.stringify(initial.items),
            correctedValue: JSON.stringify(merged.items),
            originalConfidence: initial.confidence,
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
  }, [enabled, initial, lines, detectedTotal, onApply]);

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
    onApply(proposal);
    setProposal(null);
    setStatus('applied');
  }, [proposal, onApply, logFeedback]);

  const dismissProposal = useCallback(() => {
    if (proposal) logFeedback(false, proposal);
    setProposal(null);
    setStatus('idle');
  }, [proposal, logFeedback]);

  const undoApplied = useCallback(() => {
    if (initial) onApply(initial);
    setStatus('idle');
  }, [initial, onApply]);

  return { status, proposal, acceptProposal, dismissProposal, undoApplied };
}
