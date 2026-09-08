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

/** Everything the control may hold, across all modes. */
export type GmDatepickerValue = Date | GmDateRange | null;
