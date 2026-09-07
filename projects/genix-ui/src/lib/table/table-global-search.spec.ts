import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import type { GmTableColumn } from './table.types';
import type { GmTableQueryEvent } from './table-query.types';

interface Row {
  id: number;
  name: string;
  code: string;
  status: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Cara', code: 'AB-1', status: 'open' },
  { id: 2, name: 'Alan', code: 'ZZ-9', status: 'closed' },
  { id: 3, name: 'Bruno', code: 'AB-2', status: 'open' },
];

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [data]="rows"
      [columns]="columns"
      rowKey="id"
      filterMode="client"
      [globalSearch]="search()"
      [globalSearchFields]="fields()"
    />
  `,
})
class ClientHost {
  readonly rows = ROWS;
  readonly search = signal('');
  readonly fields = signal<string[]>(['name', 'code']);

  readonly columns: GmTableColumn<Row>[] = [
    { field: 'name', header: 'Name' },
    { field: 'code', header: 'Code' },
    { field: 'status', header: 'Status' },
  ];
}

describe('gm-table global search (client)', () => {
  let fixture: ComponentFixture<ClientHost>;
  let host: ClientHost;

  const names = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tbody .gm-table__row td:first-child'),
    ).map((td) => (td as HTMLElement).textContent!.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ClientHost] }).compileComponents();
    fixture = TestBed.createComponent(ClientHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows every row when the term is empty', () => {
    expect(names()).toEqual(['Cara', 'Alan', 'Bruno']);
  });

  it('matches across the configured fields', () => {
    host.search.set('ab-');
    fixture.detectChanges();
    // Matched on `code`, not `name`.
    expect(names()).toEqual(['Cara', 'Bruno']);
  });

  it('is case-insensitive by default', () => {
    host.search.set('CARA');
    fixture.detectChanges();
    expect(names()).toEqual(['Cara']);
  });

  it('ignores surrounding whitespace', () => {
    host.search.set('  bruno  ');
    fixture.detectChanges();
    expect(names()).toEqual(['Bruno']);
  });

  it('restores all rows when the term is cleared', () => {
    host.search.set('cara');
    fixture.detectChanges();
    expect(names().length).toBe(1);

    host.search.set('');
    fixture.detectChanges();
    expect(names()).toEqual(['Cara', 'Alan', 'Bruno']);
  });

  it('never mutates the bound array', () => {
    const snapshot = [...host.rows];
    host.search.set('cara');
    fixture.detectChanges();
    expect(host.rows).toEqual(snapshot);
    expect(host.rows.length).toBe(3);
  });

  it('only searches the listed fields', () => {
    // `status` is a column but not a search field.
    host.search.set('closed');
    fixture.detectChanges();
    expect(names()).toEqual([]);
  });

  it('falls back to every column when no fields are given', () => {
    host.fields.set([]);
    host.search.set('closed');
    fixture.detectChanges();
    expect(names()).toEqual(['Alan']);
  });

  it('shows the empty state when nothing matches', () => {
    host.search.set('nothing-matches-this');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gm-table__state')).toBeTruthy();
  });
});

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [data]="rows()"
      [columns]="columns"
      rowKey="id"
      [serverSide]="true"
      [filterDebounce]="debounce()"
      (queryChange)="queries.push($event)"
    />
  `,
})
class ServerHost {
  readonly rows = signal<Row[]>(ROWS);
  readonly debounce = signal(300);
  queries: GmTableQueryEvent[] = [];

  readonly columns: GmTableColumn<Row>[] = [
    { field: 'name', header: 'Name', sortable: true, filterable: true },
    { field: 'code', header: 'Code' },
  ];
}

describe('gm-table global search (server)', () => {
  let fixture: ComponentFixture<ServerHost>;
  let host: ServerHost;
  let table: GmTableComponent<Row>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ServerHost] }).compileComponents();
    fixture = TestBed.createComponent(ServerHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    table = fixture.debugElement.children[0].componentInstance;
  });

  it('debounces, then emits exactly one query for a burst of keystrokes', fakeAsync(() => {
    table.setGlobalSearch('c');
    table.setGlobalSearch('ca');
    table.setGlobalSearch('car');
    expect(host.queries.length).toBe(0);

    tick(300);
    expect(host.queries.length).toBe(1);
    expect(host.queries[0].globalSearch).toBe('car');
  }));

  it('carries the term in the same query event, not a second one', fakeAsync(() => {
    table.setGlobalSearch('car');
    tick(300);

    expect(host.queries.length).toBe(1);
    expect(host.queries[0].page).toBe(1);
    expect(host.queries[0].filters).toEqual([]);
  }));

  it('returns to the first page when the term changes', fakeAsync(() => {
    table.setPage({ page: 4, pageSize: 10, first: 30 });
    table.setGlobalSearch('car');
    tick(300);

    const last = host.queries[host.queries.length - 1];
    expect(last.page).toBe(1);
    expect(last.first).toBe(0);
  }));

  it('omits the key entirely once the search is cleared', fakeAsync(() => {
    table.setGlobalSearch('car');
    tick(300);
    table.setGlobalSearch('');
    tick(300);

    const last = host.queries[host.queries.length - 1];
    expect('globalSearch' in last).toBeFalse();
  }));

  it('keeps the term across a later sort and page change', fakeAsync(() => {
    table.setGlobalSearch('car');
    tick(300);

    (
      fixture.nativeElement.querySelector('.gm-table__sort') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(host.queries[host.queries.length - 1].globalSearch).toBe('car');

    table.setPage({ page: 2, pageSize: 10, first: 10 });
    expect(host.queries[host.queries.length - 1].globalSearch).toBe('car');
  }));

  it('does not filter locally: the server owns the result set', fakeAsync(() => {
    table.setGlobalSearch('nothing-matches-this');
    tick(300);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('tbody .gm-table__row').length,
    ).toBe(3);
  }));

  it('applies immediately when the debounce is zero', () => {
    host.debounce.set(0);
    fixture.detectChanges();

    table.setGlobalSearch('car');
    expect(host.queries.length).toBe(1);
  });

  it('resetQueryState clears the term without emitting', fakeAsync(() => {
    table.setGlobalSearch('car');
    tick(300);
    const before = host.queries.length;

    table.resetQueryState();
    fixture.detectChanges();

    expect(host.queries.length).toBe(before);
    table.setPage({ page: 1, pageSize: 10, first: 0 });
    expect('globalSearch' in host.queries[host.queries.length - 1]).toBeFalse();
  }));

  it('drops a search still inside its debounce window on reset', fakeAsync(() => {
    table.setGlobalSearch('car');
    table.resetQueryState();
    tick(300);

    // A stale keystroke must not fetch after the reset.
    expect(host.queries.length).toBe(0);
  }));

  it('emits nothing when only the input changes', () => {
    host.rows.set(ROWS.slice(0, 1));
    fixture.detectChanges();
    expect(host.queries.length).toBe(0);
  });
});
