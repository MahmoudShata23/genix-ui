import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import {
  GmAccordionComponent,
  GmAutocompleteComponent,
  GmAccordionContentComponent,
  GmAccordionHeaderComponent,
  GmAccordionPanelComponent,
  GmBadgeComponent,
  GmButtonComponent,
  GmCardComponent,
  GmMessageComponent,
  GmCheckboxComponent,
  GmChartComponent,
  GmChartType,
  GmChipComponent,
  GmDatepickerComponent,
  GmDateRange,
  GmDialogService,
  GmFileRejection,
  GmFileUploadComponent,
  GmInputComponent,
  GmInputNumberComponent,
  GmMenuComponent,
  GmMenuItem,
  GmMultiselectComponent,
  GmOrderListComponent,
  GmOrderListItemDirective,
  GmPageChangeEvent,
  GmPaginationComponent,
  GmPopoverComponent,
  GmRadioComponent,
  GmSelectButtonComponent,
  GmSelectComponent,
  GmSelectOptionDirective,
  GmSelectValueDirective,
  GmSeverity,
  GmSize,
  GmSpinnerComponent,
  GmStepComponent,
  GmStepperComponent,
  GmTabComponent,
  GmTabLabelDirective,
  GmCellType,
  GmColumnReorderEvent,
  GmColumnSort,
  GmFilterCondition,
  GmFilterDescriptor,
  GmFilterType,
  GmStatusTone,
  GmTableAction,
  GmTableActionEvent,
  GmTableActionType,
  GmTableBulkActionScope,
  GmTableCellDirective,
  GmTableColumn,
  GmTableComponent,
  GmTableEmptyDirective,
  GmTableFilter,
  TableModel,
  GmTableQueryEvent,
  GmTableRequest,
  GmTableSortChange,
  GmTableToolbarComponent,
  GmTabsComponent,
  GmTextareaComponent,
  GmToggleSwitchComponent,
  GmToastService,
  GmTooltipDirective,
  GmTooltipPosition,
} from "@mahmoudshata23/genix-ui";

import { PgDialogDemoComponent, ProviderDraft } from "./dialog-demo.component";

interface Person {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

interface City {
  readonly id: number;
  readonly name: string;
}

interface Country {
  readonly name: string;
  readonly code: string;
}

interface Provider {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly country: string;
  readonly active: boolean;
  readonly score: number;
  /** Rendered as a coloured dot by the config grid's `dotColorMap`. */
  readonly tier: string;
  /** Deliberately long, to exercise the table's cell truncation. */
  readonly notes: string;
}

interface Benefit {
  readonly name: string;
  readonly cover: string;
}

interface Section {
  readonly id: string;
  readonly label: string;
}

/**
 * Kitchen sink for the published package.
 *
 * Everything below imports from `@mahmoudshata23/genix-ui`, which `tsconfig.json`
 * maps to `dist/genix-ui` — the build output, not `src`. So this page type-checks
 * against the generated `.d.ts` and renders from the FESM bundle, exactly as a
 * consumer would after `npm install`. If a component's public API or template
 * breaks, this fails to build before anything is published.
 *
 * Every exported component appears at least once. Controls that need a value
 * are bound to a real `FormControl`, so the ControlValueAccessor path is
 * exercised too — not just the static visual states.
 */
@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    // The column chooser is driven by a standalone ngModel, the same way the
    // library's own templates drive their controls.
    FormsModule,
    GmAccordionComponent,
    GmAutocompleteComponent,
    GmAccordionContentComponent,
    GmAccordionHeaderComponent,
    GmAccordionPanelComponent,
    GmBadgeComponent,
    GmButtonComponent,
    GmCardComponent,
    GmMessageComponent,
    GmFileUploadComponent,
    GmCheckboxComponent,
    GmChartComponent,
    GmChipComponent,
    GmDatepickerComponent,
    GmInputComponent,
    GmInputNumberComponent,
    GmMenuComponent,
    GmMultiselectComponent,
    GmOrderListComponent,
    GmOrderListItemDirective,
    GmPaginationComponent,
    GmPopoverComponent,
    GmRadioComponent,
    GmSelectButtonComponent,
    GmSelectComponent,
    GmSelectOptionDirective,
    GmSelectValueDirective,
    GmSpinnerComponent,
    GmStepComponent,
    GmStepperComponent,
    GmTabComponent,
    GmTabLabelDirective,
    GmTableCellDirective,
    GmTableComponent,
    GmTableEmptyDirective,
    GmTableToolbarComponent,
    GmTabsComponent,
    GmTextareaComponent,
    GmToggleSwitchComponent,
    GmTooltipDirective,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // ── Page chrome ─────────────────────────────────────────────────────────

