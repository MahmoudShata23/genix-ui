import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GmDatepickerComponent } from '../datepicker/datepicker.component';
import { GmInputComponent } from '../input/input.component';
import { GmMultiselectComponent } from '../multiselect/multiselect.component';
import { GmSelectComponent } from '../select/select.component';
import type { GmTableFilterOption, GmTableFilterType } from './table-filter.types';

/**
 * Renders the control for one column's filter and reports its value. It owns no
 * filter state and knows nothing about operators — `gm-table` holds both.
 *
 * Every control is an existing library component; nothing is re-implemented
 * here.
 */
@Component({
  selector: 'gm-table-filter-cell',
  standalone: true,
  imports: [
    FormsModule,
    GmInputComponent,
    GmSelectComponent,
    GmMultiselectComponent,
    GmDatepickerComponent,
  ],
  templateUrl: './table-filter-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-table-filter-cell' },
})
export class GmTableFilterCellComponent {
  readonly type = input<GmTableFilterType>('text');

  readonly value = input<unknown>(null);

  readonly options = input<readonly GmTableFilterOption[]>([]);

  readonly placeholder = input<string>('');

  readonly ariaLabel = input<string>('');

  readonly disabled = input(false);

  /** Raw control value; `gm-table` decides what it means. */
  readonly valueChange = output<unknown>();

  /** Yes/No for a boolean column, so it reuses the select rather than a toggle. */
  protected readonly booleanOptions: readonly GmTableFilterOption[] = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  protected asText(value: unknown): string | number | null {
    return value === null || value === undefined
      ? null
      : (value as string | number);
  }

  protected asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  protected asDate(value: unknown): Date | null {
    return value instanceof Date ? value : null;
  }

  /** An empty string means "no filter", not "filter for empty". */
  protected emit(value: unknown): void {
    this.valueChange.emit(value === '' ? null : value);
  }
}
