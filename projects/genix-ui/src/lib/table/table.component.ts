import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
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
import { GmTooltipDirective } from '../tooltip/tooltip.directive';
import { gmUniqueId } from '../core/unique-id';
import { gmBuildCsv } from './table-export';
import type { GmTableExportOptions } from './table-export';
import { GmTableFilterMenuComponent } from './table-filter-menu.component';
import {
  GmTableCellDirective,
  GmTableEmptyDirective,
  GmTableFilterDirective,
  GmTableHeaderDirective,
} from './table-templates';
import { GM_TABLE_FILTER_LABELS } from './table-filter.types';
import type {
  GmFilterMatchLogic,
  GmTableFilter,
  GmTableFilterConstraint,
  GmTableFilterLabels,
  GmTableFilterMenuEvent,
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
 * A `filterable` column gets a funnel in its header opening a filter menu:
 * match logic, up to `filterMaxConstraints` rules, and an explicit Apply. The
 * rules leave as one flat `GmTableFilter` per comparison, so a filter API
 * receives a list it can map straight onto its own descriptors.
 *
 * Pagination and the toolbar are deliberately *not* built in; compose
 * `gm-card` above and `gm-pagination` below so there is only ever one
 * paginator implementation and the toolbar stays the feature's own.
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
    GmTableFilterMenuComponent,
    GmTooltipDirective,
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
   * Which rows the user may select. A row the predicate rejects renders its
   * checkbox (or radio) disabled, is skipped by select-all, and cannot be
   * toggled programmatically through `toggleRow`.
   *
   * It gates the *user's* ability to change a row's selection, in both
   * directions — so a locked row that arrives already selected stays selected,
   * including through a deselect-all. The consumer owns `selection`, and
   * silently dropping rows out of it would be a worse surprise than leaving
   * them.
   */
  readonly rowSelectable = input<
    ((row: T, index: number) => boolean) | undefined
  >(undefined);

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

  /**
   * Milliseconds to wait before a typed *global search* term is applied. The
   * column filters do not debounce: their menu has an explicit Apply, so a
   * half-typed rule never reaches the table in the first place.
   */
  readonly filterDebounce = input(400, { transform: numberAttribute });

  /**
   * Overrides for the filter menu's wording — partial, merged over the English
   * defaults, so a host application translates the whole feature with one
   * binding instead of a dozen.
   */
  readonly filterLabels = input<Partial<GmTableFilterLabels>>({});

  /** Public so a `gmTableHeader` template can pass it to its own menus. */
  readonly resolvedFilterLabels = computed<GmTableFilterLabels>(() => ({
    ...GM_TABLE_FILTER_LABELS,
    ...this.filterLabels(),
  }));

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
    this.renderColumns().filter((column) => this.isReorderable(column)),
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

  readonly tableId = gmUniqueId('gm-table');

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // A pending search timer must not fire into a destroyed table: under
    // `serverSide` that would emit a query and start a request after the
    // consumer that would have handled it is gone.
    this.destroyRef.onDestroy(() => this.cancelPendingFilters());

    // Only observed while something is actually pinned beside the selection
    // column — otherwise no offset depends on its width.
    effect((onCleanup) => {
      const cell = this.selectHeaderCell()?.nativeElement;
      if (!cell || !this.selectionFrozen() || typeof ResizeObserver === 'undefined') {
        this.selectWidthPx.set(null);
        return;
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        this.selectWidthPx.set(
          entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width,
        );
      });
      observer.observe(cell);
      onCleanup(() => observer.disconnect());
    });
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
    const columns = [...this.filtersByField()];
    const term = this.activeGlobalSearch().trim().toLowerCase();

    if (this.serverFilter() || (columns.length === 0 && term === '')) {
      return rows;
    }

    // `filter` returns a new array, so the bound data is never mutated.
    return rows.filter(
      (row) =>
        columns.every(([field, state]) =>
          this.matchesColumn(row, field, state),
        ) && this.matchesGlobalSearch(row, term),
    );
  });

  /**
   * The flat filter list bucketed by column: each column's rules plus the
   * logic joining them. Buckets themselves always AND, which is the only
   * reading of two different columns both being filtered.
   *
   * Memoised because it also backs `constraintsFor` and `logicFor`, which the
   * template calls on every change detection — recomputing them there would
   * hand each filter menu a new array reference every cycle and mark it dirty
   * for no reason.
   */
  private readonly filtersByField = computed(() => {
    const columns = new Map<string, ColumnFilterState>();

    for (const filter of this.activeFilters()) {
      const constraint = { operator: filter.operator, value: filter.value };
      const existing = columns.get(filter.field);
      if (existing) {
        existing.constraints.push(constraint);
        // Every rule of a field carries the same logic; the last one wins if a
        // consumer hand-built the array and they disagree.
        if (filter.logic) {
          existing.logic = filter.logic;
        }
      } else {
        columns.set(filter.field, {
          logic: filter.logic ?? 'and',
          constraints: [constraint],
        });
      }
    }

    return columns;
  });

  private matchesColumn(
    row: T,
    field: string,
    state: ColumnFilterState,
  ): boolean {
    const cellValue = this.read(row, field);
    const test = (rule: GmTableFilterConstraint) =>
      this.matches(cellValue, rule);
    return state.logic === 'or'
      ? state.constraints.some(test)
      : state.constraints.every(test);
  }

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

  protected isRowSelectable(row: T, index: number): boolean {
    return this.rowSelectable()?.(row, index) ?? true;
  }

  /**
   * The rows the user could actually tick. Select-all and its checkbox state
   * describe *these*, not every rendered row — otherwise a single locked row
   * would stop the header checkbox ever reaching "checked".
   */
  private readonly selectableRows = computed<readonly T[]>(() => {
    const predicate = this.rowSelectable();
    if (!predicate) {
      return this.rows();
    }
    // Filtered with its own index, so it matches the index the template
    // renders each row under.
    return this.rows().filter((row, index) => predicate(row, index));
  });

  protected readonly allSelected = computed(() => {
    const rows = this.selectableRows();
    return rows.length > 0 && rows.every((row) => this.isSelected(row));
  });

  /** Drives the header checkbox's indeterminate mark. */
  protected readonly someSelected = computed(() =>
    this.selectableRows().some((row) => this.isSelected(row)),
  );

  /** Nothing on this page can be ticked, so the header checkbox is inert. */
  protected readonly selectAllDisabled = computed(
    () => this.selectableRows().length === 0,
  );

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

  /**
   * Characters of default cell text shown before the rest moves into a tooltip.
   * `0` turns truncation off for the whole table; a column's own `truncateAt`
   * overrides it either way.
   *
   * Only the built-in text rendering is affected — a `gmTableCell` template
   * owns its own markup, and second-guessing it would be wrong.
   */
  readonly truncateAt = input(25, { transform: numberAttribute });

  /** The effective limit for a column: its own override, else the table's. */
  private truncateLimit(column: GmTableColumn<T>): number {
    const limit = column.truncateAt ?? this.truncateAt();
    return Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : 0;
  }

  protected isTruncated(row: T, column: GmTableColumn<T>): boolean {
    const limit = this.truncateLimit(column);
    return limit > 0 && this.cellText(row, column).length > limit;
  }

  /**
   * The visible head of an over-long value, with an ellipsis so the user can
   * see there is more rather than having to hover to find out. The trailing
   * trim stops the ellipsis from following a space.
   */
  protected truncatedText(row: T, column: GmTableColumn<T>): string {
    const limit = this.truncateLimit(column);
    return this.cellText(row, column).slice(0, limit).trimEnd() + '…';
  }

  private read(row: T, field: string): unknown {
    return (row as Record<string, unknown>)[field];
  }

  // ── Sorting ─────────────────────────────────────────────────────────────

  protected sortStateOf(column: GmTableColumn<T>): GmSortDirection {
    const { field, direction } = this.activeSort();
    return column.field && column.field === field ? direction : null;
  }

  /**
   * `column.align` as a flex value. The header's contents are a flex row — the
   * label, the sort control and the funnel — so `text-align` alone, which is
   * what the body cells use, would not move them.
   */
  protected headerJustify(column: GmTableColumn<T>): string | null {
    switch (column.align) {
      case 'center':
        return 'center';
      case 'end':
        return 'flex-end';
      default:
        return null;
    }
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

  private readonly selectHeaderCell =
    viewChild<ElementRef<HTMLElement>>('selectHeaderCell');

  /**
   * Measured width of the selection column, published to CSS so a frozen
   * column can start exactly where the checkbox ends.
   *
   * It has to be measured rather than declared: in automatic table layout a
   * `width` is only a preference, `max-width` is ignored on cells outright,
   * and a table wider than the sum of its columns spreads the surplus across
   * every one of them — including this column. A constant was out by the
   * column's share of that surplus, which showed up as the pinned column
   * sliding over the checkbox on first scroll.
   */
  private readonly selectWidthPx = signal<number | null>(null);

  protected readonly selectWidthCss = computed(() => {
    const width = this.selectWidthPx();
    return width === null ? null : `${width}px`;
  });

  protected isFrozenStart(column: GmTableColumn<T>): boolean {
    return !!column.frozen && (column.frozenPosition ?? 'start') === 'start';
  }

  protected isFrozenEnd(column: GmTableColumn<T>): boolean {
    return !!column.frozen && column.frozenPosition === 'end';
  }

  /**
   * Columns in the order they are rendered: start-frozen first, then unfrozen,
   * then end-frozen.
   *
   * Sticky offsets are DOM-order arithmetic, so a start-frozen column sitting
   * *after* unfrozen ones would pin itself on top of its neighbours. Banding
   * the columns here makes `frozen` + `frozenPosition` the whole configuration
   * — an actions column moves edge to edge by changing `frozenPosition` alone,
   * without the consumer also having to move the entry in the array.
   *
   * `filter` is stable, so the consumer's relative order within each band is
   * preserved, and a table with nothing frozen gets the array untouched.
   */
  protected readonly renderColumns = computed<readonly GmTableColumn<T>[]>(
    () => {
      const columns = this.columns();
      const start = columns.filter((column) => this.isFrozenStart(column));
      const end = columns.filter((column) => this.isFrozenEnd(column));

      if (start.length === 0 && end.length === 0) {
        return columns;
      }

      const middle = columns.filter(
        (column) => !this.isFrozenStart(column) && !this.isFrozenEnd(column),
      );
      return [...start, ...middle, ...end];
    },
  );

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
      ? ['var(--gm-table-select-offset)']
      : [];
    for (const candidate of this.renderColumns()) {
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
    const columns = this.renderColumns();
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
    const frozen = this.renderColumns().filter((c) => this.isFrozenStart(c));
    return frozen[frozen.length - 1] === column;
  }

  protected isFrozenEndEdge(column: GmTableColumn<T>): boolean {
    if (!this.isFrozenEnd(column)) {
      return false;
    }
    return this.renderColumns().find((c) => this.isFrozenEnd(c)) === column;
  }

  // ── Filtering ───────────────────────────────────────────────────────────

  /** True while any column is filtered — for a composed toolbar's Clear button. */
  readonly hasActiveFilters = computed(() => this.activeFilters().length > 0);

  protected filterTemplateFor(column: GmTableColumn<T>) {
    return (
      this.filterTemplates().find((tpl) => tpl.field() === column.field)
        ?.template ?? null
    );
  }

  /**
   * A column's applied rules, in menu order, for seeding its menu's draft.
   *
   * Public, like `sortBy` and `sortDirectionOf`, so a `gmTableHeader` template
   * can mount its own `gm-table-filter-menu` and keep filtering working.
   */
  constraintsFor(
    column: GmTableColumn<T>,
  ): readonly GmTableFilterConstraint[] {
    return this.columnFilterState(column)?.constraints ?? NO_CONSTRAINTS;
  }

  logicFor(column: GmTableColumn<T>): GmFilterMatchLogic {
    return this.columnFilterState(column)?.logic ?? 'and';
  }

  private columnFilterState(
    column: GmTableColumn<T>,
  ): ColumnFilterState | undefined {
    const field = column.field;
    return field ? this.filtersByField().get(field) : undefined;
  }

  /**
   * One column's menu was applied. Its rules become one `GmTableFilter` each,
   * so the emitted array stays a flat list of comparisons — which is the shape
   * a filter API takes — rather than a nested structure every consumer would
   * have to unpack.
   */
  applyFilterMenu(event: GmTableFilterMenuEvent): void {
    // Only a multi-rule column carries `logic`; a single rule combines with
    // nothing, so tagging it would be noise in the request payload.
    const carriesLogic = event.constraints.length > 1;
    this.commitFilters(
      this.replaceFieldFilters(
        event.field,
        event.constraints.map((rule) => ({
          field: event.field,
          operator: rule.operator,
          value: rule.value,
          ...(carriesLogic ? { logic: event.logic } : {}),
        })),
      ),
    );
  }

  clearColumnFilters(field: string): void {
    this.commitFilters(this.replaceFieldFilters(field, []));
  }

  clearAllFilters(): void {
    this.cancelPendingFilters();
    this.commitFilters([]);
  }

  /**
   * Swaps a field's filters in place rather than appending them, so re-applying
   * the same rules produces an identical array and `commitFilters` can tell
   * "nothing changed" from "changed back".
   */
  private replaceFieldFilters(
    field: string,
    added: readonly GmTableFilter[],
  ): GmTableFilter[] {
    const current = this.activeFilters();
    const others = current.filter((filter) => filter.field !== field);
    const at = current.findIndex((filter) => filter.field === field);
    const insert = at < 0 ? others.length : Math.min(at, others.length);
    return [...others.slice(0, insert), ...added, ...others.slice(insert)];
  }

  /**
   * The one place filters are written. Pressing Apply without having changed
   * anything is a no-op rather than a second identical request.
   */
  private commitFilters(next: GmTableFilter[]): void {
    if (sameFilters(this.activeFilters(), next)) {
      return;
    }
    this.userFilters.set(next);
    this.filtersChange.emit({ filters: next });
    this.emitQueryFromFirstPage();
  }

  /** Drops a pending search, so a stale keystroke cannot re-apply a term. */
  private cancelPendingFilters(): void {
    if (this.globalSearchTimer !== undefined) {
      clearTimeout(this.globalSearchTimer);
      this.globalSearchTimer = undefined;
    }
  }

  /** Client-side predicate for one filter. */
  private matches(
    cellValue: unknown,
    rule: GmTableFilterConstraint,
  ): boolean {
    const { operator, value } = rule;

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

  protected toggleRow(row: T, index: number): void {
    // Guarded here as well as disabled in the template: the control is not the
    // only way in, and a locked row must not be toggleable at all.
    if (!this.isRowSelectable(row, index)) {
      return;
    }

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

  /**
   * Header checkbox: selects or clears every *selectable* row on the page.
   * Locked rows are left exactly as they are in both directions.
   */
  protected toggleAll(): void {
    const selectable = this.selectableRows();
    if (selectable.length === 0) {
      return;
    }

    if (this.allSelected()) {
      const visible = selectable.map((row) => this.identity(row));
      this.selection.set(
        this.selection().filter(
          (item) => !visible.includes(this.identity(item)),
        ),
      );
      return;
    }

    const merged = [...this.selection()];
    for (const row of selectable) {
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
    return this.renderColumns().filter(
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

/** One column's rules plus the logic joining them. */
interface ColumnFilterState {
  logic: GmFilterMatchLogic;
  constraints: GmTableFilterConstraint[];
}

/**
 * Shared empty result for an unfiltered column. A fresh `[]` per call would
 * hand the column's menu a new input reference on every change detection.
 */
const NO_CONSTRAINTS: readonly GmTableFilterConstraint[] = [];

/**
 * Whether two filter sets express the same query. Order matters, which is what
 * `replaceFieldFilters` keeps stable so an unchanged re-apply compares equal.
 */
function sameFilters(
  a: readonly GmTableFilter[],
  b: readonly GmTableFilter[],
): boolean {
  return (
    a.length === b.length &&
    a.every((filter, i) => {
      const other = b[i];
      return (
        filter.field === other.field &&
        filter.operator === other.operator &&
        (filter.logic ?? 'and') === (other.logic ?? 'and') &&
        sameFilterValue(filter.value, other.value)
      );
    })
  );
}

/** Dates and `in` arrays are the only non-primitive filter values. */
function sameFilterValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => item === b[i]);
  }
  return a === b;
}
