import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  GmAccordionComponent,
  GmAccordionContentComponent,
  GmAccordionHeaderComponent,
  GmAccordionPanelComponent,
  GmBadgeComponent,
  GmButtonComponent,
  GmCardComponent,
  GmCheckboxComponent,
  GmChipComponent,
  GmDatepickerComponent,
  GmInputComponent,
  GmMultiselectComponent,
  GmPageChangeEvent,
  GmPaginationComponent,
  GmRadioComponent,
  GmSelectComponent,
  GmSeverity,
  GmSize,
  GmSpinnerComponent,
  GmTabComponent,
  GmTabLabelDirective,
  GmTableCellDirective,
  GmTableColumn,
  GmTableComponent,
  GmTableEmptyDirective,
  GmTabsComponent,
  GmTextareaComponent,
  GmTooltipDirective,
  GmTooltipPosition,
} from '@mahmoudshata23/genix-ui';

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
    GmAccordionContentComponent,
    GmAccordionHeaderComponent,
    GmAccordionPanelComponent,
    GmBadgeComponent,
    GmButtonComponent,
    GmCardComponent,
    GmCheckboxComponent,
    GmChipComponent,
    GmDatepickerComponent,
    GmInputComponent,
    GmMultiselectComponent,
    GmPaginationComponent,
    GmRadioComponent,
    GmSelectComponent,
    GmSpinnerComponent,
    GmTabComponent,
    GmTabLabelDirective,
    GmTableCellDirective,
    GmTableComponent,
    GmTableEmptyDirective,
    GmTabsComponent,
    GmTextareaComponent,
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
    { id: 'datepicker', label: 'Datepicker' },
    { id: 'card', label: 'Card' },
    { id: 'badge', label: 'Badge, chip, spinner' },
    { id: 'tooltip', label: 'Tooltip' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'accordion', label: 'Accordion' },
    { id: 'pagination', label: 'Pagination' },
    { id: 'table', label: 'Table' },
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
}
