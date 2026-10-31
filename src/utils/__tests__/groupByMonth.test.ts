import { groupByMonth } from '../groupByMonth';

type Row = { id: number; date: Date | null };

const rows: Row[] = [
  { id: 1, date: new Date(2026, 9, 30) },
  { id: 2, date: new Date(2026, 9, 2) },
  { id: 3, date: new Date(2026, 8, 26) },
];

const group = (items: Row[]) =>
  groupByMonth(
    items,
    (row) => row.date,
    (row) => String(row.id)
  );

describe('groupByMonth', () => {
  it('puts a month header before the first row of each month', () => {
    expect(group(rows).map((entry) => entry.key)).toEqual([
      'month-2026-10',
      '1',
      '2',
      'month-2026-09',
      '3',
    ]);
  });

  it('carries the month on each header', () => {
    const header = group(rows)[0];
    expect(header).toEqual({ type: 'header', key: 'month-2026-10', date: new Date(2026, 9, 1) });
  });

  it('gathers undated rows under one header at the end', () => {
    const entries = group([{ id: 4, date: null }, ...rows]);
    expect(entries.slice(-2).map((entry) => entry.key)).toEqual(['month-none', '4']);
    expect(entries.filter((entry) => entry.key === 'month-none')).toHaveLength(1);
  });
});
