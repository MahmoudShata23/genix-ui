/* ==========================================================================
   Calendar-date helpers
   --------------------------------------------------------------------------
   Every date here is a *calendar* date: a local-midnight `Date`. Nothing goes
   through `new Date('2026-08-24')`, which the spec parses as UTC and which
   therefore lands on the previous day for anyone west of UTC. Dates are always
   built from explicit parts instead.
   ========================================================================== */

/** A local-midnight `Date` for the given parts. */
export function gmDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

/** Strips the time, keeping the local calendar day. */
export function gmStartOfDay(date: Date): Date {
  return gmDate(date.getFullYear(), date.getMonth(), date.getDate());
}

export function gmToday(): Date {
  return gmStartOfDay(new Date());
}

export function gmIsSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) {
    return false;
  }
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function gmAddDays(date: Date, days: number): Date {
  return gmDate(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Adds months, clamping the day so 31 Jan + 1 month is 28/29 Feb rather than
 * rolling into March the way a raw `setMonth` would.
 */
export function gmAddMonths(date: Date, months: number): Date {
  const target = gmDate(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = gmDaysInMonth(target.getFullYear(), target.getMonth());
  return gmDate(
    target.getFullYear(),
    target.getMonth(),
    Math.min(date.getDate(), lastDay),
  );
}

export function gmDaysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month + 1, 0).getDate();
}

/** True when `date` falls outside an inclusive min/max range. */
export function gmIsOutOfRange(
  date: Date,
  min: Date | null,
  max: Date | null,
): boolean {
  const day = gmStartOfDay(date).getTime();
  if (min && day < gmStartOfDay(min).getTime()) {
    return true;
  }
  return !!max && day > gmStartOfDay(max).getTime();
}

/** Keeps a date inside an inclusive min/max range. */
export function gmClamp(
  date: Date,
  min: Date | null,
  max: Date | null,
): Date {
  if (min && gmStartOfDay(date) < gmStartOfDay(min)) {
    return gmStartOfDay(min);
  }
  if (max && gmStartOfDay(date) > gmStartOfDay(max)) {
    return gmStartOfDay(max);
  }
  return gmStartOfDay(date);
}

/**
 * The six-week grid shown for a month, starting on `firstDayOfWeek`
 * (0 = Sunday). Always 42 cells, so the calendar never changes height as the
 * user pages through months.
 */
export function gmMonthGrid(
  year: number,
  month: number,
  firstDayOfWeek = 0,
): Date[] {
  const firstOfMonth = gmDate(year, month, 1);
  const offset = (firstOfMonth.getDay() - firstDayOfWeek + 7) % 7;
  const start = gmAddDays(firstOfMonth, -offset);
  return Array.from({ length: 42 }, (_, i) => gmAddDays(start, i));
}

/**
 * Formats a calendar date. Supports the tokens this app needs — `dd`, `MM`,
 * `yyyy`, `yy` — and leaves any other characters as separators.
 *
 * Longest tokens are replaced first so `yyyy` is never treated as two `yy`.
 */
export function gmFormatDate(date: Date, pattern: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return pattern
    .replace(/yyyy/g, String(date.getFullYear()))
    .replace(/yy/g, pad(date.getFullYear() % 100))
    .replace(/MM/g, pad(date.getMonth() + 1))
    .replace(/dd/g, pad(date.getDate()));
}

/**
 * Coerces whatever a form control holds into a calendar date.
 *
 * A `Date` is kept (time stripped). A `yyyy-MM-dd...` string is read from its
 * leading date parts, never via `Date` parsing, so the calendar day survives
 * regardless of the viewer's timezone. Anything unrecognisable becomes null
 * rather than an Invalid Date.
 */
export function gmCoerceDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : gmStartOfDay(value);
  }

  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) {
      return gmDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }

  return null;
}
