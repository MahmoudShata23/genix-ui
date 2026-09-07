import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import { GmTableFilterDirective } from './table-templates';
import type { GmTableColumn } from './table.types';
import type {
  GmTableFilter,
  GmTableFilterMode,
  GmTableFiltersChangeEvent,
} from './table-filter.types';

interface Row {
  id: number;
  name: string;
  status: string;
  active: boolean;
  joined: Date;
}

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableFilterDirective],
  template: `
    <gm-table
      [data]="rows()"
      [columns]="columns"
      rowKey="id"
      [filterMode]="mode()"
      [filters]="filters()"
      [filterDebounce]="debounce()"
      (filtersChange)="onFilters($event)"
    />
  `,
})
class HostComponent {
  readonly rows = signal<Row[]>([
    { id: 1, name: 'Cara', status: 'open', active: true, joined: new Date(2026, 0, 5) },
    { id: 2, name: 'Alan', status: 'closed', active: false, joined: new Date(2026, 1, 9) },
    { id: 3, name: 'Bea', status: 'open', active: true, joined: new Date(2026, 2, 1) },
  ]);
  readonly mode = signal<GmTableFilterMode>('client');
  readonly debounce = signal(0);
  readonly filters = signal<GmTableFilter[]>([]);
  readonly events: GmTableFiltersChangeEvent[] = [];

  onFilters(event: GmTableFiltersChangeEvent) {
    this.events.push(event);
    // Behave like a real consumer: adopt the emitted state.
    this.filters.set(event.filters);
  }

  readonly columns: GmTableColumn<Row>[] = [
    { field: 'name', header: 'Name', filterable: true, filterType: 'text' },
    {
      field: 'status',
      header: 'Status',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    { field: 'active', header: 'Active', filterable: true, filterType: 'boolean' },
    { field: 'joined', header: 'Joined', filterable: true, filterType: 'date' },
    { field: 'actions', header: 'Actions' },
  ];
}

describe('gm-table filtering', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const q = (sel: string) => fixture.nativeElement.querySelector(sel);
  const names = () =>
    Array.from(fixture.nativeElement.querySelectorAll('tbody tr')).map((r) =>
      (r as HTMLElement).querySelectorAll('td')[0].textContent!.trim(),
    );
  const textInput = () =>
    fixture.nativeElement.querySelector(
      '.gm-table__filter-row gm-input input',
    ) as HTMLInputElement;
  const filterCells = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-table__th--filter'),
    ) as HTMLElement[];