  protected readonly sections: readonly Section[] = [
    { id: "form", label: "Reactive form" },
    { id: "button", label: "Button" },
    { id: "input", label: "Input" },
    { id: "textarea", label: "Textarea" },
    { id: "choice", label: "Checkbox & radio" },
    { id: "dropdown", label: "Select & multiselect" },
    { id: "select-advanced", label: "Select templates & virtual scroll" },
    { id: "multiselect-advanced", label: "Multiselect limit & virtual scroll" },
    { id: "datepicker", label: "Datepicker" },
    { id: "datepicker-advanced", label: "Datepicker time & range" },
    { id: "card", label: "Card" },
    { id: "badge", label: "Badge, chip, spinner" },
    { id: "tooltip", label: "Tooltip" },
    { id: "dialog", label: "Dialog" },
    { id: "toast", label: "Toast" },
    { id: "message", label: "Message" },
    { id: "tabs", label: "Tabs" },
    { id: "accordion", label: "Accordion" },
    { id: "pagination", label: "Pagination" },
    { id: "table", label: "Table" },
    {
      id: "small",
      label: "Popover, menu, switch, number, select button, autocomplete",
    },
    { id: "long-tail", label: "File upload, stepper, order list, chart" },
  ];

  protected readonly severities: readonly GmSeverity[] = [
    "primary",
    "secondary",
    "success",
    "info",
    "warning",
    "danger",
    "contrast",
  ];

  protected readonly sizes: readonly GmSize[] = ["small", "medium", "large"];

  protected readonly tooltipPositions: readonly GmTooltipPosition[] = [
    "top",
    "bottom",
    "left",
    "right",
  ];

  // ── Shared option data ──────────────────────────────────────────────────

  protected readonly countries: readonly Country[] = [
    { name: "Lebanon", code: "LB" },
    { name: "United Arab Emirates", code: "AE" },
    { name: "Saudi Arabia", code: "SA" },
    { name: "Egypt", code: "EG" },
    { name: "Jordan", code: "JO" },
    { name: "Kuwait", code: "KW" },
    { name: "Qatar", code: "QA" },
  ];

  /** Primitive options, to prove `optionLabel` / `optionValue` really are optional. */
  protected readonly plainOptions: readonly string[] = [
    "Cardiology",
    "Dermatology",
    "Neurology",
    "Oncology",
    "Radiology",
  ];

  // ── Section: reactive form ──────────────────────────────────────────────

