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

const TOKEN = /yyyy|yy|MMMM|MMM|MM|dd|HH|mm/g;

/**
 * Formats a date. Tokens: `yyyy`, `yy`, `MMMM` (January), `MMM` (Jan), `MM`,
 * `dd`, `HH`, `mm`. Any other characters are kept as separators.
 *
 * One pass over the pattern, so a replaced value (a month name, say) is never
 * re-scanned for tokens.
 */
export function gmFormatDate(date: Date, pattern: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return pattern.replace(TOKEN, (token) => {
    switch (token) {
      case 'yyyy':
        return String(date.getFullYear());
      case 'yy':
        return pad(date.getFullYear() % 100);
      case 'MMMM':
        return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(date);
      case 'MMM':
        return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);
      case 'MM':
        return pad(date.getMonth() + 1);
      case 'dd':
        return pad(date.getDate());
      case 'HH':
        return pad(date.getHours());
      default:
        return pad(date.getMinutes());
    }
  });
}

/**
 * Reads text written with `gmFormatDate` back into a date. Only the numeric
 * tokens can be read back; a pattern with month names yields null.
 */
export function gmParseDate(text: string, pattern: string): Date | null {
  if (/MMM/.test(pattern)) {
    return null;
  }
  const order: string[] = [];
  let source = '';
  let last = 0;
  for (const match of pattern.matchAll(TOKEN)) {
    source += pattern.slice(last, match.index).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    source += match[0] === 'yyyy' ? '(\\d{4})' : '(\\d{2})';
    order.push(match[0]);
    last = match.index + match[0].length;
  }
  source += pattern.slice(last).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const found = new RegExp(`^${source}$`).exec(text.trim());
  if (!found) {
    return null;
  }
  const part = (token: string) => {
    const at = order.indexOf(token);
    return at < 0 ? null : Number(found[at + 1]);
  };
  const year = part('yyyy') ?? (part('yy') !== null ? 2000 + (part('yy') as number) : null);
  const month = part('MM');
  const day = part('dd');
  if (year === null || month === null || day === null) {
    return null;
  }
  const date = new Date(year, month - 1, day, part('HH') ?? 0, part('mm') ?? 0);
  return date.getMonth() === month - 1 ? date : null;
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

/**
 * The same calendar day carrying a wall-clock time. Built from explicit
 * parts like everything else here, so it is the viewer's local time and never
 * shifts. Seconds are dropped: the picker offers hours and minutes only.
 */
export function gmWithTime(date: Date, hours: number, minutes: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
  );
}

/** Formats the time part as `HH:mm`, or `hh:mm AM/PM` in 12-hour mode. */
export function gmFormatTime(date: Date, hourFormat: 12 | 24 = 24): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const minutes = pad(date.getMinutes());
  if (hourFormat === 24) {
    return `${pad(date.getHours())}:${minutes}`;
  }
  const hours = date.getHours() % 12 || 12;
  return `${pad(hours)}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`;
}

/**
 * Like `gmCoerceDate`, but keeps the time — for `showTime` / `timeOnly`,
 * where the hours and minutes are part of the value.
 *
 * Strings are read from their parts rather than parsed, for the same reason:
 * `yyyy-MM-dd`, `yyyy-MM-ddTHH:mm`, and a bare `HH:mm` (which lands on
 * today's date, since a time on its own has no day of its own).
 */
export function gmCoerceDateTime(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : gmWithTime(value, value.getHours(), value.getMinutes());
  }

  if (typeof value === 'string') {
    const dateTime = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value);
    if (dateTime) {
      return new Date(
        Number(dateTime[1]),
        Number(dateTime[2]) - 1,
        Number(dateTime[3]),
        Number(dateTime[4] ?? 0),
        Number(dateTime[5] ?? 0),
      );
    }

    const timeOnly = /^(\d{1,2}):(\d{2})/.exec(value);
    if (timeOnly) {
      return gmWithTime(gmToday(), Number(timeOnly[1]), Number(timeOnly[2]));
    }
  }

  return null;
}
