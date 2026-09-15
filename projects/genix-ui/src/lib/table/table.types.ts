import type { Observable } from 'rxjs';

import type {
  GmFilterMatchModeOption,
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

  /** Gives the column a funnel button in its header, opening a filter menu. */
  filterable?: boolean;
  /** Control the menu renders for a rule's value. Defaults to `text`. */
  filterType?: GmTableFilterType;
  /** Options for a `select` or `multiselect` filter. */
  filterOptions?: readonly GmTableFilterOption[];

  /**
   * Turns a `select` filter into a searchable one, fetching its options per
   * term instead of taking them all up front. The term is debounced and only
   * queried from three characters up, so a list of thousands never has to be
   * materialised to filter on it.
   *
   * Takes precedence over `filterOptions`, which then only seeds the list
   * before the user types.
   */
  filterSearch?: (
    term: string,
  ) =>
    | Promise<readonly GmTableFilterOption[]>
    | Observable<readonly GmTableFilterOption[]>;
  /** Match mode pre-selected on the column's first rule. */
  filterOperator?: GmFilterOperator;
  filterPlaceholder?: string;

  /**
   * Replaces the match modes the menu offers. An empty array hides the
   * match-mode dropdown and pins the column to `filterOperator`, which is how
   * a column filters on one fixed comparison.
   */
  filterMatchModes?: readonly GmFilterMatchModeOption[];

  /**
   * How many rules the menu allows. `1` also hides the match-logic dropdown
   * and the Add Rule button, neither of which means anything for one rule.
   * Defaults to 2.
   */
  filterMaxConstraints?: number;

  /**
   * Characters of default cell text to show before the rest moves into a
   * tooltip, overriding the table's `truncateAt`. `0` keeps this column's
   * values whole.
   *
   * Only affects the *default* text rendering — a `gmTableCell` template owns
   * its own markup, so nothing is done to it.
   */
  truncateAt?: number;

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

  /**
   * Excludes one column from `gm-table-toolbar`'s column chooser, so the same
   * array can be handed to both the table and the toolbar. Defaults to true;
   * a column with no `field` is never offered, having nothing to key on.
   */
  toggleable?: boolean;
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
