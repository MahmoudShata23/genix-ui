import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import { GmTableFilterDirective } from './table-templates';
import type { GmTableColumn } from './table.types';
import type {
  GmTableFilter,
  GmTableFilterLabels,
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
  imports: [GmTableComponent],
  template: `
    <gm-table
      [data]="rows()"
      [columns]="columns"
      rowKey="id"
      [filterMode]="mode()"
      [filters]="filters()"
      [filterLabels]="labels()"
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
  readonly filters = signal<GmTableFilter[]>([]);
  readonly labels = signal<Partial<GmTableFilterLabels>>({});
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

  const names = () =>
    Array.from(fixture.nativeElement.querySelectorAll('tbody tr')).map((r) =>
      (r as HTMLElement).querySelectorAll('td')[0].textContent!.trim(),
    );

  const funnels = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-filter-trigger'),
    ) as HTMLButtonElement[];

  /** The open panel. It is portalled into the overlay, not into the fixture. */
  const menu = () =>
    document.querySelector('.gm-filter-menu') as HTMLElement | null;

  const openMenu = (index: number) => {
    funnels()[index].click();
    fixture.detectChanges();
  };

  /** Footer buttons are `gm-button`s, so they are matched by their label. */
  const menuButton = (label: string) =>
    Array.from(menu()!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    ) as HTMLButtonElement;

  const apply = () => {
    menuButton('Apply').click();
    fixture.detectChanges();
  };

  const dropdowns = () =>
    Array.from(
      menu()!.querySelectorAll('.gm-dropdown__trigger'),
    ) as HTMLButtonElement[];

  /** Opens a dropdown inside the panel and clicks one of its options. */
  const pick = (trigger: HTMLElement, label: string) => {
    trigger.click();
    fixture.detectChanges();
    const option = Array.from(
      document.querySelectorAll('.cdk-overlay-container [role="option"]'),
    ).find((o) => o.textContent?.trim() === label) as HTMLElement;
    // pointerdown first: that is what the CDK's outside-click dispatcher
    // watches, and reaching the option through it is the whole point of the
    // nested-overlay guard.
    option.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    option.click();
    fixture.detectChanges();
  };

  const typeValue = (text: string, ruleIndex = 0) => {
    const input = menu()!.querySelectorAll('gm-table-filter-cell input')[
      ruleIndex
    ] as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
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

  afterEach(() => {
    // Panels live in the overlay container, outside the fixture, so they have
    // to be torn down explicitly or they leak into the next spec.
    fixture.destroy();
  });

  // ── funnel ────────────────────────────────────────────────────────────

  it('puts a funnel only on filterable columns', () => {
    expect(funnels().length).toBe(4);
    const headers = fixture.nativeElement.querySelectorAll('thead th');
    expect(headers[4].querySelector('.gm-filter-trigger')).toBeNull();
  });

  it('names the funnel after its column', () => {
    expect(funnels()[0].getAttribute('aria-label')).toBe('Filter: Name');
  });

  it('marks the funnel active only while its column is filtered', () => {
    expect(funnels()[0].classList).not.toContain('gm-filter-trigger--active');

    host.filters.set([{ field: 'name', operator: 'startsWith', value: 'a' }]);
    fixture.detectChanges();
    expect(funnels()[0].classList).toContain('gm-filter-trigger--active');
  });

  it('opens and closes the panel from the funnel', () => {
    expect(menu()).toBeNull();
    openMenu(0);
    expect(menu()).toBeTruthy();
    expect(funnels()[0].getAttribute('aria-expanded')).toBe('true');

    funnels()[0].click();
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  // ── panel contents ────────────────────────────────────────────────────

  it('gives a text column match logic, a match mode, a value and Add Rule', () => {
    openMenu(0);
    // Two dropdowns: the match logic, then the rule's match mode.
    expect(dropdowns().length).toBe(2);
    expect(menu()!.querySelector('gm-table-filter-cell gm-input')).toBeTruthy();
    expect(menu()!.querySelector('.gm-filter-menu__add')).toBeTruthy();
    expect(menuButton('Clear')).toBeTruthy();
    expect(menuButton('Apply')).toBeTruthy();
  });

  it('offers no match mode or Add Rule for a discrete picker', () => {
    openMenu(1);
    // The value's own select is the only dropdown; no logic, no match mode.
    expect(menu()!.querySelectorAll('.gm-filter-menu__logic').length).toBe(0);
    expect(menu()!.querySelector('.gm-filter-menu__add')).toBeNull();
    expect(menu()!.querySelector('gm-table-filter-cell gm-select')).toBeTruthy();
  });

  it('reuses the library form controls per filter type', () => {
    openMenu(2);
    expect(menu()!.querySelector('gm-table-filter-cell gm-select')).toBeTruthy();
    menuButton('Clear').click();
    fixture.detectChanges();

    openMenu(3);
    expect(
      menu()!.querySelector('gm-table-filter-cell gm-datepicker'),
    ).toBeTruthy();
  });

  // ── applying ──────────────────────────────────────────────────────────

  it('applies nothing until Apply is pressed', () => {
    openMenu(0);
    typeValue('ca');
    expect(host.events.length).toBe(0);
    expect(names().length).toBe(3);

    apply();
    expect(host.events.length).toBe(1);
    expect(names()).toEqual(['Cara']);
  });

  it('defaults a text column to startsWith', () => {
    openMenu(0);
    typeValue('a');
    apply();
    expect(host.filters()).toEqual([
      { field: 'name', operator: 'startsWith', value: 'a' },
    ]);
    expect(names()).toEqual(['Alan']);
  });

  it('applies the chosen match mode', () => {
    openMenu(0);
    pick(dropdowns()[1], 'Contains');
    typeValue('a');
    apply();

    expect(host.filters()).toEqual([
      { field: 'name', operator: 'contains', value: 'a' },
    ]);
    expect(names()).toEqual(['Cara', 'Alan', 'Bea']);
  });

  it('keeps the panel open while its own dropdown is used', () => {
    openMenu(0);
    pick(dropdowns()[1], 'Ends with');
    // Picking an option happens in a *second* overlay; the panel must not read
    // that as a click away from itself.
    expect(menu()).toBeTruthy();
  });

  it('filters a discrete picker with equals', () => {
    openMenu(1);
    pick(dropdowns()[0], 'Open');
    apply();

    expect(host.filters()).toEqual([
      { field: 'status', operator: 'equals', value: 'open' },
    ]);
    expect(names()).toEqual(['Cara', 'Bea']);
  });

  it('drops a rule the user left blank', () => {
    openMenu(0);
    apply();
    expect(host.filters()).toEqual([]);
    expect(host.events.length).toBe(0);
  });

  it('treats an unchanged re-apply as a no-op', () => {
    openMenu(0);
    typeValue('ca');
    apply();
    expect(host.events.length).toBe(1);

    openMenu(0);
    apply();
    expect(host.events.length).toBe(1);
  });

  // ── multiple rules ────────────────────────────────────────────────────

  it('adds a second rule and ANDs the two by default', () => {
    openMenu(0);
    // Starts with "a" alone would match Alan; ends with "n" alone would too,
    // so the AND is only proven by a value that fails one of them — Cara and
    // Bea each fail exactly one.
    typeValue('a');
    (menu()!.querySelector('.gm-filter-menu__add') as HTMLButtonElement).click();
    fixture.detectChanges();

    pick(dropdowns()[2], 'Ends with');
    typeValue('n', 1);
    apply();

    expect(host.filters()).toEqual([
      { field: 'name', operator: 'startsWith', value: 'a', logic: 'and' },
      { field: 'name', operator: 'endsWith', value: 'n', logic: 'and' },
    ]);
    expect(names()).toEqual(['Alan']);
  });

  it('narrows rather than widens as a second AND rule is added', () => {
    openMenu(0);
    typeValue('a');
    (menu()!.querySelector('.gm-filter-menu__add') as HTMLButtonElement).click();
    fixture.detectChanges();
    pick(dropdowns()[2], 'Ends with');
    typeValue('a', 1);
    apply();

    // startsWith 'a' -> Alan; endsWith 'a' -> Cara, Bea. Nothing satisfies both.
    expect(names()).toEqual(['No records found']);
  });

  it('ORs a column’s rules under Match Any', () => {
    openMenu(0);
    pick(dropdowns()[0], 'Match Any');
    typeValue('a');
    (menu()!.querySelector('.gm-filter-menu__add') as HTMLButtonElement).click();
    fixture.detectChanges();
    typeValue('b', 1);
    apply();

    expect(host.filters().map((f) => f.logic)).toEqual(['or', 'or']);
    expect(names()).toEqual(['Alan', 'Bea']);
  });

  it('caps the rules at filterMaxConstraints', () => {
    openMenu(0);
    const add = () =>
      menu()!.querySelector('.gm-filter-menu__add') as HTMLButtonElement | null;
    add()!.click();
    fixture.detectChanges();
    // Two rules is the default ceiling, so Add Rule is gone.
    expect(add()).toBeNull();
    expect(menu()!.querySelectorAll('.gm-filter-menu__rule').length).toBe(2);
  });

  it('removes a rule', () => {
    openMenu(0);
    (menu()!.querySelector('.gm-filter-menu__add') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(menu()!.querySelectorAll('.gm-filter-menu__remove').length).toBe(2);

    (menu()!.querySelector('.gm-filter-menu__remove') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(menu()!.querySelectorAll('.gm-filter-menu__rule').length).toBe(1);
    // A lone rule combines with nothing, so it loses its remove button.
    expect(menu()!.querySelector('.gm-filter-menu__remove')).toBeNull();
  });

  // ── cross-column ──────────────────────────────────────────────────────

  it('combines different columns with AND', () => {
    openMenu(1);
    pick(dropdowns()[0], 'Open');
    apply();

    openMenu(0);
    pick(dropdowns()[1], 'Contains');
    typeValue('be');
    apply();

    expect(host.filters().length).toBe(2);
    expect(names()).toEqual(['Bea']);
  });

  // ── clearing ──────────────────────────────────────────────────────────

  it('clears one column from its own Clear button', () => {
    openMenu(0);
    typeValue('ca');
    apply();
    expect(host.filters().length).toBe(1);

    openMenu(0);
    menuButton('Clear').click();
    fixture.detectChanges();

    expect(host.filters()).toEqual([]);
    expect(names().length).toBe(3);
  });

  it('leaves other columns alone when one is cleared', () => {
    openMenu(1);
    pick(dropdowns()[0], 'Open');
    apply();
    openMenu(0);
    typeValue('be');
    apply();

    openMenu(0);
    menuButton('Clear').click();
    fixture.detectChanges();

    expect(host.filters().map((f) => f.field)).toEqual(['status']);
  });

  it('clears every column from the public clearAllFilters()', () => {
    openMenu(0);
    typeValue('ca');
    apply();
    openMenu(1);
    pick(dropdowns()[0], 'Open');
    apply();

    fixture.debugElement
      .query((n) => n.name === 'gm-table')
      .componentInstance.clearAllFilters();
    fixture.detectChanges();

    expect(host.filters()).toEqual([]);
    expect(host.events.at(-1)).toEqual({ filters: [] });
    expect(names().length).toBe(3);
  });

  it('clearing an unfiltered column emits nothing', () => {
    openMenu(0);
    menuButton('Clear').click();
    fixture.detectChanges();
    expect(host.events.length).toBe(0);
  });

  // ── seeding from outside ──────────────────────────────────────────────

  it('applies filters supplied from outside without user interaction', () => {
    host.filters.set([{ field: 'status', operator: 'equals', value: 'closed' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);
    // Seeded state must not fire the change event.
    expect(host.events.length).toBe(0);
  });

  it('seeds the panel from the applied filters each time it opens', async () => {
    host.filters.set([{ field: 'name', operator: 'endsWith', value: 'seed' }]);
    fixture.detectChanges();

    openMenu(0);
    // ngModel writes asynchronously, so settle before reading the control.
    await fixture.whenStable();
    fixture.detectChanges();

    const input = menu()!.querySelector(
      'gm-table-filter-cell input',
    ) as HTMLInputElement;
    expect(input.value).toBe('seed');
    expect(dropdowns()[1].textContent).toContain('Ends with');
  });

  it('an abandoned edit leaves the applied filters untouched', () => {
    openMenu(0);
    typeValue('ca');
    apply();

    openMenu(0);
    typeValue('zzz');
    funnels()[0].click(); // dismiss without applying
    fixture.detectChanges();

    expect(host.filters()).toEqual([
      { field: 'name', operator: 'startsWith', value: 'ca' },
    ]);
    expect(names()).toEqual(['Cara']);
  });

  // ── labels ────────────────────────────────────────────────────────────

  it('translates the whole panel from filterLabels', async () => {
    host.labels.set({
      matchAll: 'Tout',
      apply: 'Appliquer',
      addRule: 'Ajouter',
      startsWith: 'Commence par',
    });
    fixture.detectChanges();

    openMenu(0);
    expect(menuButton('Appliquer')).toBeTruthy();
    expect(menu()!.querySelector('.gm-filter-menu__add')!.textContent).toContain(
      'Ajouter',
    );

    // The dropdowns render their label once ngModel has written the value in,
    // which happens on a microtask.
    await fixture.whenStable();
    fixture.detectChanges();
    expect(dropdowns()[0].textContent).toContain('Tout');
    expect(dropdowns()[1].textContent).toContain('Commence par');
  });

  // ── matching engine ───────────────────────────────────────────────────

  it('honours every operator', () => {
    host.filters.set([{ field: 'name', operator: 'startsWith', value: 'a' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);

    host.filters.set([{ field: 'name', operator: 'endsWith', value: 'a' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Cara', 'Bea']);

    host.filters.set([{ field: 'name', operator: 'notEquals', value: 'Bea' }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Cara', 'Alan']);

    host.filters.set([{ field: 'status', operator: 'in', value: ['closed'] }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);

    host.filters.set([{ field: 'id', operator: 'gte', value: 2 }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan', 'Bea']);

    host.filters.set([{ field: 'id', operator: 'lt', value: 2 }]);
    fixture.detectChanges();
    expect(names()).toEqual(['Cara']);
  });

  it('matches a date on the calendar day', () => {
    host.filters.set([
      { field: 'joined', operator: 'equals', value: new Date(2026, 1, 9) },
    ]);
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);
  });

  // ── server mode ───────────────────────────────────────────────────────

  it('does not filter locally in server mode, but still emits', () => {
    host.mode.set('server');
    fixture.detectChanges();

    openMenu(0);
    typeValue('ca');
    apply();

    expect(host.events.at(-1)).toEqual({
      filters: [{ field: 'name', operator: 'startsWith', value: 'ca' }],
    });
    // Rows are the server's job.
    expect(names().length).toBe(3);
  });
});

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableFilterDirective],
  template: `
    <gm-table [data]="[]" [columns]="columns">
      <ng-template gmTableFilter="status" let-value let-apply="apply">
        <button class="custom-filter" (click)="apply('done')">
          custom:{{ value }}
        </button>
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
  let fixture: ComponentFixture<CustomFilterHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CustomFilterHostComponent] });
    fixture = TestBed.createComponent(CustomFilterHostComponent);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('.gm-filter-trigger') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('replaces the rule editor inside the panel, keeping the footer', () => {
    const panel = document.querySelector('.gm-filter-menu')!;
    expect(panel.querySelector('.custom-filter')).toBeTruthy();
    expect(panel.querySelector('gm-table-filter-cell')).toBeNull();
    expect(panel.querySelector('.gm-filter-menu__footer')).toBeTruthy();
  });

  it('applies through the callback it is handed', () => {
    const table = fixture.debugElement.query((n) => n.name === 'gm-table')
      .componentInstance as GmTableComponent<{ status: string }>;

    (document.querySelector('.custom-filter') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(table.hasActiveFilters()).toBe(true);
    expect(document.querySelector('.gm-filter-menu')).toBeNull();
  });
});
