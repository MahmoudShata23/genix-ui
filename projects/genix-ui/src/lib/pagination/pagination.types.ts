/**
 * Emitted whenever the page or page size changes.
 *
 * `page` is **1-based** — the convention the app's API already uses
 * (`pageNumber`) — while `first` is the **0-based record offset**, which is what
 * PrimeNG's paginator exposed. Carrying both keeps migration mechanical: a
 * consumer that fetched with an offset keeps using `first`, and one that sends a
 * page number uses `page`.
 */
export interface GmPageChangeEvent {
  /** 1-based page number. Never 0, never above the last page. */
  page: number;
  pageSize: number;
  /** 0-based index of the first record on the page. Never negative. */
  first: number;
}

/** A rendered page slot: a page number, or a gap in the window. */
export type GmPageSlot = number | 'ellipsis';
