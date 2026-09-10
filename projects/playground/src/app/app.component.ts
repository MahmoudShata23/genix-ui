import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

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
  GmTableCellDirective,
  GmTableColumn,
  GmTableComponent,
  GmTableEmptyDirective,
  GmTabsComponent,
  GmTextareaComponent,
  GmToggleSwitchComponent,
  GmToastService,
  GmTooltipDirective,
  GmTooltipPosition,
} from '@mahmoudshata23/genix-ui';

import {
  PgDialogDemoComponent,
  ProviderDraft,
} from './dialog-demo.component';

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
  selector: 'app-root',
  standalone: true,
  imports: [
    ReactiveFormsModule,
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
    GmTabsComponent,
    GmTextareaComponent,
    GmToggleSwitchComponent,
    GmTooltipDirective,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // ── Page chrome ─────────────────────────────────────────────────────────

  protected readonly sections: readonly Section[] = [
    { id: 'form', label: 'Reactive form' },
    { id: 'button', label: 'Button' },
    { id: 'input', label: 'Input' },
    { id: 'textarea', label: 'Textarea' },
    { id: 'choice', label: 'Checkbox & radio' },
    { id: 'dropdown', label: 'Select & multiselect' },
    { id: 'select-advanced', label: 'Select templates & virtual scroll' },
    { id: 'multiselect-advanced', label: 'Multiselect limit & virtual scroll' },
    { id: 'datepicker', label: 'Datepicker' },
    { id: 'datepicker-advanced', label: 'Datepicker time & range' },
    { id: 'card', label: 'Card' },
    { id: 'badge', label: 'Badge, chip, spinner' },
    { id: 'tooltip', label: 'Tooltip' },
    { id: 'dialog', label: 'Dialog' },
    { id: 'toast', label: 'Toast' },
    { id: 'message', label: 'Message' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'accordion', label: 'Accordion' },
    { id: 'pagination', label: 'Pagination' },
    { id: 'table', label: 'Table' },
    { id: 'small', label: 'Popover, menu, switch, number, select button, autocomplete' },
    { id: 'long-tail', label: 'File upload, stepper, order list, chart' },
  ];

  protected readonly severities: readonly GmSeverity[] = [
    'primary',
    'secondary',
    'success',
    'info',
    'warning',
    'danger',
    'contrast',
  ];

  protected readonly sizes: readonly GmSize[] = ['small', 'medium', 'large'];

  protected readonly tooltipPositions: readonly GmTooltipPosition[] = [
    'top',
    'bottom',
    'left',
    'right',
  ];

  // ── Shared option data ──────────────────────────────────────────────────

  protected readonly countries: readonly Country[] = [
    { name: 'Lebanon', code: 'LB' },
    { name: 'United Arab Emirates', code: 'AE' },
    { name: 'Saudi Arabia', code: 'SA' },
    { name: 'Egypt', code: 'EG' },
    { name: 'Jordan', code: 'JO' },
    { name: 'Kuwait', code: 'KW' },
    { name: 'Qatar', code: 'QA' },
  ];

  /** Primitive options, to prove `optionLabel` / `optionValue` really are optional. */
  protected readonly plainOptions: readonly string[] = [
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Oncology',
    'Radiology',
  ];

  // ── Section: reactive form ──────────────────────────────────────────────

  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    notes: new FormControl('', { nonNullable: true }),
    country: new FormControl<string | null>(null, [Validators.required]),
    specialities: new FormControl<unknown[]>([]),
    startDate: new FormControl<Date | null>(null, [Validators.required]),
    status: new FormControl('standard', { nonNullable: true }),
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
        : 'Invalid — each control above is showing its own error state.',
    );
  }

  protected resetForm(): void {
    this.form.reset({ status: 'standard', acceptsTerms: false, specialities: [] });
    this.submitted.set(null);
  }

  // ── Standalone control instances ────────────────────────────────────────
  //
  // Separate controls, so poking at a demo cannot disturb the form above.

  protected readonly demoText = new FormControl('Prefilled value');
  protected readonly demoNumber = new FormControl<number | null>(42);
  protected readonly demoDisabled = new FormControl({
    value: 'Cannot be edited',
    disabled: true,
  });
  protected readonly demoTextarea = new FormControl(
    'Multi-line content.\nSecond line.',
  );
  protected readonly demoCheckbox = new FormControl(true);
  protected readonly demoRadio = new FormControl('standard');
  protected readonly demoSelect = new FormControl<string | null>('LB');
  protected readonly demoSelectPlain = new FormControl<string | null>(null);
  protected readonly demoMultiselectMenu = new FormControl<unknown[]>(['LB', 'AE']);
  protected readonly demoMultiselectChip = new FormControl<unknown[]>(['SA']);
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

  protected readonly activeTab = signal<string | number | null>('summary');
  protected readonly accordionSingle = signal<
    string | number | (string | number)[] | null
  >('what');
  protected readonly accordionMultiple = signal<
    string | number | (string | number)[] | null
  >(['tokens', 'peers']);

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
    { id: 1, name: 'Beirut Medical Center', type: 'Hospital', country: 'Lebanon', active: true, score: 92 },
    { id: 2, name: 'Al Noor Clinic', type: 'Clinic', country: 'UAE', active: true, score: 78 },
    { id: 3, name: 'Cedars Diagnostics', type: 'Laboratory', country: 'Lebanon', active: false, score: 64 },
    { id: 4, name: 'Gulf Specialist Hospital', type: 'Hospital', country: 'Saudi Arabia', active: true, score: 88 },
    { id: 5, name: 'Nile Family Practice', type: 'Clinic', country: 'Egypt', active: false, score: 51 },
    { id: 6, name: 'Petra Imaging', type: 'Laboratory', country: 'Jordan', active: true, score: 71 },
    { id: 7, name: 'Doha Heart Institute', type: 'Hospital', country: 'Qatar', active: true, score: 95 },
    { id: 8, name: 'Salmiya Day Surgery', type: 'Clinic', country: 'Kuwait', active: false, score: 43 },
  ];

  protected readonly columns: readonly GmTableColumn<Provider>[] = [
    {
      field: 'name',
      header: 'Provider',
      sortable: true,
      filterable: true,
      minWidth: '14rem',
      width: '15rem',
    },
    {
      field: 'type',
      header: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Hospital', value: 'Hospital' },
        { label: 'Clinic', value: 'Clinic' },
        { label: 'Laboratory', value: 'Laboratory' },
      ],
      width: '10rem',
    },
    { field: 'country', header: 'Country', sortable: true, filterable: true, width: '12rem' },
    {
      field: 'active',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'boolean',
      width: '9rem',
      align: 'center',
    },
    {
      field: 'score',
      header: 'Score',
      sortable: true,
      filterable: true,
      filterType: 'numeric',
      width: '7rem',
      align: 'end',
    },
    {
      field: 'actions',
      header: '',
      width: '7rem',
      align: 'center',
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
      return 'success';
    }
    return score >= 60 ? 'warning' : 'danger';
  }

  // ── Dialog ──────────────────────────────────────────────────────────────

  private readonly dialogService = inject(GmDialogService);

  protected readonly dialogResult = signal('nothing yet');

  /** The everyday case: hand data in, get a result back. */
  protected openDialog(): void {
    const ref = this.dialogService.open<PgDialogDemoComponent, ProviderDraft, string>(
      PgDialogDemoComponent,
      {
        header: 'Edit provider',
        width: '480px',
        data: { name: 'Nile Diagnostics', country: 'Egypt' },
        dismissableMask: true,
      },
    );

    // Completes on close, so the subscription needs no teardown.
    ref.onClose.subscribe((result) =>
      this.dialogResult.set(result ?? 'dismissed without a result'),
    );
  }

  /** Proves the two escape hatches can be switched off independently. */
  protected openLockedDialog(): void {
    const ref = this.dialogService.open<PgDialogDemoComponent, ProviderDraft, string>(
      PgDialogDemoComponent,
      {
        header: 'Only the buttons close this one',
        width: '480px',
        data: { name: 'Locked', country: 'Egypt' },
        closable: false,
        closeOnEscape: false,
      },
    );

    ref.onClose.subscribe((result) => this.dialogResult.set(result ?? 'cancelled'));
  }

  // ── Toast ───────────────────────────────────────────────────────────────

  private readonly toastService = inject(GmToastService);

  protected toastSuccess(): void {
    this.toastService.success('Saved successfully');
  }

  protected toastInfo(): void {
    this.toastService.info('Provider list refreshed');
  }

  protected toastWarning(): void {
    this.toastService.warning('Please check the data before submitting');
  }

  /** Shown as `danger`, and the only severity that alerts assistive tech. */
  protected toastError(): void {
    this.toastService.error('Something went wrong');
  }

  /** The generic form — what a PrimeNG `messageService.add()` becomes. */
  protected toastWithSummary(): void {
    this.toastService.show({
      severity: 'success',
      summary: 'Success',
      detail: 'Saved successfully',
    });
  }

  /** `duration: 0` means it waits to be dismissed. */
  protected toastSticky(): void {
    this.toastService.error('This one waits for you', { duration: 0 });
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
    { id: 1, name: 'Amira Hassan', email: 'amira@globemed.test', role: 'Claims' },
    { id: 2, name: 'Karim Fouad', email: 'karim@globemed.test', role: 'Network' },
    { id: 3, name: 'Nadia Saleh', email: 'nadia@globemed.test', role: 'Finance' },
    { id: 4, name: 'Omar Rashid', email: 'omar@globemed.test', role: 'Support' },
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
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Claims officer' },
    { id: 3, name: 'Auditor' },
    { id: 4, name: 'Read only' },
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

  protected readonly lastCommand = signal('nothing yet');

  protected readonly menuItems: GmMenuItem[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => this.lastCommand.set('edit'),
    },
    { separator: true },
    { label: 'Archive', icon: 'pi pi-inbox', disabled: true },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => this.lastCommand.set('delete'),
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
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Void', value: 'void', inactive: true },
    { label: 'Settled', value: 'settled' },
  ];

  protected readonly claimStatus = new FormControl<string | null>('draft');

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

  protected readonly attachmentErrors = signal<readonly GmFileRejection[]>(
    [],
  );

  protected wizardStep = 0;

  protected readonly nextBlocked = signal(false);

  protected readonly reviewDone = signal<boolean | undefined>(undefined);

  protected readonly benefits = signal<readonly Benefit[]>([
    { name: 'Inpatient', cover: 'Full' },
    { name: 'Outpatient', cover: '80%' },
    { name: 'Dental', cover: '50%' },
    { name: 'Optical', cover: 'Capped' },
  ]);

  protected readonly benefitOrder = computed(() =>
    this.benefits().map((benefit) => benefit.name).join(' → '),
  );

  protected readonly chartTypes: readonly GmChartType[] = [
    'bar',
    'line',
    'doughnut',
  ];

  protected readonly chartType = signal<GmChartType>('bar');

  /** Chart.js options, typed by the app — the wrapper forwards them. */
  protected readonly chartOptions = {
    plugins: { legend: { position: 'bottom' } },
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
      labels: ['Jan', 'Feb', 'Mar', 'Apr'],
      datasets: [
        {
          label: 'Claims',
          data: Array.from({ length: 4 }, () =>
            Math.round(20 + Math.random() * 80),
          ),
          backgroundColor: [
            this.token('--gm-primary'),
            this.token('--gm-success'),
            this.token('--gm-warning'),
            this.token('--gm-info'),
          ],
          borderColor: this.token('--gm-primary'),
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
