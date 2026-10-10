import { compareReports, formatReport, summarizeTickets } from './report';
import { replayRecord } from './replay';
import { scoreRecord } from './score';
import {
  BENCH_SCHEMA_VERSION,
  type BenchIo,
  type BenchRecord,
  type BenchReport,
  type RecordScore,
  type TruthTicket,
} from './types';

export interface BenchRun {
  report: BenchReport;
  fileName: string;
  text: string;
}

/** Timestamp first, so file names sort in the order the runs happened. */
export function reportFileName(createdAt: Date, commit: string): string {
  return `${createdAt.toISOString().replace(/[:.]/g, '-')}-${commit}.json`;
}

function ticketsByCapture(truths: TruthTicket[]): Map<string, TruthTicket> {
  const owners = new Map<string, TruthTicket>();
  for (const truth of truths) {
    for (const id of truth.captures) {
      const owner = owners.get(id);
      if (owner) {
        throw new Error(`Capture ${id} is listed in both ${owner.ticket} and ${truth.ticket}`);
      }
      owners.set(id, truth);
    }
  }
  return owners;
}

function scoreCapture(record: BenchRecord, truth: TruthTicket): RecordScore {
  try {
    return scoreRecord(record.id, replayRecord(record), truth);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return scoreRecord(record.id, null, truth, reason);
  }
}

/**
 * Replays every capture a truth file claims, scores it, saves the report and
 * returns it as text, compared with the newest report before it.
 */
export function runBench(io: BenchIo, meta: { createdAt: Date; commit: string }): BenchRun {
  const owners = ticketsByCapture(io.truths());
  const records = io.captures();

  for (const record of records) {
    if (record.schemaVersion !== BENCH_SCHEMA_VERSION) {
      throw new Error(
        `Capture ${record.id} has schema version ${record.schemaVersion}; this benchmark reads version ${BENCH_SCHEMA_VERSION}`
      );
    }
  }

  const scores: RecordScore[] = [];
  const unassigned: string[] = [];
  for (const record of records) {
    const truth = owners.get(record.id);
    if (truth) {
      scores.push(scoreCapture(record, truth));
    } else {
      unassigned.push(record.id);
    }
  }

  const present = new Set(records.map((record) => record.id));
  const missing = [...owners.keys()].filter((id) => !present.has(id));

  const report: BenchReport = {
    createdAt: meta.createdAt.toISOString(),
    commit: meta.commit,
    ...summarizeTickets(scores),
    records: scores,
    unassigned,
    missing,
  };

  const previous = io.previousReport();
  const fileName = reportFileName(meta.createdAt, meta.commit);
  io.saveReport(fileName, report);

  const text = previous
    ? `${formatReport(report)}\n\n${compareReports(previous, report)}`
    : formatReport(report);

  return { report, fileName, text };
}
