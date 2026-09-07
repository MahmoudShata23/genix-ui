import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
} from '@angular/cdk/drag-drop';

import { GmCheckboxComponent } from '../checkbox/checkbox.component';
import { GmRadioComponent } from '../radio/radio.component';
import { GmSpinnerComponent } from '../spinner/spinner.component';
import { gmUniqueId } from '../core/unique-id';
import { gmBuildCsv } from './table-export';
import type { GmTableExportOptions } from './table-export';
import { GmTableFilterCellComponent } from './table-filter-cell.component';
import {
  GmTableCellDirective,
  GmTableEmptyDirective,
  GmTableFilterDirective,
  GmTableHeaderDirective,
} from './table-templates';
import type {
  GmFilterOperator,
  GmTableFilter,
  GmTableFilterMode,
  GmTableFiltersChangeEvent,
} from './table-filter.types';
import type {
  GmColumnReorderEvent,
  GmSortDirection,
  GmSortEvent,
  GmTableColumn,
  GmTableSelectionMode,
  GmTableSortMode,
} from './table.types';
import type { GmTableQueryEvent } from './table-query.types';
import type { GmPageChangeEvent } from '../pagination/pagination.types';

/**
 * Table core: columns, rows, sorting, selection, loading and empty states.
 *
 * ```html
 * <gm-table [data]="users" [columns]="columns" rowKey="id">
 *   <ng-template gmTableCell="actions" let-row>
 *     <gm-button icon="pi pi-pencil" (onClick)="edit(row)" />
 *   </ng-template>
 * </gm-table>
 * ```
 *
 * Renders a real `<table>`. Knows nothing about business actions — those come
 * in through cell templates — and never fetches data: server-side sorting is
 * just `sortChange` for the feature to act on.
 *
 * Pagination is deliberately *not* built in; compose `gm-pagination` alongside
 * it so there is only ever one paginator implementation.
 */
@Component({
  selector: 'gm-table',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    GmCheckboxComponent,
    GmRadioComponent,
    GmSpinnerComponent,
    GmTableFilterCellComponent,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-table-host' },
})
export class GmTableComponent<T> {
  readonly data = input<readonly T[]>([]);

  readonly columns = input<readonly GmTableColumn<T>[]>([]);

  readonly loading = input(false, { transform: booleanAttribute });

  readonly emptyMessage = input<string>('No records found');

  /**
   * Property giving each row a stable identity. Falls back to object reference,
   * which breaks across re-fetches — pass this whenever the rows have an id.
   */
  readonly rowKey = input<(keyof T & string) | undefined>(undefined);

  readonly selectionMode = input<GmTableSelectionMode | null>(null);

  /**
   * Selected rows. Always an array, in both modes — `single` simply never holds
   * more than one — so consumers never deal with a `T | T[] | null` union.
   */
  readonly selection = model<T[]>([]);

  readonly sortMode = input<GmTableSortMode>('client');

  /** Initial/controlled sort. In `server` mode this is the only source. */
  readonly sortField = input<string | null>(null);

  readonly sortDirection = input<GmSortDirection>(null);

  /**
   * Minimum table width, e.g. `60rem`. Below it the wrapper scrolls rather
   * than cramping the columns.
   */
  readonly minWidth = input<string>();

  /** Accessible name for the table, rendered as a visually hidden caption. */
  readonly caption = input<string>();

  /** Alternating row background. */
  readonly striped = input(false, { transform: booleanAttribute });

  /** Full cell borders. The design system's default is horizontal rules only. */
  readonly gridlines = input(false, { transform: booleanAttribute });

  // ── Scrolling / frozen columns ──────────────────────────────────────────

  /**
   * Caps the scroll container's height, turning on vertical scrolling. A number
   * is treated as pixels.
   */
  readonly maxHeight = input<string | number | undefined>(undefined);

  /** Pins the header row while the body scrolls vertically. */
  readonly stickyHeader = input(false, { transform: booleanAttribute });

  protected readonly maxHeightCss = computed(() => {
    const value = this.maxHeight();
    if (value === undefined || value === null || value === '') {
      return null;
    }
    return typeof value === 'number' ? `${value}px` : value;
  });

  readonly sortChange = output<GmSortEvent>();

  // ── Server-side query ────────────────────────────────────

