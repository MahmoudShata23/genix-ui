import type { Observable } from 'rxjs';

/**
 * The *config-driven* grid model: one object describing a feature's columns,
 * its row actions and its toolbar, handed to `gm-table` as `tableConfig`.
 *
 * It is a second, higher-level way into the same component — `[columns]` plus
 * `gmTableCell` templates is still there and unchanged. This one exists so a
 * feature declares a whole list screen as data, which is how the app's list
 * pages are already written.
 *
 * Every key here matches the shape those screens already use, so a config
 * object moves over untouched: only the import path changes.
 */
export interface TableModel<T> {
  columns: TableColumn<T>[];
  bulkActions?: DynamicBulkAction<T>[];
  singleActions?: SingleAction<T>[];
  /**
   * Shows the add button only when the predicate returns true. Omit it to
   * show the button whenever the `showAddButton` input allows it (the default).
   */
  showAddButton?: () => boolean;

  /**
   * Which rows the user may tick. A row the predicate rejects renders its
   * checkbox disabled and is skipped by select-all, so a bulk action can never
   * reach it. Omit it and every row is selectable.
   *
   * It gates the *user's* ability to change a row's selection, in both
   * directions: a locked row that arrives already selected stays selected.
   */
  rowSelectable?: (row: T, index: number) => boolean;

  /**
   * Shows the toolbar above the table. Defaults to true — a config grid
   * mounts its own toolbar by default.
   */
  showToolbar?: boolean;

  /**
   * Offers the column chooser in the toolbar. Defaults to true — a config grid
   * mounts its own toolbar, and picking columns is what that toolbar is for.
   */
  showColumnChooser?: boolean;

  /**
   * Lets the user drag header cells to reorder the columns. Config mode applies
   * the new order itself — the config object is never rewritten — and still
   * reports it on `columnReorder`. Defaults to false.
   */
  reorderableColumns?: boolean;

  /**
   * Which edge the actions column pins to. Logical, not left/right, so it
   * follows `dir`. Defaults to `start`.
   */
  actionsPosition?: 'start' | 'end';

  /**
   * Pins the actions column while the grid scrolls sideways. Defaults to true:
   * the actions are the one column that has to stay reachable.
   */
  actionsFrozen?: boolean;

  /** Header of the actions column, as a translation key. Defaults to `actions`. */
  actionsHeader?: string;
}

