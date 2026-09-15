import type { GmSortEvent } from './table.types';

/**
 * The comparison a filter descriptor asks the API for.
 *
 * Numeric, and the numbers are not arbitrary: they are the contract the list
 * endpoints already publish, so a descriptor built here posts unchanged.
 */
export enum GmFilterCondition {
  Contains = 1,
  StartsWith = 2,
  EndsWith = 3,
  Equals = 4,
  NotEquals = 5,
  GreaterThan = 6,
  GreaterThanOrEqualTo = 7,
  LessThan = 8,
  LessThanOrEqualTo = 9,
  NotContains = 10,
  Between = 11,
}

/** The type the API should read a descriptor's `value` as. */
export enum GmFilterDataType {
  String = 1,
  DateTime = 2,
  Int = 3,
  Decimal = 4,
  Boolean = 5,
}

/**
 * One applied filter, in the shape a list endpoint takes.
 *
 * This is what `gm-table` emits in config mode, so a feature hands the event
 * straight to its service instead of translating the component's own
 * `GmTableFilter` first.
 */
export interface GmFilterDescriptor {
  propertyName?: string | null;
  dataType?: GmFilterDataType;
  condition?: GmFilterCondition;
  /**
   * The compared value. Typed as text because that is what the endpoints
   * declare; an `in` filter carries the picked list here, which serialises as
   * a JSON array — see `gmToFilterDescriptors`.
   */
  value?: string | null;
  valueTo?: string | null;
}

/**
 * The paging half of a list request, emitted with every filter and page
 * change so one event is one fetch.
 *
 * Deliberately only the three keys the table can know about — a feature spreads
 * it over whatever else its own request carries.
 */
export interface GmTableRequest {
  /** 1-based, matching the endpoints' `pageNumber`. */
  pageNumber: number;
  pageSize: number;
  filters?: GmFilterDescriptor[];
}

/** A sort in the shape the list endpoints take. */
export interface GmColumnSort {
  orderBy: string;
  ascending: boolean;
}

/**
 * What `(sortChange)` emits.
 *
 * Carries the same sort under both vocabularies at once — the component's
 * `field`/`direction`, and the API's `orderBy`/`ascending` — so neither the
 * low-level nor the config-driven consumer has to convert. `orderBy` is empty
 * while nothing is sorted, which is a list endpoint's "no explicit order".
 */
export interface GmTableSortChange extends GmSortEvent, GmColumnSort {}