  const type = (text: string) => {
    textInput().value = text;
    textInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const pickSelect = (cellIndex: number, label: string) => {
    (
      filterCells()[cellIndex].querySelector(
        '.gm-dropdown__trigger',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const option = Array.from(
      document.querySelectorAll('.cdk-overlay-container [role="option"]'),
    ).find((o) => o.textContent?.trim() === label) as HTMLElement;
    option.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── filter row ────────────────────────────────────────────────────────

  it('renders a filter row only for filterable columns', () => {
    expect(q('.gm-table__filter-row')).toBeTruthy();
    // 5 columns, but only 4 are filterable; the actions cell stays empty.
    expect(filterCells().length).toBe(5);
    expect(filterCells()[4].querySelector('gm-table-filter-cell')).toBeNull();
  });

  it('reuses the library form controls, not new ones', () => {
    expect(filterCells()[0].querySelector('gm-input')).toBeTruthy();
    expect(filterCells()[1].querySelector('gm-select')).toBeTruthy();
    expect(filterCells()[2].querySelector('gm-select')).toBeTruthy();
    expect(filterCells()[3].querySelector('gm-datepicker')).toBeTruthy();
  });

  it('labels each filter control', () => {
    expect(textInput().getAttribute('aria-label')).toBe('Filter by Name');
  });

  // ── text filter ───────────────────────────────────────────────────────

  it('filters text with contains, case-insensitively', () => {
    type('a');
    expect(host.filters()).toEqual([
      { field: 'name', operator: 'contains', value: 'a' },
    ]);
    expect(names()).toEqual(['Cara', 'Alan', 'Bea']);

    type('ca');
    expect(names()).toEqual(['Cara']);
  });

  it('treats an emptied text box as no filter at all', () => {
    type('ca');
    expect(host.filters().length).toBe(1);
    type('');
    expect(host.filters()).toEqual([]);
    expect(names().length).toBe(3);
  });

  // ── select / boolean / date ───────────────────────────────────────────

  it('filters a select column with equals', () => {
    pickSelect(1, 'Open');
    expect(host.filters()).toEqual([
      { field: 'status', operator: 'equals', value: 'open' },
    ]);
    expect(names()).toEqual(['Cara', 'Bea']);
  });

  it('filters a boolean column', () => {
    pickSelect(2, 'No');
    expect(host.filters()).toEqual([
      { field: 'active', operator: 'equals', value: false },
    ]);
    expect(names()).toEqual(['Alan']);
  });

  it('filters a date column on the calendar day', () => {
    host.filters.set([
      { field: 'joined', operator: 'equals', value: new Date(2026, 1, 9) },
    ]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);
  });

  it('combines filters with AND', () => {
    pickSelect(1, 'Open');
    type('be');
    expect(host.filters().length).toBe(2);
    expect(names()).toEqual(['Bea']);
  });

  // ── operators ─────────────────────────────────────────────────────────

  it('honours an explicit operator on the column', () => {
    host.filters.set([{ field: 'name', operator: 'startsWith', value: 'a' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);

    host.filters.set([{ field: 'name', operator: 'endsWith', value: 'a' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Cara', 'Bea']);

    host.filters.set([{ field: 'name', operator: 'notEquals', value: 'Bea' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Cara', 'Alan']);
  });

  it('supports in as a set membership test', () => {
    host.filters.set([
      { field: 'status', operator: 'in', value: ['closed'] },
    ]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);
  });

  it('supports the comparison operators', () => {
    host.filters.set([{ field: 'id', operator: 'gte', value: 2 }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan', 'Bea']);

    host.filters.set([{ field: 'id', operator: 'lt', value: 2 }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Cara']);
  });

  // ── clearing ──────────────────────────────────────────────────────────

  it('clears one filter by emptying its control', () => {
    pickSelect(1, 'Open');
    type('be');
    expect(host.filters().length).toBe(2);

    type('');
    expect(host.filters().map((f) => f.field)).toEqual(['status']);
  });

  it('clears all filters from the clear button, emitting an empty state', () => {
    type('ca');
    pickSelect(1, 'Open');
    const clear = q('.gm-table__clear-filters') as HTMLButtonElement;
    expect(clear).toBeTruthy();

    clear.click();
    fixture.detectChanges();
    expect(host.filters()).toEqual([]);
    expect(host.events.at(-1)).toEqual({ filters: [] });
    expect(names().length).toBe(3);
  });

  it('offers no clear button while nothing is filtered', () => {
    expect(q('.gm-table__clear-filters')).toBeNull();
  });

  // ── external state ────────────────────────────────────────────────────

  it('applies filters supplied from outside without user interaction', () => {
    host.filters.set([{ field: 'status', operator: 'equals', value: 'closed' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);
    // Seeded state must not fire the change event.
    expect(host.events.length).toBe(0);
  });

  it('reflects external filter state back into the controls', async () => {
    host.filters.set([{ field: 'name', operator: 'contains', value: 'seed' }]);
    fixture.detectChanges();
    // ngModel writes the value asynchronously, so settle before asserting.
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textInput().value).toBe('seed');
  });

  // ── server mode ───────────────────────────────────────────────────────

  it('does not filter locally in server mode, but still emits', () => {
    host.mode.set('server');
    fixture.detectChanges();
    type('ca');

    expect(host.events.at(-1)).toEqual({
      filters: [{ field: 'name', operator: 'contains', value: 'ca' }],
    });
    // Rows are the server's job.
    expect(names().length).toBe(3);
  });

  // ── debounce ──────────────────────────────────────────────────────────

  it('debounces typed filters and applies only the final value', fakeAsync(() => {
    host.debounce.set(300);
    fixture.detectChanges();

    type('c');
    type('ca');
    type('car');
    expect(host.events.length).toBe(0);

    tick(300);
    fixture.detectChanges();
    expect(host.events.length).toBe(1);
    expect(host.filters()).toEqual([
      { field: 'name', operator: 'contains', value: 'car' },
    ]);
  }));

  it('applies discrete pickers immediately, without debounce', () => {
    host.debounce.set(300);
    fixture.detectChanges();
    pickSelect(1, 'Open');
    expect(host.filters().length).toBe(1);
  });

  it('drops a pending keystroke when all filters are cleared', fakeAsync(() => {
    host.debounce.set(300);
    fixture.detectChanges();
    pickSelect(1, 'Open');
    type('car');

    (q('.gm-table__clear-filters') as HTMLButtonElement).click();
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();

    // The in-flight keystroke must not resurrect a filter.
    expect(host.filters()).toEqual([]);
  }));
});

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableFilterDirective],
  template: `
    <gm-table [data]="[]" [columns]="columns">
      <ng-template gmTableFilter="status" let-value>
        <span class="custom-filter">custom:{{ value }}</span>
      </ng-template>
    </gm-table>
  `,
})
class CustomFilterHostComponent {
  readonly columns: GmTableColumn<{ status: string }>[] = [
    { field: 'status', header: 'Status', filterable: true, filterType: 'text' },
  ];
}

describe('gm-table custom filter template', () => {
  it('replaces the built-in control with the projected template', () => {
    TestBed.configureTestingModule({ imports: [CustomFilterHostComponent] });
    const fixture = TestBed.createComponent(CustomFilterHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.custom-filter')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.gm-table__th--filter gm-input'),
    ).toBeNull();
  });
});