  /**
   * Turns on the unified `queryChange` event and hands sorting and filtering to
   * the server. One input rather than `sortMode` + `filterMode` + a lazy flag,
   * because a server-paged table always wants all three together.
   */
  readonly serverSide = input(false, { transform: booleanAttribute });

  /**
   * Page size to report in the query event. The consumer owns paging — this is
   * only so a sort or filter query carries the size the user actually picked.
   */
  readonly pageSize = input(10, { transform: numberAttribute });

  /**
   * Full query state after a user action. Fires exactly once per action: never
   * on init, and never because an input changed — so state restored from
   * outside cannot loop back into another request.
   */
  readonly queryChange = output<GmTableQueryEvent>();

  /** `serverSide` implies both modes, so consumers set one input, not three. */
  private readonly serverSort = computed(
    () => this.serverSide() || this.sortMode() === 'server',
  );

  private readonly serverFilter = computed(
    () => this.serverSide() || this.filterMode() === 'server',
  );

  // ── Filtering ───────────────────────────────────────────────────────────

  /**
   * Filters supplied from outside — a saved search, a restored route, a
   * dashboard filter. Seeds the controls and is applied immediately.
   *
   * A one-way input rather than a `model`: a `model` named `filters` generates
   * its own `filtersChange` output, which would collide with the typed one
   * below. Once the user touches a filter, `userFilters` takes over.
   */
  readonly filters = input<readonly GmTableFilter[]>([]);

  /** User-applied filters; null means "follow the input". */
  private readonly userFilters = signal<GmTableFilter[] | null>(null);

  protected readonly activeFilters = computed<readonly GmTableFilter[]>(
    () => this.userFilters() ?? this.filters(),
  );

  readonly filterMode = input<GmTableFilterMode>('server');

  /** Milliseconds to wait before a typed filter is applied. */
  readonly filterDebounce = input(400, { transform: numberAttribute });

  readonly showClearFilters = input(true, { transform: booleanAttribute });

  readonly clearFiltersLabel = input<string>('Clear filters');

  readonly filtersChange = output<GmTableFiltersChangeEvent>();

  // ── Global search ────────────────────────────────────────

  /**
   * Free-text term applied across `globalSearchFields`. An input rather than a
   * control: the search box lives in the consumer's toolbar, not in the table.
   * Setting it emits nothing — call `setGlobalSearch` for a user keystroke.
   * Whether the term filters locally or is left to the server follows
   * `filterMode`, exactly as the column filters do, so the two cannot disagree:
   * local matching needs `filterMode="client"`.
   */
  readonly globalSearch = input<string>('');

  /**
   * Fields the term is matched against. Defaults to every column that has a
   * `field`, which is what a search box over a visible table implies.
   */
  readonly globalSearchFields = input<readonly string[]>([]);

  /** User-typed term; null means "follow the input". */
  private readonly userGlobalSearch = signal<string | null>(null);

  protected readonly activeGlobalSearch = computed(
    () => this.userGlobalSearch() ?? this.globalSearch(),
  );

  /** Pending global-search debounce, separate from the per-field timers. */
  private globalSearchTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly cellTemplates = contentChildren(GmTableCellDirective);

  private readonly filterTemplates = contentChildren(GmTableFilterDirective);

  private readonly emptyTemplate = contentChild(GmTableEmptyDirective);

  private readonly headerTemplate = contentChild(GmTableHeaderDirective);

  protected readonly headerContent = computed(
    () => this.headerTemplate()?.template ?? null,
  );

  // ── Column reorder ───────────────────────────────────────

  /** Lets the user drag header cells to change column order. */
  readonly reorderableColumns = input(false, { transform: booleanAttribute });

  /** Tooltip on the drag grip. Text, so the host app can translate it. */
  readonly reorderHandleLabel = input<string>('Drag to reorder column');

  readonly columnReorder = output<GmColumnReorderEvent<T>>();

  /** A column is draggable unless it opts out. */
  protected isReorderable(column: GmTableColumn<T>): boolean {
    return this.reorderableColumns() && column.reorderable !== false;
  }

  /** Draggable columns in DOM order — the order CDK's indices refer to. */
  private readonly dragColumns = computed(() =>
    this.columns().filter((column) => this.isReorderable(column)),
  );