  protected readonly form = new FormGroup({
    fullName: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    notes: new FormControl("", { nonNullable: true }),
    country: new FormControl<string | null>(null, [Validators.required]),
    specialities: new FormControl<unknown[]>([]),
    startDate: new FormControl<Date | null>(null, [Validators.required]),
    status: new FormControl("standard", { nonNullable: true }),
    acceptsTerms: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  protected readonly submitted = signal<string | null>(null);

  protected submit(): void {
    this.form.markAllAsTouched();
    this.submitted.set(
      this.form.valid
        ? JSON.stringify(this.form.getRawValue(), null, 2)
        : "Invalid — each control above is showing its own error state.",
    );
  }

  protected resetForm(): void {
    this.form.reset({
      status: "standard",
      acceptsTerms: false,
      specialities: [],
    });
    this.submitted.set(null);
  }

  // ── Standalone control instances ────────────────────────────────────────
  //
  // Separate controls, so poking at a demo cannot disturb the form above.

  protected readonly demoText = new FormControl("Prefilled value");
  protected readonly demoNumber = new FormControl<number | null>(42);
  protected readonly demoDisabled = new FormControl({
    value: "Cannot be edited",
    disabled: true,
  });
  protected readonly demoTextarea = new FormControl(
    "Multi-line content.\nSecond line.",
  );
  protected readonly demoCheckbox = new FormControl(true);
  protected readonly demoRadio = new FormControl("standard");
  protected readonly demoSelect = new FormControl<string | null>("LB");
  protected readonly demoSelectPlain = new FormControl<string | null>(null);
  protected readonly demoMultiselectMenu = new FormControl<unknown[]>([
    "LB",
    "AE",
  ]);
  protected readonly demoMultiselectChip = new FormControl<unknown[]>(["SA"]);
  protected readonly demoDate = new FormControl<Date | null>(new Date());
  protected readonly demoDateBounded = new FormControl<Date | null>(null);

  private readonly today = new Date();

  /** Bounds for the constrained datepicker: the current month only. */
  protected readonly monthStart = new Date(
    this.today.getFullYear(),
    this.today.getMonth(),
    1,
  );
  protected readonly monthEnd = new Date(
    this.today.getFullYear(),
    this.today.getMonth() + 1,
    0,
  );

  // ── Section: tabs & accordion ───────────────────────────────────────────

  protected readonly activeTab = signal<string | number | null>("summary");
  protected readonly accordionSingle = signal<
    string | number | (string | number)[] | null
  >("what");
  protected readonly accordionMultiple = signal<
    string | number | (string | number)[] | null
  >(["tokens", "peers"]);

  // ── Section: pagination ─────────────────────────────────────────────────

  /** 43 items, so the last page is deliberately a partial one. */
  protected readonly allRecords: readonly string[] = Array.from(
    { length: 43 },
    (_, index) => `Record ${index + 1}`,
  );

  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);

  protected readonly pagedRecords = computed(() => {
    const first = (this.page() - 1) * this.pageSize();
    return this.allRecords.slice(first, first + this.pageSize());
  });

  protected onPageChange(event: GmPageChangeEvent): void {
    this.page.set(event.page);
    this.pageSize.set(event.pageSize);
  }

  // ── Section: table ──────────────────────────────────────────────────────

  protected readonly providers: readonly Provider[] = [
    {
      id: 1,
      name: "Beirut Medical Center",
      type: "Hospital",
      country: "Lebanon",
      active: true,
      score: 92,
      tier: "Preferred",
      notes:
        "Tertiary referral centre; cardiology and oncology under a capitated annexe.",
    },
    {
      id: 2,
      name: "Al Noor Clinic",
      type: "Clinic",
      country: "UAE",
      active: true,
      score: 78,
      tier: "Standard",
      notes: "Primary care network, 6 branches. Dental excluded.",
    },
    {
      id: 3,
      name: "Cedars Diagnostics",
      type: "Laboratory",
      country: "Lebanon",
      active: false,
      score: 64,
      tier: "Standard",
      notes: "Laboratory only — no imaging. Courier pickup twice daily.",
    },
    {
      id: 4,
      name: "Gulf Specialist Hospital",
      type: "Hospital",
      country: "Saudi Arabia",
      active: true,
      score: 88,
      tier: "Preferred",
      notes:
        "Full service. Renegotiating the surgical tariff schedule for next term.",
    },
    {
      id: 5,
      name: "Nile Family Practice",
      type: "Clinic",
      country: "Egypt",
      active: false,
      score: 51,
      tier: "Watch",
      notes:
        "Family practice. Paediatrics referred out to the regional hospital.",
    },
    {
      id: 6,
      name: "Petra Imaging",
      type: "Laboratory",
      country: "Jordan",
      active: true,
      score: 71,
      tier: "Standard",
      notes: "Imaging: MRI, CT, ultrasound. Reports within 24h.",
    },
    {
      id: 7,
      name: "Doha Heart Institute",
      type: "Hospital",
      country: "Qatar",
      active: true,
      score: 95,
      tier: "Preferred",
      notes:
        "Cardiac surgery centre of excellence; direct billing agreement in place.",
    },
    {
      id: 8,
      name: "Salmiya Day Surgery",
      type: "Clinic",
      country: "Kuwait",
      active: false,
      score: 43,
      tier: "Watch",
      notes:
        "Day surgery only. Overnight stays are not covered under this contract.",
    },
  ];

  protected readonly columns: readonly GmTableColumn<Provider>[] = [
    {
      field: "name",
      header: "Provider",
      sortable: true,
      filterable: true,
      minWidth: "14rem",
      width: "15rem",
    },
    {
      field: "type",
      header: "Type",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "Hospital", value: "Hospital" },
        { label: "Clinic", value: "Clinic" },
        { label: "Laboratory", value: "Laboratory" },
      ],
      width: "10rem",
    },
    {
      field: "country",
      header: "Country",
      sortable: true,
      filterable: true,
      width: "12rem",
    },
    {
      field: "active",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "boolean",
      width: "9rem",
      align: "center",
    },
    {
      field: "score",
      header: "Score",
      sortable: true,
      filterable: true,
      filterType: "numeric",
      width: "7rem",
      align: "end",
    },
    {
      field: "actions",
      header: "",
      width: "7rem",
      align: "center",
      reorderable: false,
      exportable: false,
    },
  ];

  protected readonly selectedProviders = signal<Provider[]>([]);
  protected readonly tableLoading = signal(false);
  protected readonly showEmptyTable = signal(false);
  protected readonly lastRowAction = signal<string | null>(null);

  protected readonly tableRows = computed(() =>
    this.showEmptyTable() ? [] : this.providers,
  );

  protected rowAction(verb: string, row: Provider): void {
    this.lastRowAction.set(`${verb} → ${row.name}`);
  }

  /** Flips loading on briefly so the table's loading state is actually visible. */
  protected simulateLoad(): void {
    this.tableLoading.set(true);
    setTimeout(() => this.tableLoading.set(false), 1200);
  }

  protected toggleEmpty(): void {
    this.showEmptyTable.update((empty) => !empty);
  }

  protected scoreSeverity(score: number): GmSeverity {
    if (score >= 85) {
      return "success";
    }
    return score >= 60 ? "warning" : "danger";
  }

  // ── Section: composed data grid ─────────────────────────────────────────
  // Toolbar, table and paginator are three separate components stacked inside
  // one card. The table emits `queryChange`; everything else is this
  // component's own state — which is the point: the library ships no
  // all-in-one grid.

  private readonly gridTable =
    viewChild<GmTableComponent<Provider>>("gridTable");

  /** Every column the grid *can* show; the toolbar's chooser picks from these. */
  protected readonly gridAllColumns: readonly GmTableColumn<Provider>[] = [
    {
      field: "name",
      header: "Name",
      sortable: true,
      filterable: true,
      width: "16rem",
    },
    {
      field: "type",
      header: "Type",
      sortable: true,
      filterable: true,
      width: "10rem",
    },
    {
      field: "country",
      header: "Country",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "Lebanon", value: "Lebanon" },
        { label: "UAE", value: "UAE" },
        { label: "Egypt", value: "Egypt" },
        { label: "Jordan", value: "Jordan" },
        { label: "Qatar", value: "Qatar" },
        { label: "Kuwait", value: "Kuwait" },
        { label: "Saudi Arabia", value: "Saudi Arabia" },
      ],
      width: "12rem",
    },
    {
      field: "active",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "boolean",
      width: "9rem",
    },
    {
      field: "score",
      header: "Score",
      sortable: true,
      filterable: true,
      filterType: "numeric",
      width: "8rem",
      align: "end",
    },
    {
      field: "notes",
      header: "Notes",
      filterable: true,
      width: "16rem",
      // Tighter than the table's own 25, to show the per-column override.
      truncateAt: 18,
    },
  ];

  /** Toggled from the card's actions, to show `actionsAlign="auto"` working. */
  protected readonly showColumnChooser = signal(true);

  /**
   * Fed to the table's `rowSelectable` input. Here it locks inactive providers
   * so a bulk Delete can never reach one; the table disables their checkbox
   * and skips them in select-all.
   */
  protected readonly rowSelectable = (row: Provider): boolean => row.active;

  protected readonly gridVisibleFields = signal<string[]>(
    this.gridAllColumns.map((column) => column.field as string),
  );

  /** The actions column is not data, so it is never in the chooser. */
  /** Which edge the pinned actions column sticks to. Toggled from the heading. */
  protected readonly actionsEdge = signal<"start" | "end">("end");

  /**
   * The actions column is appended last whichever edge it pins to — the table
   * bands frozen columns into render order itself, so `frozenPosition` is the
   * only thing that changes here.
   */
  protected readonly gridColumns = computed<GmTableColumn<Provider>[]>(() => {
    const visible = this.gridVisibleFields();
    return [
      ...this.gridAllColumns.filter((column) =>
        visible.includes(column.field as string),
      ),
      {
        field: "actions",
        header: "Actions",
        width: "7rem",
        align: "center",
        frozen: true,
        frozenPosition: this.actionsEdge(),
        reorderable: false,
        exportable: false,
      },
    ];
  });

  /**
   * The grid's own copy of the list, so the Delete action has something real to
   * remove. The first Table card keeps reading `providers`, which is why the
   * two cards do not interfere.
   */
  private readonly gridData = signal<Provider[]>([...this.providers]);

  protected readonly gridRows = signal<Provider[]>([]);
  protected readonly gridTotal = signal(0);
  protected readonly lastGridAction = signal<string | null>(null);

  /**
   * Toolbar actions as data. Delete is `scope: 'selection'`, so it is absent
   * until rows are ticked and then acts on exactly those rows.
   */
  protected readonly gridActions: readonly GmTableAction<Provider>[] = [
    { key: "add", label: "Add", icon: "pi pi-plus" },
    {
      key: "import",
      label: "Import",
      icon: "pi pi-download",
      severity: "secondary",
      variant: "text",
    },
    {
      key: "export",
      label: "Export",
      icon: "pi pi-upload",
      severity: "secondary",
      variant: "text",
      command: () => this.exportGrid(),
    },
    {
      key: "delete",
      label: "Delete",
      icon: "pi pi-trash",
      severity: "danger",
      scope: "selection",
      tooltip: "Delete the selected providers",
      command: (rows) => this.deleteGridRows(rows),
    },
  ];
  protected readonly gridPage = signal(1);
  protected readonly gridPageSize = signal(5);
  protected readonly gridSelection = signal<Provider[]>([]);

  /** The last query, replayed after a mutation such as a delete. */
  private lastGridQuery: GmTableQueryEvent = {
    page: 1,
    pageSize: 5,
    first: 0,
    filters: [],
  };

  constructor() {
    // Seed the grid the way a real feature does: one fetch on init.
    this.runGridQuery(this.lastGridQuery);
  }

  protected onGridQuery(query: GmTableQueryEvent): void {
    this.gridPageSize.set(query.pageSize);
    this.runGridQuery(query);
  }

  /** Every toolbar action lands here too, whether or not it has a `command`. */
  protected onGridAction(event: GmTableActionEvent<Provider>): void {
    this.lastGridAction.set(
      `${event.action.key} → ${event.rows.length} row(s)`,
    );
  }

  /**
   * `rows` is the toolbar's snapshot, so clearing the selection first is safe.
   * A real feature would confirm, then call its API and re-fetch — the shape of
   * the work is the same.
   */
  private deleteGridRows(rows: readonly Provider[]): void {
    const doomed = new Set(rows.map((row) => row.id));
    this.gridData.update((list) => list.filter((row) => !doomed.has(row.id)));
    this.gridSelection.set([]);
    // Re-issue the last query against the smaller list.
    this.runGridQuery(this.lastGridQuery);
  }

  /** The paginator reports page changes; fold them into the same one query. */
  protected onGridPage(event: GmPageChangeEvent): void {
    this.gridTable()?.setPage(event);
  }

  protected clearGridFilters(): void {
    this.gridTable()?.clearAllFilters();
  }

  protected gridHasFilters(): boolean {
    return this.gridTable()?.hasActiveFilters() ?? false;
  }

  /** Export is the table's own; the toolbar just triggers it. */
  protected exportGrid(): void {
    this.gridTable()?.exportCsv({ fileName: "providers" });
  }

  /**
   * The toolbar enforces `minVisibleColumns` itself and reverts the control;
   * all a consumer adds is the explanation.
   */
  protected onColumnChooserRejected(min: number): void {
    this.toastService.warning(`Keep at least ${min} columns visible.`, {
      summary: "Columns",
    });
  }

  /**
   * Stands in for the API. Worth reading as the reference for a real backend
   * adapter: rules arrive as a flat list, so they are bucketed by field, the
   * bucket's `logic` decides any/all, and buckets AND together.
   */
  private runGridQuery(query: GmTableQueryEvent): void {
    this.lastGridQuery = query;

    const byField = new Map<string, GmTableFilter[]>();
    for (const filter of query.filters) {
      byField.set(filter.field, [...(byField.get(filter.field) ?? []), filter]);
    }

    let rows = this.gridData().filter((row) =>
      [...byField.values()].every((rules) => {
        const test = (rule: GmTableFilter) =>
          matchesRule(row[rule.field as keyof Provider], rule);
        return rules[0].logic === "or" ? rules.some(test) : rules.every(test);
      }),
    );

    const sort = query.sort;
    if (sort) {
      const factor = sort.direction === "desc" ? -1 : 1;
      rows = [...rows].sort(
        (a, b) =>
          factor *
          String(a[sort.field as keyof Provider]).localeCompare(
            String(b[sort.field as keyof Provider]),
            undefined,
            { numeric: true },
          ),
      );
    }

    this.gridTotal.set(rows.length);

    // A delete can empty the page the user was on, so fall back to the last
    // page that still exists rather than showing a blank grid.
    const pages = Math.max(1, Math.ceil(rows.length / query.pageSize));
    const page = Math.min(query.page, pages);
    const first = (page - 1) * query.pageSize;

    this.gridPage.set(page);
    this.gridRows.set(rows.slice(first, first + query.pageSize));
  }

  // ── Section: table, config-driven ───────────────────────────────────────
  // The same component as the two cards above, handed a `tableConfig` instead
  // of `[columns]`: it mounts its own toolbar, actions column and paginator,
  // and reports sort/filter/page as list-API requests.

  protected readonly tableOptionsMenuItems = computed<GmMenuItem[]>(() => [
    {
      label: this.configActionsEdge() === 'start' ? 'Pin actions right' : 'Pin actions left',
      icon: 'pi pi-thumbtack',
      command: () => this.configActionsEdge.set(this.configActionsEdge() === 'start' ? 'end' : 'start'),
    },
    {
      label: this.configColumnChooser() ? 'Hide column chooser' : 'Show column chooser',
      icon: 'pi pi-list',
      command: () => this.configColumnChooser.set(!this.configColumnChooser()),
    },
    {
      label: this.configReorder() ? 'Lock column order' : 'Drag to reorder',
      icon: 'pi pi-arrows-move',
      command: () => this.configReorder.set(!this.configReorder()),
    },
    {
      label: this.configLockInactive() ? 'Unlock inactive rows' : 'Lock inactive rows',
      icon: 'pi pi-lock',
      command: () => this.configLockInactive.set(!this.configLockInactive()),
    },
  ]);

  /**
   * Headers and action labels are *keys*, as a real screen's are. This stands
   * in for a translation pipe — a key with no entry falls through unchanged,
   * which is what the library's default does too.
   */
  protected readonly configTranslate = (key: string): string =>
    ({
      actions: "Actions",
      add: "Add provider",
      delete: "Delete",
      export: "Export",
      edit: "Edit",
      selectColumns: "Columns",
      provider: "Provider",
      type: "Type",
      country: "Country",
      score: "Score",
      status: "Status",
      tier: "Tier",
      notes: "Notes",
    })[key] ?? key;

  protected readonly configSelection = signal<Provider[]>([]);
  protected readonly lastConfigEvent = signal("nothing yet");

  /** The config grid itself, for the Export action's `exportCsv()`. */
  private readonly configTable =
    viewChild<GmTableComponent<Provider>>("configTable");

  /**
   * The switches above the grid. Each one only rebuilds `providerConfig` —
   * the point of the section is that the whole view is that one object, so
   * nothing here reaches for a table input.
   */
  protected readonly configColumnChooser = signal(true);
  protected readonly configActionsEdge = signal<"start" | "end">("start");
  protected readonly configReorder = signal(false);
  protected readonly configLockInactive = signal(true);

  private readonly configQuery = signal<{
    filters: readonly GmFilterDescriptor[];
    sort: GmColumnSort | null;
    page: number;
    pageSize: number;
  }>({ filters: [], sort: null, page: 1, pageSize: 5 });

  /**
   * The whole grid as one object: columns and their renderers, which rows may
   * be ticked, where the actions column pins, whether the chooser is offered
   * and whether headers can be dragged. A `computed`, so the switches above it
   * change the grid by handing it a new config — never by touching an input.
   */
  protected readonly providerConfig = computed<TableModel<Provider>>(() => ({
    columns: [
      {
        field: "name",
        header: "provider",
        filterble: false,
        sortable: false,
        // filterType: GmFilterType.TEXT,
        width: "16rem",
        align: "start",
        // Pinned, and never offered in the chooser: every other cell is about
        // this one, so the grid would be unreadable without it.
        frozen: false,
        toggleable: false,
        linkPath: (row) => this.lastConfigEvent.set(`Open → ${row.name}`),
      },
      {
        field: "type",
        header: "type",
        filterType: GmFilterType.SELECT,
        filterOptions: [
          { id: 1, label: "Hospital" },
          { id: 2, label: "Clinic" },
          { id: 3, label: "Laboratory" },
        ],
      },
      { field: "country", header: "country", filterType: GmFilterType.TEXT },
      {
        field: "score",
        header: "score",
        filterType: GmFilterType.NUMERIC,
        width: "8rem",
        align: "end",
      },
      { field: "active", header: "status", filterType: GmFilterType.BOOLEAN },
      {
        // The same value as `status`, drawn as a dot rather than a mark, to
        // show a cellType renderer beside the plain ones.
        field: "tier",
        header: "tier",
        sortable: false,
        width: "7rem",
        cellType: GmCellType.DOT,
        dotColorMap: {
          preferred: GmStatusTone.SUCCESS,
          standard: GmStatusTone.INFO,
          watch: GmStatusTone.WARNING,
        },
        tooltipField: "tier",
      },
      {
        field: "notes",
        header: "notes",
        filterType: GmFilterType.TEXT,
        width: "18rem",
        align: "start",
        sortable: false,
        // Tighter than the table's own 25, so the rest moves into a tooltip.
        truncateAt: 24,
        // Truncated prose is display, not data worth exporting.
        exportable: false,
      },
    ],
    singleActions: [
      {
        type: GmTableActionType.EDIT,
        command: (row) => this.lastConfigEvent.set(`Edit → ${row.name}`),
      },
      {
        // Hidden on inactive rows: the slot stays, so the icons of every row
        // still line up.
        type: GmTableActionType.DELETE,
        command: (row) => this.lastConfigEvent.set(`Delete → ${row.name}`),
        visible: (row) => row.active,
      },
    ],
    bulkActions: [
      {
        type: GmTableActionType.DELETE,
        command: (rows) =>
          this.lastConfigEvent.set(`Delete ${rows.length} providers`),
        scope: GmTableBulkActionScope.SELECTED_ROWS_ONLY,
      },
      {
        // Export is the table's own: `exportCsv()` writes the rendered rows,
        // minus the columns that opted out.
        type: GmTableActionType.UPLOAD,
        command: () => this.exportConfigGrid(),
        scope: GmTableBulkActionScope.GLOBAL,
      },
    ],
    // Inactive providers cannot be ticked, so a bulk Delete can never reach
    // one — the same predicate the composed grid passes as an input.
    rowSelectable: this.configLockInactive()
      ? (row: Provider) => row.active
      : undefined,
    showColumnChooser: this.configColumnChooser(),
    reorderableColumns: this.configReorder(),
    actionsPosition: this.configActionsEdge(),
  }));

  private exportConfigGrid(): void {
    this.configTable()?.exportCsv({ fileName: "providers" });
    this.lastConfigEvent.set("Export · exportCsv()");
  }

  protected onConfigReorder(event: GmColumnReorderEvent<Provider>): void {
    // The table keeps the new order itself in config mode; the event is only
    // so a feature can persist it.
    this.lastConfigEvent.set(
      `columnReorder · ${event.previousIndex} → ${event.currentIndex}`,
    );
  }

  /**
   * Stands in for the API. Worth reading as the reference for a real adapter:
   * descriptors arrive with a numeric `condition`, which is exactly what a
   * backend filter clause switches on.
   */
  private readonly configMatched = computed<readonly Provider[]>(() => {
    const { filters, sort } = this.configQuery();

    const rows = this.providers.filter((row) =>
      filters.every((descriptor) => matchesDescriptor(row, descriptor)),
    );

    if (!sort?.orderBy) {
      return rows;
    }
    const factor = sort.ascending ? 1 : -1;
    const field = sort.orderBy as keyof Provider;
    return [...rows].sort(
      (a, b) =>
        factor *
        String(a[field]).localeCompare(String(b[field]), undefined, {
          numeric: true,
        }),
    );
  });

  protected readonly configTotal = computed(() => this.configMatched().length);

  protected readonly configRecords = computed<Provider[]>(() => {
    const { page, pageSize } = this.configQuery();
    const first = (page - 1) * pageSize;
    return this.configMatched().slice(first, first + pageSize);
  });

  /** Filtering already comes back at page one — the event says so. */
  protected onConfigFilter(request: GmTableRequest): void {
    this.configQuery.update((query) => ({
      ...query,
      filters: request.filters ?? [],
      page: request.pageNumber,
      pageSize: request.pageSize,
    }));
    this.lastConfigEvent.set(
      `filterChange · ${request.filters?.length ?? 0} descriptor(s)`,
    );
  }

  protected onConfigPage(request: GmTableRequest): void {
    this.configQuery.update((query) => ({
      ...query,
      page: request.pageNumber,
      pageSize: request.pageSize,
    }));
    this.lastConfigEvent.set(`pageChange · page ${request.pageNumber}`);
  }

  protected onConfigSort(sort: GmTableSortChange): void {
    this.configQuery.update((query) => ({ ...query, sort, page: 1 }));
    this.lastConfigEvent.set(
      sort.orderBy
        ? `sortChange · ${sort.orderBy} ${sort.ascending ? "asc" : "desc"}`
        : "sortChange · unsorted",
    );
  }

  // ── Dialog ──────────────────────────────────────────────────────────────

  private readonly dialogService = inject(GmDialogService);

  protected readonly dialogResult = signal("nothing yet");

  /** The everyday case: hand data in, get a result back. */
  protected openDialog(): void {
    const ref = this.dialogService.open<
      PgDialogDemoComponent,
      ProviderDraft,
      string
    >(PgDialogDemoComponent, {
      header: "Edit provider",
      width: "480px",
      data: { name: "Nile Diagnostics", country: "Egypt" },
      dismissableMask: true,
    });

    // Completes on close, so the subscription needs no teardown.
    ref.onClose.subscribe((result) =>
      this.dialogResult.set(result ?? "dismissed without a result"),
    );
  }

  /** Proves the two escape hatches can be switched off independently. */
  protected openLockedDialog(): void {
    const ref = this.dialogService.open<
      PgDialogDemoComponent,
      ProviderDraft,
      string
    >(PgDialogDemoComponent, {
      header: "Only the buttons close this one",
      width: "480px",
      data: { name: "Locked", country: "Egypt" },
      closable: false,
      closeOnEscape: false,
    });

    ref.onClose.subscribe((result) =>
      this.dialogResult.set(result ?? "cancelled"),
    );
  }

  // ── Toast ───────────────────────────────────────────────────────────────

  private readonly toastService = inject(GmToastService);

  protected toastSuccess(): void {
    this.toastService.success("Saved successfully");
  }

  protected toastInfo(): void {
    this.toastService.info("Provider list refreshed");
  }

  protected toastWarning(): void {
    this.toastService.warning("Please check the data before submitting");
  }

  /** Shown as `danger`, and the only severity that alerts assistive tech. */
  protected toastError(): void {
    this.toastService.error("Something went wrong");
  }

  /** The generic form — what a PrimeNG `messageService.add()` becomes. */
  protected toastWithSummary(): void {
    this.toastService.show({
      severity: "success",
      summary: "Success",
      detail: "Saved successfully",
    });
  }

  /** `duration: 0` means it waits to be dismissed. */
  protected toastSticky(): void {
    this.toastService.error("This one waits for you", { duration: 0 });
  }

  protected toastBurst(): void {
    for (let index = 1; index <= 5; index += 1) {
      this.toastService.info(`Queued notification ${index}`);
    }
  }

  protected toastClear(): void {
    this.toastService.clear();
  }

  // ── Select templates & virtual scroll ───────────────────────────────────

  protected readonly people: readonly Person[] = [
    {
      id: 1,
      name: "Amira Hassan",
      email: "amira@globemed.test",
      role: "Claims",
    },
    {
      id: 2,
      name: "Karim Fouad",
      email: "karim@globemed.test",
      role: "Network",
    },
    {
      id: 3,
      name: "Nadia Saleh",
      email: "nadia@globemed.test",
      role: "Finance",
    },
    {
      id: 4,
      name: "Omar Rashid",
      email: "omar@globemed.test",
      role: "Support",
    },
  ];

  protected readonly assignee = new FormControl<number | null>(2);

  /** Deliberately large: a row per option here would be 5,000 DOM nodes. */
  protected readonly cities: readonly City[] = Array.from(
    { length: 5000 },
    (_, index) => ({ id: index + 1, name: `City ${index + 1}` }),
  );

  protected readonly cityId = new FormControl<number | null>(null);

  // ── Multiselect limit & virtual scroll ──────────────────────────────────

  protected readonly roleOptions: readonly City[] = [
    { id: 1, name: "Admin" },
    { id: 2, name: "Claims officer" },
    { id: 3, name: "Auditor" },
    { id: 4, name: "Read only" },
  ];

  protected readonly limitedRoles = new FormControl<number[] | null>([1]);

  protected readonly pickedCities = new FormControl<number[] | null>([]);

  // ── Datepicker time & range ─────────────────────────────────────────────

  protected readonly appointment = new FormControl<Date | null>(
    new Date(2026, 8, 8, 14, 30),
  );

  protected readonly meeting = new FormControl<Date | null>(null);

  protected readonly startTime = new FormControl<Date | null>(null);

  protected readonly period = new FormControl<GmDateRange | null>(null);

  // ── Small components ────────────────────────────────────────────────────

  protected readonly lastCommand = signal("nothing yet");

  protected readonly menuItems: GmMenuItem[] = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => this.lastCommand.set("edit"),
    },
    { separator: true },
    { label: "Archive", icon: "pi pi-inbox", disabled: true },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => this.lastCommand.set("delete"),
    },
  ];

  protected readonly notifications = new FormControl<boolean | null>(true);

  /** Disabled through the control, which is the reactive-forms way. */
  protected readonly locked = new FormControl<boolean | null>({
    value: false,
    disabled: true,
  });

  protected readonly coverage = new FormControl<number | null>(80);

  protected readonly premium = new FormControl<number | null>(null);

  protected readonly claimStatuses: readonly {
    label: string;
    value: string;
    inactive?: boolean;
  }[] = [
    { label: "Draft", value: "draft" },
    { label: "Submitted", value: "submitted" },
    { label: "Void", value: "void", inactive: true },
    { label: "Settled", value: "settled" },
  ];

  protected readonly claimStatus = new FormControl<string | null>("draft");

  protected readonly assignedUser = new FormControl<number | null>(null);

  protected readonly userSuggestions = signal<readonly Person[]>([]);

  protected readonly userSearching = signal(false);

  /** What a real page would send to a service; here it filters in place. */
  protected searchUsers(term: string): void {
    this.userSuggestions.set(
      this.people.filter((person) =>
        person.name.toLowerCase().includes(term.toLowerCase()),
      ),
    );
  }

  // ── File upload, stepper, order list, chart ─────────────────────────────

  /** What a real page would post to its own service. */
  protected readonly attachments = signal<readonly File[]>([]);

  protected readonly attachmentErrors = signal<readonly GmFileRejection[]>([]);

  protected wizardStep = 0;

  protected readonly nextBlocked = signal(false);

  protected readonly reviewDone = signal<boolean | undefined>(undefined);

  protected readonly benefits = signal<readonly Benefit[]>([
    { name: "Inpatient", cover: "Full" },
    { name: "Outpatient", cover: "80%" },
    { name: "Dental", cover: "50%" },
    { name: "Optical", cover: "Capped" },
  ]);

  protected readonly benefitOrder = computed(() =>
    this.benefits()
      .map((benefit) => benefit.name)
      .join(" → "),
  );

  protected readonly chartTypes: readonly GmChartType[] = [
    "bar",
    "line",
    "doughnut",
  ];

  protected readonly chartType = signal<GmChartType>("bar");

  /** Chart.js options, typed by the app — the wrapper forwards them. */
  protected readonly chartOptions = {
    plugins: { legend: { position: "bottom" } },
  };

  protected readonly chartData = signal<unknown>(this.buildChartData());

  protected reorderBenefits(next: unknown[]): void {
    this.benefits.set(next as Benefit[]);
  }

  /** A new object, because the chart compares data by identity. */
  protected shuffleChart(): void {
    this.chartData.set(this.buildChartData());
  }

  private buildChartData(): unknown {
    return {
      labels: ["Jan", "Feb", "Mar", "Apr"],
      datasets: [
        {
          label: "Claims",
          data: Array.from({ length: 4 }, () =>
            Math.round(20 + Math.random() * 80),
          ),
          backgroundColor: [
            this.token("--gm-primary"),
            this.token("--gm-success"),
            this.token("--gm-warning"),
            this.token("--gm-info"),
          ],
          borderColor: this.token("--gm-primary"),
        },
      ],
    };
  }

  /** Chart colours come from the design system, resolved here. */
  private token(name: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }
}

