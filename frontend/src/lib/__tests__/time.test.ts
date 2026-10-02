import { describe, expect, it } from '@jest/globals';
import { duration, timeAgo } from '@/lib/time';

const now = new Date('2026-09-30T12:00:00Z');
const before = (milliseconds: number) => new Date(now.getTime() - milliseconds).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('timeAgo', () => {
  it('says how long ago, in the largest whole unit', () => {
    expect(timeAgo(before(30_000), now)).toBe('Just now');
    expect(timeAgo(before(MINUTE), now)).toBe('1 minute ago');
    expect(timeAgo(before(45 * MINUTE), now)).toBe('45 minutes ago');
    expect(timeAgo(before(3 * HOUR), now)).toBe('3 hours ago');
    expect(timeAgo(before(DAY + HOUR), now)).toBe('Yesterday');
    expect(timeAgo(before(6 * DAY), now)).toBe('6 days ago');
  });

  it('gives the date after a week, with the year only when it differs', () => {
    expect(timeAgo('2026-03-12T12:00:00Z', now)).toMatch(/12 Mar|Mar 12/);
    expect(timeAgo('2026-03-12T12:00:00Z', now)).not.toMatch(/2026/);
    expect(timeAgo('2025-03-12T12:00:00Z', now)).toMatch(/2025/);
  });

  it("treats a time a moment in the future, from a clock that's slightly off, as just now", () => {
    expect(timeAgo(before(-5_000), now)).toBe('Just now');
  });
});

describe('duration', () => {
  it.each([
    [48, '48 s'],
    [60, '1 min 0 s'],
    [411.4, '6 min 51 s'],
    [-3, '0 s'],
  ])('says %d seconds as "%s"', (seconds, text) => {
    expect(duration(seconds)).toBe(text);
  });
});
