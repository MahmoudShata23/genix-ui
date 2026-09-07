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
  const filterInput = () =>
    fixture.nativeElement.querySelector(
      '.gm-table__filter-row input',
    ) as HTMLInputElement;
  const type = (text: string) => {
    const input = filterInput();
    input.value = text;
    input.dispatchEvent(new Event('input'));
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

  it('emits one query per filter change, after the debounce', fakeAsync(() => {
    host.filterDebounce.set(300);
    fixture.detectChanges();

    type('ca');
    type('car');

    // Still inside the debounce window: nothing fetched yet.
    expect(host.queries.length).toBe(0);

    tick(300);
    fixture.detectChanges();
    expect(host.queries.length).toBe(1);
    expect(host.queries[0].filters).toEqual([
      { field: 'name', operator: 'contains', value: 'car' },
    ]);
  }));

  // ── combined state ─────────────────────────────────────────────────────

  it('carries sort and filters together once both are set', fakeAsync(() => {
    sortButtons()[1].click();
    fixture.detectChanges();
    type('ca');
    tick(0);
    fixture.detectChanges();

    expect(lastQuery().sort).toEqual({ field: 'status', direction: 'asc' });
    expect(lastQuery().filters.length).toBe(1);
  }));

  it('keeps sort and filters when paging', fakeAsync(() => {
    sortButtons()[0].click();
    type('ca');
    tick(0);

    table.setPage({ page: 2, pageSize: 10, first: 10 });

    expect(lastQuery().page).toBe(2);
    expect(lastQuery().sort).toEqual({ field: 'name', direction: 'asc' });
    expect(lastQuery().filters.length).toBe(1);
  }));

  // ── page reset ─────────────────────────────────────────────────────────

  it('returns to the first page when the result set changes', fakeAsync(() => {
    table.setPage({ page: 5, pageSize: 10, first: 40 });

    sortButtons()[0].click();
    fixture.detectChanges();
    expect(lastQuery().page).toBe(1);

    type('ca');
    tick(0);
    // A filter applied on page 5 of the old results would show an empty page.
    expect(lastQuery().page).toBe(1);
    expect(lastQuery().first).toBe(0);
  }));

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

  it('resetQueryState clears sort and filters without emitting', fakeAsync(() => {
    sortButtons()[0].click();
    type('ca');
    tick(0);
    const before = host.queries.length;

    table.resetQueryState();
    fixture.detectChanges();
    // NgModel pushes the new value to the control on a microtask, so the
    // cleared input is only observable after a flush plus a second render.
    tick();
    fixture.detectChanges();

    // The caller issues its own request; emitting here would fetch twice.
    expect(host.queries.length).toBe(before);
    expect(filterInput().value).toBe('');
    expect(sortButtons()[0].closest('th')!.getAttribute('aria-sort')).toBe('none');
  }));

  it('resetQueryState drops a filter still inside its debounce window', fakeAsync(() => {
    host.filterDebounce.set(500);
    fixture.detectChanges();
    type('ca');

    table.resetQueryState();
    tick(500);
    fixture.detectChanges();
    // A stale keystroke must not re-apply a filter after the reset.
    expect(host.queries.length).toBe(0);
  }));

  it('clearAllFilters is callable from outside and emits one query', fakeAsync(() => {
    type('ca');
    tick(0);
    const before = host.queries.length;

    table.clearAllFilters();
    fixture.detectChanges();

    expect(host.queries.length).toBe(before + 1);
    expect(lastQuery().filters).toEqual([]);
  }));

  // ── rendering stays server-driven ──────────────────────────────────────

  it('renders rows untouched: no local sorting or filtering', fakeAsync(() => {
    const rowText = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('tbody .gm-table__row'),
      ).map((tr) => (tr as HTMLElement).textContent!.trim());

    // Alan would come first if the table sorted locally.
    sortButtons()[0].click();
    fixture.detectChanges();
    expect(rowText()[0]).toContain('Cara');

    type('zzz');
    tick(0);
    fixture.detectChanges();
    // Filtering locally would empty the table; the server owns that.
    expect(rowText().length).toBe(2);
  }));

  it('still emits the granular sort and filter events for existing consumers', fakeAsync(() => {
    sortButtons()[0].click();
    type('ca');
    tick(0);

    expect(host.sorts).toBe(1);
    expect(host.filterEvents).toBe(1);
  }));

  it('emits a snapshot: a later change does not mutate a past event', fakeAsync(() => {
    type('ca');
    tick(0);

    const firstFilters = host.queries[0].filters as readonly GmTableFilter[];
    table.clearAllFilters();
    fixture.detectChanges();

    expect(firstFilters.length).toBe(1);
  }));
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