/**
 * The comparison half of the playground's stand-in API — one case per
 * `GmFilterOperator`, which is exactly the mapping a real backend adapter
 * writes against its own query language.
 */
function matchesRule(value: unknown, rule: GmTableFilter): boolean {
  const text = (v: unknown) => String(v ?? "").toLowerCase();
  const cell = text(value);
  const wanted = text(rule.value);

  switch (rule.operator) {
    case "startsWith":
      return cell.startsWith(wanted);
    case "endsWith":
      return cell.endsWith(wanted);
    case "contains":
      return cell.includes(wanted);
    case "notContains":
      return !cell.includes(wanted);
    case "notEquals":
      return cell !== wanted;
    case "gt":
      return Number(value) > Number(rule.value);
    case "gte":
      return Number(value) >= Number(rule.value);
    case "lt":
      return Number(value) < Number(rule.value);
    case "lte":
      return Number(value) <= Number(rule.value);
    case "in":
      return (rule.value as unknown[]).map(text).includes(cell);
    default:
      return cell === wanted;
  }
}

/**
 * The descriptor half of the same stand-in: a config-mode grid reports
 * `GmFilterDescriptor`s, whose `condition` is the numeric comparison a list
 * endpoint publishes rather than the component's own operator name.
 */
function matchesDescriptor(
  row: object,
  descriptor: GmFilterDescriptor,
): boolean {
  const value = (row as Record<string, unknown>)[descriptor.propertyName ?? ""];
  const cell = String(value ?? "").toLowerCase();
  const wanted = String(descriptor.value ?? "").toLowerCase();

  switch (descriptor.condition) {
    case GmFilterCondition.StartsWith:
      return cell.startsWith(wanted);
    case GmFilterCondition.EndsWith:
      return cell.endsWith(wanted);
    case GmFilterCondition.Contains:
      return cell.includes(wanted);
    case GmFilterCondition.NotContains:
      return !cell.includes(wanted);
    case GmFilterCondition.NotEquals:
      return cell !== wanted;
    case GmFilterCondition.GreaterThan:
      return Number(value) > Number(descriptor.value);
    case GmFilterCondition.GreaterThanOrEqualTo:
      return Number(value) >= Number(descriptor.value);
    case GmFilterCondition.LessThan:
      return Number(value) < Number(descriptor.value);
    case GmFilterCondition.LessThanOrEqualTo:
      return Number(value) <= Number(descriptor.value);
    default:
      return cell === wanted;
  }
}