  /**
   * Which frozen band a column belongs to. Reordering is confined to one band,
   * so a drag can never smuggle a column out of the pinned region.
   */
  private bandOf(column: GmTableColumn<T>): 'start' | 'end' | 'normal' {
    if (this.isFrozenStart(column)) {
      return 'start';
    }
    return this.isFrozenEnd(column) ? 'end' : 'normal';
  }

  /**
   * Blocks the drop preview from crossing bands, so the constraint shows while
   * dragging instead of being a surprise on release.
   */
  protected readonly sameBand = (
    index: number,
    drag: CdkDrag<GmTableColumn<T>>,
  ): boolean => {
    const target = this.dragColumns()[index];
    const source = drag.data;
    return !!target && !!source && this.bandOf(target) === this.bandOf(source);
  };

  protected onColumnDrop(event: CdkDragDrop<unknown>): void {
    const dragged = this.dragColumns();
    const from = dragged[event.previousIndex];
    const to = dragged[event.currentIndex];

    if (!from || !to || from === to || this.bandOf(from) !== this.bandOf(to)) {
      return;
    }

    const columns = [...this.columns()];
    const previousIndex = columns.indexOf(from);
    const currentIndex = columns.indexOf(to);
    if (previousIndex < 0 || currentIndex < 0) {
      return;
    }

    columns.splice(previousIndex, 1);
    columns.splice(currentIndex, 0, from);

    this.columnReorder.emit({ columns, previousIndex, currentIndex });
  }

