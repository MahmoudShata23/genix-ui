import type {
  GmFilterOperator,
  GmTableFilterOption,
  GmTableFilterType,
} from './table-filter.types';

/** A column definition. `field` may be omitted for a template-only column. */
export interface GmTableColumn<T> {
  /** Property to read for the default cell text, and the sort key. */
  field?: (keyof T & string) | string;
  header: string;
  sortable?: boolean;

  /** Renders a filter control for this column in the filter row. */
  filterable?: boolean;
  /** Control to render. Defaults to `text`. */
  filterType?: GmTableFilterType;
  /** Options for a `select` or `multiselect` filter. */
  filterOptions?: readonly GmTableFilterOption[];
  /** Overrides the operator inferred from `filterType`. */
  filterOperator?: GmFilterOperator;
  filterPlaceholder?: string;

  /** Any CSS width, e.g. `'8rem'` or `'15%'`. Required on frozen columns. */
  width?: string;
  /** Floor for a column that may otherwise be squeezed. */
  minWidth?: string;
  align?: 'start' | 'center' | 'end';

  /** Pins the column while the table scrolls horizontally. */
  frozen?: boolean;
  /**
   * Which edge to pin to. Logical, not left/right, so it follows `dir`.
   * Defaults to `start`.
   */
  frozenPosition?: 'start' | 'end';

  /**
   * Opts one column out of dragging while `reorderableColumns` is on — for a
   * utility column such as row actions that should stay put. Defaults to true.
   */
  reorderable?: boolean;

  /**
   * Excludes one column from CSV export. Set it on utility columns — actions,
   * row controls — whose rendered content is not data.
   */
  exportable?: boolean;
}

export type GmSortDirection = 'asc' | 'desc' | null;

export interface GmSortEvent {
  field: string;
  direction: GmSortDirection;
}

/**
 * Who sorts the rows. `client` sorts a copy in the component; `server` leaves
 * the rows untouched and only emits `sortChange` for the feature to re-fetch.
 */
export type GmTableSortMode = 'client' | 'server';

/** Selection is always an array — one predictable shape for both modes. */
export type GmTableSelectionMode = 'single' | 'multiple';

/**
 * A column moved to a new position. `columns` is a fresh array in the new
 * order — the consumer owns column state, so the table never keeps it.
 *
 * Both indices are positions in the `columns` array, not in the visible drag
 * list, so they can be used against the array directly.
 */
export interface GmColumnReorderEvent<T> {
  columns: GmTableColumn<T>[];
  previousIndex: number;
  currentIndex: number;
}
