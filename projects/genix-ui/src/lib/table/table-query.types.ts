import type { GmTableFilter } from './table-filter.types';
import type { GmSortEvent } from './table.types';

/**
 * The complete server query state, emitted whenever a user action changes it.
 *
 * Always the full state rather than a delta, so a consumer turns one event into
 * exactly one request without tracking which part changed.
 *
 * Deliberately *not* a copy of PrimeNG's `LazyLoadEvent`: no `rows`/`first`
 * duplication of the same number under two names, no multi-sort fields the app
 * does not use, and it reuses the library's own `GmSortEvent`/`GmTableFilter`
 * rather than introducing a second sort or filter model.
 */
export interface GmTableQueryEvent {
  /** 1-based, matching `GmPageChangeEvent` and the API's `pageNumber`. */
  page: number;

  pageSize: number;

  /** 0-based record offset, for APIs that page by offset instead. */
  first: number;

  /**
   * Absent when nothing is sorted — so `if (query.sort)` is the whole check,
   * with no `direction: null` case to handle separately.
   */
  sort?: GmSortEvent;

  filters: readonly GmTableFilter[];

  /**
   * Free-text search across the configured fields. Absent when empty, so a
   * cleared box sends no key at all rather than an empty string the API would
   * have to special-case.
   */
  globalSearch?: string;
}