  /** Pending debounce timers, keyed by field. */
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly tableId = gmUniqueId('gm-table');

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // A pending filter timer must not fire into a destroyed table: under
    // `serverSide` that would emit a query and start a request after the
    // consumer that would have handled it is gone.
    this.destroyRef.onDestroy(() => this.cancelPendingFilters());
  }

  /** Sort applied by the user; null means "follow the inputs". */
  private readonly userSort = signal<GmSortEvent | null>(null);

  protected readonly activeSort = computed<GmSortEvent>(() => {
    const own = this.userSort();
    return (
      own ?? { field: this.sortField() ?? '', direction: this.sortDirection() }
    );
  });

  /**
   * Rows as rendered. In `client` mode a *copy* is sorted, so the bound array is
   * never mutated; in `server` mode the rows are passed through untouched.
   */
  protected readonly rows = computed<readonly T[]>(() => {
    const rows = this.filteredData();
    const { field, direction } = this.activeSort();

    if (this.serverSort() || !field || direction === null) {
      return rows;
    }

    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort(
      (a, b) => factor * this.compare(this.read(a, field), this.read(b, field)),
    );
  });

  /**
   * In `client` mode the filters are applied locally; in `server` mode the rows
   * arrive already filtered, so they pass straight through.
   */
  private readonly filteredData = computed<readonly T[]>(() => {
    const rows = this.data();
    const filters = this.activeFilters();
    const term = this.activeGlobalSearch().trim().toLowerCase();

    if (this.serverFilter() || (filters.length === 0 && term === '')) {
      return rows;
    }

    // `filter` returns a new array, so the bound data is never mutated.
    return rows.filter(
      (row) =>
        filters.every((filter) =>
          this.matches(this.read(row, filter.field), filter),
        ) && this.matchesGlobalSearch(row, term),
    );
  });

  /** Fields to search: the explicit list, else every column with a field. */
  private readonly searchFields = computed<readonly string[]>(() => {
    const configured = this.globalSearchFields();
    if (configured.length > 0) {
      return configured;
    }
    return this.columns()
      .map((column) => column.field)
      .filter((field): field is string => !!field);
  });

  /** Case-insensitive substring match on any searched field. */
  private matchesGlobalSearch(row: T, term: string): boolean {
    if (term === '') {
      return true;
    }
    return this.searchFields().some((field) =>
      this.text(this.read(row, field)).includes(term),
    );
  }

  protected readonly isEmpty = computed(
    () => !this.loading() && this.rows().length === 0,
  );

  protected readonly showRows = computed(
    () => !this.loading() && this.rows().length > 0,
  );

  /** Selection column plus one per data column, for the state rows' colspan. */
  protected readonly columnCount = computed(
    () => this.columns().length + (this.selectionMode() ? 1 : 0),
  );

  protected readonly allSelected = computed(() => {
    const rows = this.rows();
    return rows.length > 0 && rows.every((row) => this.isSelected(row));
  });

  protected readonly emptyContent = computed(
    () => this.emptyTemplate()?.template ?? null,
  );

  /** Index of the selected row in single mode, for the radio group's value. */
  protected readonly selectedIndex = computed(() => {
    const [first] = this.selection();
    return first === undefined
      ? -1
      : this.rows().findIndex((row) => this.identity(row) === this.identity(first));
  });

  /** `@for` identity: the row key when given, else the row object itself. */
  protected trackRow(row: T): unknown {
    return this.identity(row);
  }

  // ── Cells ───────────────────────────────────────────────────────────────

  protected templateFor(column: GmTableColumn<T>) {
    const templates = this.cellTemplates();
    const field = column.field;

    const exact = field
      ? templates.find((tpl) => tpl.field() === field)
      : undefined;
    if (exact) {
      return exact.template;
    }

    // A template with no field is the fallback for every remaining column, so
    // one generic renderer can drive the whole table.
    return templates.find((tpl) => !tpl.field())?.template ?? null;
  }

  /** Default cell text: the row's value for the column, stringified. */
  protected cellText(row: T, column: GmTableColumn<T>): string {
    if (!column.field) {
      return '';
    }
    const value = this.read(row, column.field);
    return value === null || value === undefined ? '' : String(value);
  }

  private read(row: T, field: string): unknown {
    return (row as Record<string, unknown>)[field];
  }

  // ── Sorting ─────────────────────────────────────────────────────────────

  protected sortStateOf(column: GmTableColumn<T>): GmSortDirection {
    const { field, direction } = this.activeSort();
    return column.field && column.field === field ? direction : null;
  }

  /** For `aria-sort`, which needs these exact words. */
  protected ariaSortOf(column: GmTableColumn<T>): string {
    if (!column.sortable) {
      return 'none';
    }
    const state = this.sortStateOf(column);
    return state === 'asc'
      ? 'ascending'
      : state === 'desc'
        ? 'descending'
        : 'none';
  }

  /** Current direction for a field, for a custom header's own indicator. */
  sortDirectionOf(field: string): GmSortDirection {
    const sort = this.activeSort();
    return sort.field === field ? sort.direction : null;
  }

  /**
   * Sorts by field, for a custom header that renders its own controls. Cycles
   * through the same states as the built-in header, so both behave alike.
   */
  sortBy(field: string): void {
    const column = this.columns().find((candidate) => candidate.field === field);
    if (column) {
      this.toggleSort({ ...column, sortable: true });
    }
  }

  /** Cycles unsorted → ascending → descending → unsorted. */
  protected toggleSort(column: GmTableColumn<T>): void {
    if (!column.sortable || !column.field) {
      return;
    }
    const current = this.sortStateOf(column);
    const direction: GmSortDirection =
      current === null ? 'asc' : current === 'asc' ? 'desc' : null;

    const event: GmSortEvent = { field: column.field, direction };
    this.userSort.set(event);
    this.sortChange.emit(event);
    this.emitQueryFromFirstPage();
  }

  /**
   * Comparator for the built-in sort. Nulls sort last regardless of direction's
   * sign being applied by the caller, numbers and dates compare numerically,
   * and everything else compares as locale-aware text.
   */
  private compare(a: unknown, b: unknown): number {
    const aEmpty = a === null || a === undefined || a === '';
    const bEmpty = b === null || b === undefined || b === '';
    if (aEmpty || bEmpty) {
      return aEmpty && bEmpty ? 0 : aEmpty ? 1 : -1;
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return Number(a) - Number(b);
    }
    return String(a).localeCompare(String(b));
  }

  // ── Frozen columns ──────────────────────────────────────────────────────

  /**
   * Width reserved for the selection column. Fixed rather than measured, so
   * frozen offsets are pure CSS arithmetic with no layout reads.
   */
  private static readonly SELECT_WIDTH = '3rem';

  protected isFrozenStart(column: GmTableColumn<T>): boolean {
    return !!column.frozen && (column.frozenPosition ?? 'start') === 'start';
  }

  protected isFrozenEnd(column: GmTableColumn<T>): boolean {
    return !!column.frozen && column.frozenPosition === 'end';
  }

  /**
   * The selection column pins itself whenever a start-frozen column exists —
   * being leftmost, it would otherwise scroll out from under the pinned data.
   */
  protected readonly selectionFrozen = computed(
    () =>
      !!this.selectionMode() &&
      this.columns().some((column) => this.isFrozenStart(column)),
  );

  /**
   * Distance from the inline start edge: the widths of every start-frozen cell
   * before this one, summed with `calc()` so mixed units work and nothing has
   * to be measured. A frozen column without a `width` contributes 0, which is
   * why frozen columns should declare one.
   */
  protected frozenInsetStart(column: GmTableColumn<T>): string | null {
    if (!this.isFrozenStart(column)) {
      return null;
    }
    const parts: string[] = this.selectionFrozen()
      ? [GmTableComponent.SELECT_WIDTH]
      : [];
    for (const candidate of this.columns()) {
      if (candidate === column) {
        break;
      }
      if (this.isFrozenStart(candidate)) {
        parts.push(candidate.width ?? '0px');
      }
    }
    return parts.length ? `calc(${parts.join(' + ')})` : '0px';
  }

  /** Mirror of `frozenInsetStart`, accumulating from the end instead. */
  protected frozenInsetEnd(column: GmTableColumn<T>): string | null {
    if (!this.isFrozenEnd(column)) {
      return null;
    }
    const columns = this.columns();
    const parts: string[] = [];
    for (let i = columns.length - 1; i >= 0; i--) {
      if (columns[i] === column) {
        break;
      }
      if (this.isFrozenEnd(columns[i])) {
        parts.push(columns[i].width ?? '0px');
      }
    }
    return parts.length ? `calc(${parts.join(' + ')})` : '0px';
  }

  /**
   * Only the cell at each frozen boundary carries the divider shadow, so a run
   * of adjacent frozen columns does not stack shadows between them.
   */
  protected isFrozenStartEdge(column: GmTableColumn<T>): boolean {
    if (!this.isFrozenStart(column)) {
      return false;
    }
    const frozen = this.columns().filter((c) => this.isFrozenStart(c));
    return frozen[frozen.length - 1] === column;
  }

  protected isFrozenEndEdge(column: GmTableColumn<T>): boolean {
    if (!this.isFrozenEnd(column)) {
      return false;
    }
    return this.columns().find((c) => this.isFrozenEnd(c)) === column;
  }

  // ── Filtering ───────────────────────────────────────────────────────────

  protected readonly hasFilterRow = computed(() =>
    this.columns().some((column) => column.filterable && column.field),
  );

  protected readonly hasActiveFilters = computed(
    () => this.activeFilters().length > 0,
  );

  protected filterTemplateFor(column: GmTableColumn<T>) {
    return (
      this.filterTemplates().find((tpl) => tpl.field() === column.field)
        ?.template ?? null
    );
  }

  /** Current value for a column's control, or null when unfiltered. */
  protected filterValueOf(column: GmTableColumn<T>): unknown {
    const field = column.field;
    if (!field) {
      return null;
    }
    return this.activeFilters().find((f) => f.field === field)?.value ?? null;
  }

  /**
   * Operator for a column: explicit config wins, else one inferred from the
   * control type — `in` for a multiselect, `equals` for a discrete value, and
   * `contains` for free text, which is what most tables want.
   */
  private operatorFor(column: GmTableColumn<T>): GmFilterOperator {
    if (column.filterOperator) {
      return column.filterOperator;
    }
    switch (column.filterType) {
      case 'multiselect':
        return 'in';
      case 'select':
      case 'boolean':
      case 'date':
      case 'numeric':
        return 'equals';
      default:
        return 'contains';
    }
  }

  /** Text-like filters debounce; discrete pickers apply immediately. */
  private isDebounced(column: GmTableColumn<T>): boolean {
    const type = column.filterType ?? 'text';
    return type === 'text' || type === 'numeric';
  }

  protected onFilterValue(column: GmTableColumn<T>, value: unknown): void {
    const field = column.field;
    if (!field) {
      return;
    }

    const apply = () => this.applyFilter(field, this.operatorFor(column), value);
    const existing = this.debounceTimers.get(field);
    if (existing !== undefined) {
      clearTimeout(existing);
      this.debounceTimers.delete(field);
    }

    if (this.isDebounced(column) && this.filterDebounce() > 0) {
      this.debounceTimers.set(
        field,
        setTimeout(() => {
          this.debounceTimers.delete(field);
          apply();
        }, this.filterDebounce()),
      );
      return;
    }

    apply();
  }

  /**
   * Writes one filter into the set, replacing any filter on the same field. An
   * empty value removes it, so "cleared" and "absent" are the same state.
   */
  private applyFilter(
    field: string,
    operator: GmFilterOperator,
    value: unknown,
  ): void {
    const others = this.activeFilters().filter((f) => f.field !== field);
    const next = this.isEmptyValue(value)
      ? others
      : [...others, { field, operator, value }];

    this.userFilters.set(next);
    this.filtersChange.emit({ filters: next });
    this.emitQueryFromFirstPage();
  }

  private isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined || value === '') {
      return true;
    }
    return Array.isArray(value) && value.length === 0;
  }

  protected clearFilter(field: string): void {
    const next = this.activeFilters().filter((f) => f.field !== field);
    this.userFilters.set(next);
    this.filtersChange.emit({ filters: next });
    this.emitQueryFromFirstPage();
  }

  clearAllFilters(): void {
    this.cancelPendingFilters();
    this.userFilters.set([]);
    this.filtersChange.emit({ filters: [] });
    this.emitQueryFromFirstPage();
  }

  /** Drops anything still waiting, so a stale keystroke cannot re-add a filter. */
  private cancelPendingFilters(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.globalSearchTimer !== undefined) {
      clearTimeout(this.globalSearchTimer);
      this.globalSearchTimer = undefined;
    }
  }

  /** Client-side predicate for one filter. */
  private matches(cellValue: unknown, filter: GmTableFilter): boolean {
    const { operator, value } = filter;

    if (operator === 'in') {
      const list = Array.isArray(value) ? value : [value];
      return list.some((item) => this.looseEquals(cellValue, item));
    }

    switch (operator) {
      case 'equals':
        return this.looseEquals(cellValue, value);
      case 'notEquals':
        return !this.looseEquals(cellValue, value);
      case 'contains':
        return this.text(cellValue).includes(this.text(value));
      case 'notContains':
        return !this.text(cellValue).includes(this.text(value));
      case 'startsWith':
        return this.text(cellValue).startsWith(this.text(value));
      case 'endsWith':
        return this.text(cellValue).endsWith(this.text(value));
      case 'gt':
        return this.compare(cellValue, value) > 0;
      case 'gte':
        return this.compare(cellValue, value) >= 0;
      case 'lt':
        return this.compare(cellValue, value) < 0;
      case 'lte':
        return this.compare(cellValue, value) <= 0;
      default:
        return true;
    }
  }

  private text(value: unknown): string {
    return value === null || value === undefined
      ? ''
      : String(value).toLowerCase();
  }

  /**
   * Compares a cell against a filter value. Dates match on the calendar day, so
   * a picked date matches a stored timestamp; everything else compares as text
   * to avoid `1 !== '1'` surprises with values that arrive from an input.
   */
  private looseEquals(cellValue: unknown, value: unknown): boolean {
    if (value instanceof Date || cellValue instanceof Date) {
      const a = this.toDate(cellValue);
      const b = this.toDate(value);
      return a !== null && b !== null && a.toDateString() === b.toDateString();
    }
    if (typeof value === 'boolean' || typeof cellValue === 'boolean') {
      return String(cellValue) === String(value);
    }
    return this.text(cellValue) === this.text(value);
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    return null;
  }

  // ── Server-side query ────────────────────────────────────

  /**
   * Builds the event from explicit paging plus the live sort and filter state.
   * Paging is a parameter rather than stored state, so there stays exactly one
   * source of truth for the current page: the consumer.
   */
  private buildQuery(page: number, pageSize: number): GmTableQueryEvent {
    const safePage = Math.max(1, Math.trunc(page) || 1);
    const safeSize = Math.max(1, Math.trunc(pageSize) || 1);
    const sort = this.activeSort();

    const query: GmTableQueryEvent = {
      page: safePage,
      pageSize: safeSize,
      first: (safePage - 1) * safeSize,
      filters: this.activeFilters(),
    };

    if (sort.field && sort.direction) {
      query.sort = { field: sort.field, direction: sort.direction };
    }

    const term = this.activeGlobalSearch().trim();
    if (term !== '') {
      query.globalSearch = term;
    }
    return query;
  }

  /**
   * Sorting and filtering always return to the first page — page 4 of the
   * previous result set means nothing in the new one.
   */
  private emitQueryFromFirstPage(): void {
    if (this.serverSide()) {
      this.queryChange.emit(this.buildQuery(1, this.pageSize()));
    }
  }

  /**
   * Feed `gm-pagination`'s `(pageChange)` in here. The paginator stays a
   * separate component; this only folds its event into the one query event, so
   * the consumer still issues a single request per user action.
   */
  setPage(event: GmPageChangeEvent): void {
    this.queryChange.emit(this.buildQuery(event.page, event.pageSize));
  }

  /**
   * A user keystroke in the consumer's search box. Debounced with the same
   * `filterDebounce` the column filters use, then folded into the one query
   * event — so a search is not a second request path.
   */
  setGlobalSearch(term: string): void {
    if (this.globalSearchTimer !== undefined) {
      clearTimeout(this.globalSearchTimer);
      this.globalSearchTimer = undefined;
    }

    const apply = () => {
      this.userGlobalSearch.set(term);
      this.emitQueryFromFirstPage();
    };

    if (this.filterDebounce() > 0) {
      this.globalSearchTimer = setTimeout(() => {
        this.globalSearchTimer = undefined;
        apply();
      }, this.filterDebounce());
      return;
    }

    apply();
  }

  /**
   * Clears sort, filters and search for an external "reset" control, emitting
   * nothing:
   * such a caller issues its own request, and emitting here would make one
   * click fetch twice.
   */
  resetQueryState(): void {
    this.cancelPendingFilters();
    this.userFilters.set(null);
    this.userSort.set(null);
    this.userGlobalSearch.set(null);
  }

  // ── Selection ───────────────────────────────────────────────────────────

  /** Identity used to match rows across re-fetches. */
  private identity(row: T): unknown {
    const key = this.rowKey();
    return key ? this.read(row, key) : row;
  }

  protected isSelected(row: T): boolean {
    const id = this.identity(row);
    return this.selection().some((item) => this.identity(item) === id);
  }

  protected toggleRow(row: T): void {
    if (this.selectionMode() === 'single') {
      // Re-selecting the current row clears it, matching a checkbox's feel.
      this.selection.set(this.isSelected(row) ? [] : [row]);
      return;
    }

    const id = this.identity(row);
    this.selection.set(
      this.isSelected(row)
        ? this.selection().filter((item) => this.identity(item) !== id)
        : [...this.selection(), row],
    );
  }

  /** Header checkbox: selects or clears every row currently rendered. */
  protected toggleAll(): void {
    if (this.allSelected()) {
      const visible = this.rows().map((row) => this.identity(row));
      this.selection.set(
        this.selection().filter(
          (item) => !visible.includes(this.identity(item)),
        ),
      );
      return;
    }

    const merged = [...this.selection()];
    for (const row of this.rows()) {
      if (!this.isSelected(row)) {
        merged.push(row);
      }
    }
    this.selection.set(merged);
  }

  // ── CSV export ───────────────────────────────────────────

  private readonly document = inject(DOCUMENT);

  /** Columns carrying data: utility columns have no field or opt out. */
  private exportColumns(): GmTableColumn<T>[] {
    return this.columns().filter(
      (column) => !!column.field && column.exportable !== false,
    );
  }

  /**
   * Downloads the rendered rows as CSV, using the browser only — no backend
   * call, no third-party library.
   *
   * Exports what the table is showing, so an active filter or sort is reflected;
   * pass `selectionOnly` for just the ticked rows.
   */
  exportCsv(options?: GmTableExportOptions): void {
    const columns = this.exportColumns();
    if (columns.length === 0) {
      return;
    }

    const rows = options?.selectionOnly ? this.selection() : this.rows();
    // A leading BOM, or Excel reads UTF-8 accents as mojibake.
    const csv = '﻿' + gmBuildCsv(rows, columns);
    const name = (options?.fileName ?? 'export').replace(/.csv$/i, '');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = name + '.csv';
    link.style.display = 'none';
    this.document.body.appendChild(link);
    link.click();
    this.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  protected rowLabel(index: number): string {
    return `Select row ${index + 1}`;
  }
}
