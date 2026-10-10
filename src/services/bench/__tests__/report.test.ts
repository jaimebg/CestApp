import { compareReports, formatReport, summarize, summarizeTickets } from '../report';
import type { BenchReport } from '../types';
import { score } from './benchFixtures';

function report(overrides: Partial<BenchReport> = {}): BenchReport {
  const scores = [score({ id: 'a', ticket: 'one' })];
  return {
    createdAt: '2026-10-11T10:00:00.000Z',
    commit: 'abc1234',
    ...summarizeTickets(scores),
    records: scores,
    unassigned: [],
    missing: [],
    ...overrides,
  };
}

describe('summarize', () => {
  it('pools rates over captures', () => {
    const metrics = summarize([
      score(),
      score({ total: false, fullyCorrect: false, itemsFound: 1, itemsMissing: 1, itemsExtra: 1 }),
    ]);

    expect(metrics.captures).toBe(2);
    expect(metrics.total).toBe(0.5);
    expect(metrics.fullyCorrect).toBe(0.5);
    expect(metrics.itemRecall).toBe(3 / 4);
    expect(metrics.itemPrecision).toBe(3 / 4);
  });

  it('reports no precision rather than perfect precision when nothing was read', () => {
    expect(
      summarize([score({ itemsFound: 0, itemsMissing: 2, itemsExtra: 0 })]).itemPrecision
    ).toBe(0);
  });
});

describe('summarizeTickets', () => {
  it('averages stability over tickets instead of pooling different receipts', () => {
    const { overall, tickets } = summarizeTickets([
      score({ id: 'a1', ticket: 'a', answers: { ...score().answers, total: 100 } }),
      score({ id: 'a2', ticket: 'a', answers: { ...score().answers, total: 100 } }),
      score({ id: 'b1', ticket: 'b', answers: { ...score().answers, total: 200 } }),
      score({ id: 'b2', ticket: 'b', answers: { ...score().answers, total: 300 } }),
    ]);

    expect(tickets.map((t) => t.metrics.stability.total)).toEqual([1, 0.5]);
    expect(overall.stability.total).toBe(0.75);
    expect(overall.captures).toBe(4);
  });
});

describe('formatReport', () => {
  it('lists each ticket, the overall line, and anything left out', () => {
    const text = formatReport(
      report({
        unassigned: ['x9'],
        missing: ['m7'],
        records: [score({ id: 'a', ticket: 'one', error: 'boom' })],
      })
    );

    expect(text).toContain('one');
    expect(text).toContain('overall');
    expect(text).toContain('x9');
    expect(text).toContain('m7');
    expect(text).toContain('Replay failed for a: boom');
  });
});

describe('compareReports', () => {
  it('shows each metric before and after, in points', () => {
    const previous = report({ overall: { ...report().overall, total: 0.5 } });
    const current = report({ overall: { ...report().overall, total: 0.75 } });

    expect(compareReports(previous, current)).toContain('50% → 75%  (+25 pts)');
  });

  it('shows the capture counts, so adding photos is not read as a gain', () => {
    const previous = report({ overall: { ...report().overall, captures: 40 } });
    const current = report({ overall: { ...report().overall, captures: 50 } });

    expect(compareReports(previous, current)).toContain('captures        40 → 50');
  });
});
