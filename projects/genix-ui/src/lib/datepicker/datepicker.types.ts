/** What `gm-datepicker` selects: one date, or a start/end pair. */
export type GmDatepickerSelectionMode = 'single' | 'range';

/**
 * The control value in range mode. Always a two-slot tuple once the picker
 * has touched it: `[start, null]` while a range is being built,
 * `[start, end]` once complete, `[null, null]` when cleared.
 */
export type GmDateRange = [Date | null, Date | null];

/** Clock convention for the time controls. */
export type GmDatepickerHourFormat = 12 | 24;

/**
 * The shape the control value is emitted in (and accepted in by `writeValue`):
 * - `date`      a `Date` (default)
 * - `iso`       `yyyy-MM-dd`, `yyyy-MM-ddTHH:mm` with time, `HH:mm` time only — local, no timezone shift
 * - `utc`       a UTC ISO string, e.g. `2026-08-24T21:00:00.000Z`
 * - `timestamp` epoch milliseconds
 * - `unix`      epoch seconds
 * - any other string is a pattern (`yyyy`, `yy`, `MMMM`, `MMM`, `MM`, `dd`, `HH`, `mm`), e.g. `dd/MM/yyyy`
 */
export type GmDatepickerValueFormat =
  | 'date'
  | 'iso'
  | 'utc'
  | 'timestamp'
  | 'unix'
  | (string & {});

/** Everything the control may hold, across all modes. */
export type GmDatepickerValue = Date | GmDateRange | null;
