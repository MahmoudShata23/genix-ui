/**
 * Which control a column's filter renders.
 *
 * `boolean` and `numeric` are here because the app's column configs use them
 * heavily; `time` is not implemented yet (only two usages).
 */
export type GmTableFilterType =
  | 'text'
  | 'numeric'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'date';

/**
 * Comparison operators. Names are library-generic, but the set is exactly what
 * the app's `FilterConditions` enum already expresses — nothing invented, and
 * nothing from PrimeNG's match-mode list that is unused here.
 *
 * Dates use `lt`/`gt` rather than separate `before`/`after` names, so there is
 * one operator per comparison instead of two aliases.
 */
export type GmFilterOperator =
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'equals'
  | 'notEquals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in';

/** One active filter. `value` is `unknown[]` for `in`, a scalar otherwise. */
export interface GmTableFilter {
  field: string;
  operator: GmFilterOperator;
  value: unknown;
}

export interface GmTableFiltersChangeEvent {
  filters: GmTableFilter[];
}

/** Who applies the filters: the component, or the server. */
export type GmTableFilterMode = 'client' | 'server';

/** An option for a `select` / `multiselect` filter. */
export interface GmTableFilterOption {
  label: string;
  value: unknown;
}
