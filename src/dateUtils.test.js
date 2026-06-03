import { getTodayISO, isYesterday, parseRecordDate, parseISODate } from './dateUtils';

describe('dateUtils', () => {
  test('parseISODate parses valid ISO dates', () => {
    const parsed = parseISODate('2026-05-04');
    expect(parsed).not.toBeNull();
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(4);
  });

  test('getTodayISO uses local date format', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(getTodayISO()).toBe(expected);
  });

  test('isYesterday detects adjacent days', () => {
    expect(isYesterday('2026-05-03', '2026-05-04')).toBe(true);
    expect(isYesterday('2026-05-02', '2026-05-04')).toBe(false);
  });

  test('parseRecordDate handles ISO date', () => {
    expect(parseRecordDate('2026-05-04')).toEqual({ year: 2026, month: 5, day: 4 });
  });

  test('parseRecordDate handles year-first slash date', () => {
    expect(parseRecordDate('2026/5/4')).toEqual({ year: 2026, month: 5, day: 4 });
  });

  test('parseRecordDate handles month-first slash date', () => {
    expect(parseRecordDate('5/4/2026')).toEqual({ year: 2026, month: 5, day: 4 });
  });

  test('parseRecordDate handles datetime format from records table', () => {
    expect(parseRecordDate('2026-05-04 13:28:28')).toEqual({ year: 2026, month: 5, day: 4 });
  });
});
