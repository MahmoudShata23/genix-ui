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
 * one operator per comparison instead of two aliases. The menu still *labels*
 * them "Date before" / "Date after" — see `GM_FILTER_MATCH_MODES`.
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

/** How the rules *within one column* combine. Rules across columns always AND. */
export type GmFilterMatchLogic = 'and' | 'or';

/** One active filter. `value` is `unknown[]` for `in`, a scalar otherwise. */
export interface GmTableFilter {
  field: string;
  operator: GmFilterOperator;
  value: unknown;
  /**
   * How this field's rules combine when the menu produced more than one.
   * Absent means `and`, so a single-rule filter stays the shape it always was
   * and a consumer that ignores the key still behaves correctly.
   */
  logic?: GmFilterMatchLogic;
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

/**
 * One rule being edited in a column's filter menu — an operator and the value
 * it compares against, before the rule is applied to the table.
 */
export interface GmTableFilterConstraint {
  operator: GmFilterOperator;
  value: unknown;
}

/** What a column's filter menu reports when the user presses Apply. */
export interface GmTableFilterMenuEvent {
  field: string;
  logic: GmFilterMatchLogic;
  constraints: GmTableFilterConstraint[];
}

/**
 * One entry in a column's match-mode dropdown.
 *
 * The label is a *key* rather than text by default, so the whole menu can be
 * translated through one `filterLabels` input instead of every column config
 * restating the wording. `label` overrides it for a column that needs bespoke
 * phrasing.
 */
export interface GmFilterMatchModeOption {
  operator: GmFilterOperator;
  /** Key into `GmTableFilterLabels`. Defaults to the operator's own key. */
  labelKey?: keyof GmTableFilterLabels;
  /** Literal text, winning over `labelKey`. */
  label?: string;
}

/**
 * Every string the filter menu renders, in one object so a host application
 * translates the feature with a single input rather than a dozen.
 *
 * Supplied partially — `[filterLabels]="{ apply: 'Appliquer' }"` — and merged
 * over these defaults.
 */
export interface GmTableFilterLabels {
  /** Accessible name of the funnel button that opens the menu. */
  filterMenu: string;
  matchAll: string;
  matchAny: string;
  addRule: string;
  removeRule: string;
  clear: string;
  apply: string;

  /** Shown in a searchable select's list while a lookup is in flight. */
  searching: string;
  /** Shown in a searchable select's list once a lookup came back with nothing. */
  noResults: string;

  contains: string;
  notContains: string;
  startsWith: string;
  endsWith: string;
  equals: string;
  notEquals: string;
  lt: string;
  lte: string;
  gt: string;
  gte: string;
  in: string;

  /** Date wording for the same four operators, matching the picker's domain. */
  dateIs: string;
  dateIsNot: string;
  dateBefore: string;
  dateAfter: string;
}

export const GM_TABLE_FILTER_LABELS: GmTableFilterLabels = {
  filterMenu: 'Filter',
  matchAll: 'Match All',
  matchAny: 'Match Any',
  addRule: 'Add Rule',
  removeRule: 'Remove rule',
  clear: 'Clear',
  apply: 'Apply',

  searching: 'Searching…',
  noResults: 'No results found',

  contains: 'Contains',
  notContains: 'Not contains',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  equals: 'Equals',
  notEquals: 'Not equals',
  lt: 'Less than',
  lte: 'Less than or equal to',
  gt: 'Greater than',
  gte: 'Greater than or equal to',
  in: 'In',

  dateIs: 'Date is',
  dateIsNot: 'Date is not',
  dateBefore: 'Date before',
  dateAfter: 'Date after',
};

/**
 * Match modes offered per filter type.
 *
 * The discrete pickers map to exactly one comparison — a multiselect is always
 * `in`, a select or boolean always `equals` — so they offer no dropdown at all
 * and the menu renders just their control.
 */
export const GM_FILTER_MATCH_MODES: Record<
  GmTableFilterType,
  readonly GmFilterMatchModeOption[]
> = {
  text: [
    { operator: 'startsWith' },
    { operator: 'contains' },
    { operator: 'notContains' },
    { operator: 'endsWith' },
    { operator: 'equals' },
    { operator: 'notEquals' },
  ],
  numeric: [
    { operator: 'equals' },
    { operator: 'notEquals' },
    { operator: 'lt' },
    { operator: 'lte' },
    { operator: 'gt' },
    { operator: 'gte' },
  ],
  date: [
    { operator: 'equals', labelKey: 'dateIs' },
    { operator: 'notEquals', labelKey: 'dateIsNot' },
    { operator: 'lt', labelKey: 'dateBefore' },
    { operator: 'gt', labelKey: 'dateAfter' },
  ],
  boolean: [],
  select: [],
  multiselect: [],
};

/** The comparison a type falls back to when it offers no match modes. */
export const GM_DEFAULT_FILTER_OPERATOR: Record<
  GmTableFilterType,
  GmFilterOperator
> = {
  text: 'startsWith',
  numeric: 'equals',
  date: 'equals',
  boolean: 'equals',
  select: 'equals',
  multiselect: 'in',
};