/** One column of a `tableConfig`. */
export interface TableColumn<T> {
  field: keyof T & string;
  header: string;
  /** Columns sort by default; pass `false` to opt one out. */
  sortable?: boolean;
  /** Minimum width, e.g. `'12rem'`. Defaults to `'200px'`. */
  width?: string;
  /** Pins the column while the table scrolls sideways. */
  frozen?: boolean;
  /**
   * Which edge a `frozen` column pins to. Logical, not left/right, so it
   * follows `dir`. Defaults to `start`.
   */
  frozenPosition?: 'start' | 'end';
  /** Alignment of the column's cells and its header. Defaults to `center`. */
  align?: 'start' | 'center' | 'end';
  /**
   * Characters of plain cell text shown before the rest moves into a tooltip,
   * overriding the table's `truncateAt`. `0` keeps this column's values whole.
   *
   * Only affects plain text — a `cellType` renderer owns its own markup.
   */
  truncateAt?: number;
  /**
   * Offers the column in the toolbar's chooser. Set it false for a column the
   * grid must always show. Defaults to true.
   */
  toggleable?: boolean;
  /** Includes the column in `exportCsv()`. Defaults to true. */
  exportable?: boolean;
  /**
   * Lets the column be dragged while the config's `reorderableColumns` is on.
   * Defaults to true.
   */
  reorderable?: boolean;
  /** Gives the column a funnel in its header. Omit it and the column cannot be filtered. */
  filterType?: GmFilterType;
  /** Options for a `SELECT` / `MULTISELECT` filter. */
  filterOptions?: GmFilterOption[];
  /**
   * Turns a `SELECT` filter into a searchable one: the term is debounced, and
   * only queried from three characters up, so a dropdown over thousands of
   * rows does not have to be materialised.
   */
  filterSearch?: (
    term: string,
  ) => Promise<GmFilterOption[]> | Observable<GmFilterOption[]>;
  /** Renderer for the cell. Omit it for plain text. */
  cellType?: GmCellType;
  /** Field whose value the cell's tooltip shows, when it is not the cell's own. */
  tooltipField?: keyof T & string;
  /** Renders the value as a link and calls this on click. */
  linkPath?: (row: T) => void;
  /** Row actions scoped to this column, for a grid that varies them per column. */
  actions?: SingleAction<T>[];
  /** With `cellType: GmCellType.DOT`, maps the field's value (case-insensitive) to a dot colour. */
  dotColorMap?: Record<string, GmStatusTone>;
  /**
   * With `cellType: GmCellType.BADGE`, maps the field's value (case-insensitive)
   * to the pill's tone. Same shape as `dotColorMap`, kept separate so a column
   * can show a dot and a badge of different values without one map serving two
   * meanings. An unmapped value still renders — as a neutral pill, since the
   * text carries the meaning either way.
   */
  badgeToneMap?: Record<string, GmStatusTone>;
  /**
   * Colour of a `GmCellType.STATUS_DOT` or `GmCellType.BADGE` cell. For a badge
   * it is the fallback when `badgeToneMap` has no entry, so a grid that derives
   * its tone from the whole row does not need a map at all. Omit both and the
   * cell renders neutral.
   */
  statusTone?: (row: T) => GmStatusTone;
}

/** How a row action is drawn — resolved from its type, never written by hand. */
export interface GmActionStyle {
  icon: GmTableIcon;
  color: GmTableActionColor;
  label: string;
}

/** One icon button on a row. */
export interface SingleAction<T> {
  type: GmTableActionType;
  command: (row: T) => void;
  /**
   * Shows the action only for rows that satisfy the predicate. Omit it to
   * show the action on every row (the default).
   */
  visible?: (row: T) => boolean;
}

/** One button in the toolbar above the grid. */
export interface DynamicBulkAction<T> {
  type: GmTableActionType;
  command: (rows: T[]) => void;
  scope: GmTableBulkActionScope;
  /**
   * Shows the bulk action only when the predicate returns true. Omit it to
   * show the action whenever its scope condition is met (the default).
   */
  visible?: () => boolean;
}

/**
 * An option for a `SELECT` / `MULTISELECT` column filter.
 *
 * Distinct from `GmTableFilterOption` (`label` / `value`), which is what the
 * lower-level `[columns]` API takes: here the *label* is also what leaves in
 * the filter descriptor, matching the list APIs these screens post to.
 */
export interface GmFilterOption {
  id: string | number;
  label: string;
}

/** Which control a config column's filter renders. */
export enum GmFilterType {
  TEXT = 'text',
  NUMERIC = 'numeric',
  DATE = 'date',
  /** Not implemented as a distinct control — falls back to `TEXT`. */
  TIME = 'time',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
}

/**
 * Severity a row/bulk action is drawn with. Values are the library's own
 * `GmSeverity` words, so an action's colour resolves to `--gm-*` tokens like
 * every other tinted component.
 */
export enum GmTableActionColor {
  PRIMARY = 'primary',
  WARN = 'warning',
  DANGER = 'danger',
  INFO = 'info',
  SUCCESS = 'success',
  SECONDARY = 'secondary',
}

/** When a bulk action is offered. */
export enum GmTableBulkActionScope {
  /** Appears once more than one row is ticked. */
  SELECTED_ROWS_ONLY = 'SELECTED_ROWS_ONLY',
  /** Always available — Import, Export, Add All. */
  GLOBAL = 'GLOBAL',
}

/**
 * Icon class per action type. Plain CSS classes, resolved by whatever icon
 * font the host application already loads — the library ships no icons.
 */
