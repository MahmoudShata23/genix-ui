import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import type { GmTableColumn } from './table.types';
import type { GmTableQueryEvent } from './table-query.types';
import type { GmTableFilter } from './table-filter.types';

interface Row {
  id: number;
  name: string;
  status: string;
}

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [data]="rows()"
      [columns]="columns"
      rowKey="id"
      [serverSide]="true"
      [pageSize]="pageSize()"
      [filterDebounce]="filterDebounce()"
      (queryChange)="onQuery($event)"
      (sortChange)="sorts = sorts + 1"
      (filtersChange)="filterEvents = filterEvents + 1"
    />
  `,
})
class HostComponent {
  readonly rows = signal<Row[]>([
    { id: 1, name: 'Cara', status: 'open' },
    { id: 2, name: 'Alan', status: 'closed' },
  ]);
  readonly pageSize = signal(10);
  readonly filterDebounce = signal(0);

  queries: GmTableQueryEvent[] = [];
  sorts = 0;
  filterEvents = 0;

  onQuery(event: GmTableQueryEvent): void {
    this.queries.push(event);
  }

  readonly columns: GmTableColumn<Row>[] = [
    { field: 'name', header: 'Name', sortable: true, filterable: true },
    {
      field: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
    },
  ];
}

describe('gm-table server-side query', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let table: GmTableComponent<Row>;

  const sortButtons = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-table__sort'),
    ) as HTMLButtonElement[];
  /** The open filter panel. It is portalled into the overlay. */
  const panel = () =>
    document.querySelector('.gm-filter-menu') as HTMLElement | null;

  const openFilter = () => {
    (
      fixture.nativeElement.querySelector(
        '.gm-filter-trigger',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
  };

  const menuInput = () =>
    panel()!.querySelector('gm-table-filter-cell input') as HTMLInputElement;

  /** Filters the Name column end to end: open, type, Apply. */
  const type = (text: string) => {
    openFilter();
    const input = menuInput();
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (
      Array.from(panel()!.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Apply',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
  };

  const lastQuery = () => host.queries[host.queries.length - 1];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    table = fixture.debugElement.children[0].componentInstance;
  });

  afterEach(() => {
    // Filter panels live in the overlay container, outside the fixture, so
    // they have to be torn down explicitly or they leak into the next spec.
    fixture.destroy();
  });

  // ── no initial emission ────────────────────────────────────────────────

  it('emits nothing on init, so it cannot duplicate the first fetch', () => {
    expect(host.queries.length).toBe(0);
  });

  it('emits nothing when inputs change, only when the user acts', () => {
    host.rows.set([{ id: 3, name: 'Zoe', status: 'open' }]);
    host.pageSize.set(25);
    fixture.detectChanges();
    expect(host.queries.length).toBe(0);
  });

  // ── one event per action ───────────────────────────────────────────────

  it('emits exactly one query per sort click, with the full state', () => {
    sortButtons()[0].click();
    fixture.detectChanges();

    expect(host.queries.length).toBe(1);
    expect(host.queries[0]).toEqual({
      page: 1,
      pageSize: 10,
      first: 0,
      sort: { field: 'name', direction: 'asc' },
      filters: [],
    });
  });

  it('cycles asc, desc, unsorted, emitting one query each', () => {
    sortButtons()[0].click();
    fixture.detectChanges();
    sortButtons()[0].click();
    fixture.detectChanges();
    sortButtons()[0].click();
    fixture.detectChanges();

    expect(host.queries.length).toBe(3);
    expect(host.queries[1].sort).toEqual({ field: 'name', direction: 'desc' });
    // Unsorted omits the key rather than sending a null direction.
    expect('sort' in host.queries[2]).toBeFalse();
  });

  it('emits exactly one query per page change, carrying page and size', () => {
    table.setPage({ page: 3, pageSize: 20, first: 40 });
    expect(host.queries.length).toBe(1);
    expect(host.queries[0].page).toBe(3);
    expect(host.queries[0].pageSize).toBe(20);
    expect(host.queries[0].first).toBe(40);
  });

  it('emits one query per page-size change', () => {
    table.setPage({ page: 1, pageSize: 50, first: 0 });
    expect(host.queries.length).toBe(1);
    expect(host.queries[0].pageSize).toBe(50);
  });

  it('emits nothing while a rule is only being typed', () => {
    openFilter();
    const input = menuInput();
    input.value = 'ca';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // The menu's Apply is the commit point, so an unfinished rule fetches
    // nothing — which is what replaces the old typing debounce.
    expect(host.queries.length).toBe(0);
  });

  it('emits exactly one query per applied filter', () => {
    type('car');

    expect(host.queries.length).toBe(1);
    expect(host.queries[0].filters).toEqual([
      { field: 'name', operator: 'startsWith', value: 'car' },
    ]);
  });

  // ── combined state ─────────────────────────────────────────────────────

  it('carries sort and filters together once both are set', () => {
    sortButtons()[1].click();
    fixture.detectChanges();
    type('ca');

    expect(lastQuery().sort).toEqual({ field: 'status', direction: 'asc' });
    expect(lastQuery().filters.length).toBe(1);
  });

  it('keeps sort and filters when paging', () => {
    sortButtons()[0].click();
    fixture.detectChanges();
    type('ca');

    table.setPage({ page: 2, pageSize: 10, first: 10 });

    expect(lastQuery().page).toBe(2);
    expect(lastQuery().sort).toEqual({ field: 'name', direction: 'asc' });
    expect(lastQuery().filters.length).toBe(1);
  });

  // ── page reset ─────────────────────────────────────────────────────────

  it('returns to the first page when the result set changes', () => {
    table.setPage({ page: 5, pageSize: 10, first: 40 });

    sortButtons()[0].click();
    fixture.detectChanges();
    expect(lastQuery().page).toBe(1);

    type('ca');
    // A filter applied on page 5 of the old results would show an empty page.
    expect(lastQuery().page).toBe(1);
    expect(lastQuery().first).toBe(0);
  });

  it('reports the current page size when sorting after a size change', () => {
    host.pageSize.set(25);
    fixture.detectChanges();
    sortButtons()[0].click();
    expect(host.queries[0].pageSize).toBe(25);
    expect(host.queries[0].first).toBe(0);
  });

  it('never emits a page or size below one', () => {
    table.setPage({ page: 0, pageSize: 0, first: 0 });
    expect(host.queries[0].page).toBe(1);
    expect(host.queries[0].pageSize).toBe(1);
  });

  // ── external reset ─────────────────────────────────────────────────────

  it('resetQueryState clears sort and filters without emitting', async () => {
    sortButtons()[0].click();
    fixture.detectChanges();
    type('ca');
    const before = host.queries.length;

    table.resetQueryState();
    fixture.detectChanges();

    // The caller issues its own request; emitting here would fetch twice.
    expect(host.queries.length).toBe(before);
    expect(sortButtons()[0].closest('th')!.getAttribute('aria-sort')).toBe('none');

    // The panel re-seeds from the (now empty) filters each time it opens.
    openFilter();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(menuInput().value).toBe('');
  });

  it('resetQueryState drops a search still inside its debounce window', fakeAsync(() => {
    host.filterDebounce.set(500);
    fixture.detectChanges();
    table.setGlobalSearch('ca');

    table.resetQueryState();
    tick(500);
    fixture.detectChanges();
    // A stale keystroke must not re-apply a search after the reset.
    expect(host.queries.length).toBe(0);
  }));

  it('clearAllFilters is callable from outside and emits one query', () => {
    type('ca');
    const before = host.queries.length;

    table.clearAllFilters();
    fixture.detectChanges();

    expect(host.queries.length).toBe(before + 1);
    expect(lastQuery().filters).toEqual([]);
  });

  // ── rendering stays server-driven ──────────────────────────────────────

  it('renders rows untouched: no local sorting or filtering', () => {
    const rowText = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('tbody .gm-table__row'),
      ).map((tr) => (tr as HTMLElement).textContent!.trim());

    // Alan would come first if the table sorted locally.
    sortButtons()[0].click();
    fixture.detectChanges();
    expect(rowText()[0]).toContain('Cara');

    type('zzz');
    // Filtering locally would empty the table; the server owns that.
    expect(rowText().length).toBe(2);
  });

  it('still emits the granular sort and filter events for existing consumers', () => {
    sortButtons()[0].click();
    fixture.detectChanges();
    type('ca');

    expect(host.sorts).toBe(1);
    expect(host.filterEvents).toBe(1);
  });

  it('emits a snapshot: a later change does not mutate a past event', () => {
    type('ca');

    const firstFilters = host.queries[0].filters as readonly GmTableFilter[];
    table.clearAllFilters();
    fixture.detectChanges();

    expect(firstFilters.length).toBe(1);
  });
});

describe('gm-table without serverSide', () => {
  @Component({
    standalone: true,
    imports: [GmTableComponent],
    template: `
      <gm-table
        [data]="rows"
        [columns]="columns"
        sortMode="client"
        filterMode="client"
        [filterDebounce]="0"
        (queryChange)="queries = queries + 1"
      />
    `,
  })
  class ClientHost {
    readonly rows: Row[] = [
      { id: 1, name: 'Cara', status: 'open' },
      { id: 2, name: 'Alan', status: 'closed' },
    ];
    queries = 0;
    readonly columns: GmTableColumn<Row>[] = [
      { field: 'name', header: 'Name', sortable: true, filterable: true },
    ];
  }

  it('sorts locally and emits no query event', async () => {
    await TestBed.configureTestingModule({
      imports: [ClientHost],
    }).compileComponents();
    const fixture = TestBed.createComponent(ClientHost);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('.gm-table__sort') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.queries).toBe(0);
    const first = fixture.nativeElement.querySelector(
      'tbody .gm-table__row',
    ) as HTMLElement;
    expect(first.textContent).toContain('Alan');
  });
});
