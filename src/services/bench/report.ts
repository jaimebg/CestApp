import { stability } from './score';
import type { BenchReport, Metrics, RecordScore, TicketSummary } from './types';

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

function share(scores: RecordScore[], pick: (score: RecordScore) => boolean): number {
  return ratio(scores.filter(pick).length, scores.length);
}

function sum(scores: RecordScore[], pick: (score: RecordScore) => number): number {
  return scores.reduce((total, score) => total + pick(score), 0);
}

export function summarize(scores: RecordScore[]): Metrics {
  const found = sum(scores, (s) => s.itemsFound);
  const missing = sum(scores, (s) => s.itemsMissing);
  const extra = sum(scores, (s) => s.itemsExtra);

  return {
    captures: scores.length,
    store: share(scores, (s) => s.store),
    date: share(scores, (s) => s.date),
    total: share(scores, (s) => s.total),
    itemRecall: ratio(found, found + missing),
    itemPrecision: ratio(found, found + extra),
    fullyCorrect: share(scores, (s) => s.fullyCorrect),
    stability: {
      store: stability(scores.map((s) => s.answers.store)),
      date: stability(scores.map((s) => s.answers.date)),
      total: stability(scores.map((s) => s.answers.total)),
      items: stability(scores.map((s) => s.answers.items)),
    },
  };
}

function mean(values: number[]): number {
  return ratio(
    values.reduce((total, value) => total + value, 0),
    values.length
  );
}

/**
 * Per-ticket metrics, plus an overall line whose rates pool every capture but
 * whose stability averages the tickets'. Agreement between captures of
 * different receipts means nothing.
 */
export function summarizeTickets(scores: RecordScore[]): {
  tickets: TicketSummary[];
  overall: Metrics;
} {
  const byTicket = new Map<string, RecordScore[]>();
  for (const score of scores) {
    byTicket.set(score.ticket, [...(byTicket.get(score.ticket) ?? []), score]);
  }

  const tickets = [...byTicket.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ticket, group]) => ({ ticket, metrics: summarize(group) }));

  const stabilities = tickets.map((t) => t.metrics.stability);

  return {
    tickets,
    overall: {
      ...summarize(scores),
      stability: {
        store: mean(stabilities.map((s) => s.store)),
        date: mean(stabilities.map((s) => s.date)),
        total: mean(stabilities.map((s) => s.total)),
        items: mean(stabilities.map((s) => s.items)),
      },
    },
  };
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const HEADER = [
  'ticket',
  'n',
  'store',
  'date',
  'total',
  'recall',
  'prec',
  'full',
  'st.store',
  'st.date',
  'st.total',
  'st.items',
];

function row(name: string, m: Metrics): string[] {
  return [
    name,
    String(m.captures),
    pct(m.store),
    pct(m.date),
    pct(m.total),
    pct(m.itemRecall),
    pct(m.itemPrecision),
    pct(m.fullyCorrect),
    pct(m.stability.store),
    pct(m.stability.date),
    pct(m.stability.total),
    pct(m.stability.items),
  ];
}

export function formatReport(report: BenchReport): string {
  const rows = [
    HEADER,
    ...report.tickets.map((t) => row(t.ticket, t.metrics)),
    row('overall', report.overall),
  ];
  const widths = HEADER.map((_, col) => Math.max(...rows.map((r) => r[col].length)));
  const table = rows
    .map((r) =>
      r
        .map((cell, col) => (col === 0 ? cell.padEnd(widths[col]) : cell.padStart(widths[col])))
        .join('  ')
    )
    .join('\n');

  const notes = ['st.* = share of captures agreeing with the most common answer'];
  if (report.unassigned.length > 0) {
    notes.push(`In no truth file: ${report.unassigned.join(', ')}`);
  }
  if (report.missing.length > 0) {
    notes.push(`Listed in truth but not found: ${report.missing.join(', ')}`);
  }
  for (const record of report.records) {
    if (record.error) notes.push(`Replay failed for ${record.id}: ${record.error}`);
  }

  return [table, '', ...notes].join('\n');
}

const COMPARED: [string, (m: Metrics) => number][] = [
  ['store', (m) => m.store],
  ['date', (m) => m.date],
  ['total', (m) => m.total],
  ['item recall', (m) => m.itemRecall],
  ['item precision', (m) => m.itemPrecision],
  ['fully correct', (m) => m.fullyCorrect],
  ['stable store', (m) => m.stability.store],
  ['stable date', (m) => m.stability.date],
  ['stable total', (m) => m.stability.total],
  ['stable items', (m) => m.stability.items],
];

export function compareReports(previous: BenchReport, current: BenchReport): string {
  const lines = COMPARED.map(([label, pick]) => {
    const before = pick(previous.overall);
    const after = pick(current.overall);
    const delta = Math.round((after - before) * 100);
    const sign = delta > 0 ? '+' : '';
    return `${label.padEnd(15)} ${pct(before)} → ${pct(after)}  (${sign}${delta} pts)`;
  });

  return [
    `Against ${previous.commit} (${previous.createdAt}):`,
    `${'captures'.padEnd(15)} ${previous.overall.captures} → ${current.overall.captures}`,
    ...lines,
  ].join('\n');
}
