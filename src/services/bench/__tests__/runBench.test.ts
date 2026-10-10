import { reportFileName, runBench } from '../runBench';
import type { MlkitText } from '../../ocr/imageOcr';
import { fakeIo, ioFromFiles, MERCADONA_TRUTH, mercadonaRecord } from './benchFixtures';

const META = { createdAt: new Date('2026-10-11T10:22:03.120Z'), commit: 'abc1234' };

describe('runBench', () => {
  it('scores every capture its truth lists', () => {
    const { io, saved } = fakeIo([mercadonaRecord('m1'), mercadonaRecord('m2')], [MERCADONA_TRUTH]);

    const run = runBench(io, META);

    expect(run.report.overall.captures).toBe(2);
    expect(run.report.overall.fullyCorrect).toBe(1);
    expect(run.report.overall.stability.total).toBe(1);
    expect(saved).toEqual([
      { fileName: '2026-10-11T10-22-03-120Z-abc1234.json', report: run.report },
    ]);
  });

  it('reports captures no truth claims, and claimed captures that are absent', () => {
    const { io } = fakeIo([mercadonaRecord('m1'), mercadonaRecord('m3')], [MERCADONA_TRUTH]);

    const { report } = runBench(io, META);

    expect(report.unassigned).toEqual(['m3']);
    expect(report.missing).toEqual(['m2']);
  });

  it('refuses a capture claimed by two tickets', () => {
    const { io } = fakeIo(
      [mercadonaRecord('m1')],
      [MERCADONA_TRUTH, { ...MERCADONA_TRUTH, ticket: 'other', captures: ['m1'] }]
    );

    expect(() => runBench(io, META)).toThrow('m1 is listed in both mercadona-photo and other');
  });

  it('refuses a record from another schema version', () => {
    const { io } = fakeIo([{ ...mercadonaRecord('m1'), schemaVersion: 2 }], [MERCADONA_TRUTH]);

    expect(() => runBench(io, META)).toThrow('schema version 2');
  });

  it('keeps going when one capture fails to replay', () => {
    const broken = { ...mercadonaRecord('m2'), raw: { text: 'x' } as unknown as MlkitText };
    const { io } = fakeIo([mercadonaRecord('m1'), broken], [MERCADONA_TRUTH]);

    const { report } = runBench(io, META);

    expect(report.records.find((r) => r.id === 'm1')?.fullyCorrect).toBe(true);
    expect(report.records.find((r) => r.id === 'm2')?.error).toEqual(expect.any(String));
  });

  it('lists a capture file it cannot read and scores the rest', () => {
    const { io } = ioFromFiles(
      [
        { name: 'm1.json', text: JSON.stringify(mercadonaRecord('m1')) },
        { name: 'm2.json', text: '{"schemaVersion": 1, "id": "m2", "raw": {"te' },
      ],
      [{ name: 'mercadona-photo.json', text: JSON.stringify(MERCADONA_TRUTH) }]
    );

    const { report } = runBench(io, META);

    expect(report.unreadable).toEqual([{ file: 'm2.json', error: expect.any(String) }]);
    expect(report.records.map((r) => r.id)).toEqual(['m1']);
    expect(report.missing).toEqual(['m2']);
  });

  it('names a truth file that is not valid JSON', () => {
    const { io } = ioFromFiles([], [{ name: 'mercadona-photo.json', text: '{"ticket": ' }]);

    expect(() => runBench(io, META)).toThrow('Truth file mercadona-photo.json is not valid JSON');
  });

  it('names a truth file without its lists', () => {
    const { io } = ioFromFiles([], [{ name: 'mercadona-photo.json', text: '{"ticket": "x"}' }]);

    expect(() => runBench(io, META)).toThrow(
      'Truth file mercadona-photo.json needs "items" and "captures" lists'
    );
  });

  it('compares against the previous report when there is one', () => {
    const first = runBench(fakeIo([mercadonaRecord('m1')], [MERCADONA_TRUTH]).io, META);
    const { io } = fakeIo([mercadonaRecord('m1')], [MERCADONA_TRUTH], first.report);

    expect(runBench(io, META).text).toContain('Against abc1234');
  });
});

describe('reportFileName', () => {
  it('keeps two runs on the same commit apart', () => {
    const a = reportFileName(new Date('2026-10-11T10:00:00.000Z'), 'abc1234-dirty');
    const b = reportFileName(new Date('2026-10-11T10:05:00.000Z'), 'abc1234-dirty');

    expect(a).not.toBe(b);
    expect([b, a].sort()).toEqual([a, b]);
  });
});