export enum GmTableIcon {
  DELETE = 'pi pi-trash',
  VIEW = 'pi pi-eye',
  EDIT = 'pi pi-pencil',
  DOWNLOAD = 'pi pi-download',
  UPLOAD = 'pi pi-upload',
  ADD = 'pi pi-plus-circle',
  ENABLE_DISABLE = 'pi pi-power-off',
  MOVE_UP = 'pi pi-arrow-up',
  MOVE_DOWN = 'pi pi-arrow-down',
  USE = 'pi pi-check-circle',
  UNUSE = 'pi pi-ban',
  EDIT_CONTACTS = 'pi pi-address-book',
  RESEND_EMAIL = 'pi pi-envelope',
  BULK_IMPORT = 'pi pi-file-import',
  EXPORT = 'pi pi-file-export',
  DEACTIVATE = 'pi pi-ban',
  DELETE_ALL = 'pi pi-trash',
  VALIDATE = 'pi pi-verified',
}

/**
 * What an action *means*. The table never interprets one — it resolves the
 * type to an icon, a colour and a label key, renders the button and calls the
 * action's `command` back.
 *
 * The value doubles as the default translation key for the button's label and
 * tooltip, which is why they read as keys rather than as words.
 */
export enum GmTableActionType {
  EDIT = 'edit',
  DELETE = 'delete',
  VIEW = 'view',
  DOWNLOAD = 'import',
  UPLOAD = 'export',
  ADD = 'add',
  ENABLE_DISABLE = 'enableDisable',
  /** Reordering a row within the list. */
  MOVE_UP = 'moveUp',
  MOVE_DOWN = 'moveDown',
  /** Toggling a row in/out of use in place, without an edit form. */
  USE = 'use',
  UNUSE = 'unuse',
  /** Editing only a row's contact details, not the whole record. */
  EDIT_CONTACTS = 'editContacts',
  /** Re-sending a transactional email to the row's user. */
  RESEND_EMAIL = 'resendEmail',
  /** Global (not row-scoped) bulk-import trigger, opening an import dialog. */
  BULK_IMPORT = 'bulkImport',
  /** Validates the selected row(s)/all rows against server-side business rules. */
  VALIDATE = 'validate',
  VALIDATE_ALL = 'validateAll',
  /**
   * Global (not row-scoped) delete of every row under the current parent,
   * distinct from DELETE (selected rows only) — mirrors VALIDATE_ALL.
   */
  DELETE_ALL = 'deleteAll',
  /** Global (not row-scoped) export trigger. */
  EXPORT = 'exportRecords',
  /** Deactivates a single row in place (distinct styling from ENABLE_DISABLE). */
  DEACTIVATE = 'deactivateRow',
}

/** Tones a status or dot cell can render, mapped onto the design tokens. */
export enum GmStatusTone {
  SUCCESS = 'success',
  WARNING = 'warning',
  DANGER = 'danger',
  INFO = 'info',
  NEUTRAL = 'neutral',
}

/** How a config column renders its value. */
export enum GmCellType {
  AVATAR = 'avatar',
  SLA_STATUS = 'sla_status',
  /**
   * Renders the value as a `gm-badge` pill — the design system's status
   * treatment, and what a multi-state status column wants instead of the
   * two-state boolean mark. Tone comes from `badgeToneMap` or `statusTone`.
   */
  BADGE = 'badge',
  /** Renders the cell's value as a coloured dot instead of text — see `TableColumn.dotColorMap`. */
  DOT = 'dot',
  /** Renders the field's value (expected to be a `string[]`) as a bulleted list, one entry per line. */
  LIST = 'list',
  STATUS_DOT = 'status_dot',
}

/**
 * Turns a key into display text — the one hook the config API needs for
 * translation, since headers, action labels and the toolbar's own wording are
 * all keys rather than words.
 *
 * Defaults to the identity function, so a config whose headers are already
 * English renders as written.
 */
export type GmTableTranslate = (key: string) => string;
