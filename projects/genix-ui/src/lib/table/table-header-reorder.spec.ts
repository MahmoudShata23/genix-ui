import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import {
  GmTableCellDirective,
  GmTableHeaderDirective,
} from './table-templates';
import type { GmColumnReorderEvent, GmTableColumn } from './table.types';

interface Row {
  id: number;
  name: string;
  email: string;
  phone: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Cara', email: 'c@x.com', phone: '111' },
  { id: 2, name: 'Alan', email: 'a@x.com', phone: '222' },
];

// ── multi-row / grouped header ─────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableHeaderDirective, GmTableCellDirective],
  template: `
    <gm-table #table [data]="rows" [columns]="columns" rowKey="id">
      <ng-template gmTableHeader>
        <tr>
          <th rowspan="2" scope="col">
            <button class="sort-name" type="button" (click)="table.sortBy('name')">
              Name {{ table.sortDirectionOf('name') }}
            </button>
          </th>
          <th colspan="2" scope="colgroup">Contact</th>
        </tr>
        <tr>
          <th scope="col">Email</th>
          <th scope="col">Phone</th>
        </tr>
      </ng-template>

      <ng-template gmTableCell="name" let-row>
        <span class="name-cell">{{ row.name }}</span>
      </ng-template>
    </gm-table>
  `,
})
class GroupedHeaderHost {
  readonly rows = ROWS;
  readonly columns: GmTableColumn<Row>[] = [
    { field: 'name', header: 'Name', sortable: true, filterable: true },
    { field: 'email', header: 'Email' },
    { field: 'phone', header: 'Phone' },
  ];
}

describe('gm-table grouped header template', () => {
  let fixture: ComponentFixture<GroupedHeaderHost>;

  const headerRows = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('thead tr'),
    ) as HTMLElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupedHeaderHost],
    }).compileComponents();
    fixture = TestBed.createComponent(GroupedHeaderHost);
    fixture.detectChanges();
  });

  it('replaces the generated header rather than adding to it', () => {
    // The generated row would have rendered a sortable .gm-table__th per
    // column; only the filter row's cells should remain.
    expect(
      fixture.nativeElement.querySelectorAll(
        'thead .gm-table__th:not(.gm-table__th--filter)',
      ).length,
    ).toBe(0);
    expect(headerRows()[0].querySelectorAll('th').length).toBe(2);
  });

  it('renders native rowspan and colspan', () => {
    const first = headerRows()[0].querySelectorAll('th');
    expect(first[0].getAttribute('rowspan')).toBe('2');
    expect(first[1].getAttribute('colspan')).toBe('2');
  });

  it('renders the second header row', () => {
    const second = headerRows()[1];
    expect(
      Array.from(second.querySelectorAll('th')).map((th) => th.textContent!.trim()),
    ).toEqual(['Email', 'Phone']);
  });

  it('keeps scope attributes the template declared', () => {
    const first = headerRows()[0].querySelectorAll('th');
    expect(first[0].getAttribute('scope')).toBe('col');
    expect(first[1].getAttribute('scope')).toBe('colgroup');
  });

  it('still renders the generated filter row, so filtering keeps working', () => {
    const filterRow = fixture.nativeElement.querySelector('.gm-table__filter-row');
    expect(filterRow).toBeTruthy();
    expect(filterRow.querySelector('gm-table-filter-cell')).toBeTruthy();
  });

  it('sorts from a control inside the custom header', () => {
    const button = fixture.nativeElement.querySelector(
      '.sort-name',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(button.textContent).toContain('asc');
    // Client mode, so the rows actually re-order.
    const names = Array.from(
      fixture.nativeElement.querySelectorAll('.name-cell'),
    ).map((el) => (el as HTMLElement).textContent);
    expect(names[0]).toBe('Alan');
  });

  it('keeps custom cell templates working under a custom header', () => {
    expect(fixture.nativeElement.querySelectorAll('.name-cell').length).toBe(2);
  });
});

// ── column reorder ─────────────────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableCellDirective],
  template: `
    <gm-table
      [data]="rows"
      [columns]="columns()"
      rowKey="id"
      [reorderableColumns]="enabled()"
      (columnReorder)="onReorder($event)"
    >
      <ng-template gmTableCell="phone" let-row>
        <span class="phone-cell">{{ row.phone }}</span>
      </ng-template>
    </gm-table>
  `,
})
class ReorderHost {
  readonly rows = ROWS;
  readonly enabled = signal(true);
  events: GmColumnReorderEvent<Row>[] = [];

  readonly columns = signal<GmTableColumn<Row>[]>([
    { field: 'name', header: 'Name', sortable: true },
    { field: 'email', header: 'Email' },
    { field: 'phone', header: 'Phone' },
    { field: 'actions', header: 'Actions', reorderable: false },
  ]);

  onReorder(event: GmColumnReorderEvent<Row>): void {
    this.events.push(event);
    this.columns.set(event.columns);
  }
}

describe('gm-table column reorder', () => {
  let fixture: ComponentFixture<ReorderHost>;
  let host: ReorderHost;
  let table: GmTableComponent<Row>;

  const handles = () =>
    fixture.nativeElement.querySelectorAll('.gm-table__drag-handle');
  const headerText = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('thead tr:first-child .gm-table__th'),
    ).map((th) => (th as HTMLElement).textContent!.trim());
  /** CDK indices are positions among draggable cells only. */
  const drop = (previousIndex: number, currentIndex: number) => {
    (table as unknown as {
      onColumnDrop: (e: { previousIndex: number; currentIndex: number }) => void;
    }).onColumnDrop({ previousIndex, currentIndex });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReorderHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ReorderHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    table = fixture.debugElement.children[0].componentInstance;
  });

  it('renders a grip only for reorderable columns', () => {
    // Three draggable columns; `actions` opted out.
    expect(handles().length).toBe(3);
  });

  it('renders no grip when reordering is off', () => {
    host.enabled.set(false);
    fixture.detectChanges();
    expect(handles().length).toBe(0);
  });

  it('emits the new order with indices into the columns array', () => {
    drop(0, 2);

    expect(host.events.length).toBe(1);
    expect(host.events[0].previousIndex).toBe(0);
    expect(host.events[0].currentIndex).toBe(2);
    expect(host.events[0].columns.map((c) => c.field)).toEqual([
      'email',
      'phone',
      'name',
      'actions',
    ]);
  });

  it('renders the new order once the consumer applies it', () => {
    drop(0, 1);
    expect(headerText()).toEqual(['Email', 'Name', 'Phone', 'Actions']);
  });

  it('does not mutate the array the consumer passed in', () => {
    const original = host.columns();
    const snapshot = original.map((c) => c.field);
    drop(0, 2);
    expect(original.map((c) => c.field)).toEqual(snapshot);
    expect(host.events[0].columns).not.toBe(original);
  });

  it('keeps a cell template with its column after a reorder', () => {
    drop(2, 0);
    // `phone` moved to the front; its template must travel with the field.
    expect(headerText()[0]).toBe('Phone');
    const firstCell = fixture.nativeElement.querySelector(
      'tbody tr:first-child td:first-child',
    ) as HTMLElement;
    expect(firstCell.querySelector('.phone-cell')).toBeTruthy();
  });

  it('loses no columns and creates no duplicates', () => {
    drop(1, 2);
    const fields = host.columns().map((c) => c.field);
    expect(fields.length).toBe(4);
    expect(new Set(fields).size).toBe(4);
  });

  it('ignores a drop that would not move anything', () => {
    drop(1, 1);
    expect(host.events.length).toBe(0);
  });

  it('does not emit on a header sort click', () => {
    (
      fixture.nativeElement.querySelector('.gm-table__sort') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(host.events.length).toBe(0);
  });
});

// ── reorder with frozen bands ──────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [data]="rows"
      [columns]="columns()"
      rowKey="id"
      [reorderableColumns]="true"
      (columnReorder)="events.push($event)"
    />
  `,
})
class FrozenReorderHost {
  readonly rows = ROWS;
  events: GmColumnReorderEvent<Row>[] = [];

  readonly columns = signal<GmTableColumn<Row>[]>([
    { field: 'id', header: 'ID', width: '5rem', frozen: true },
    { field: 'name', header: 'Name', width: '8rem', frozen: true },
    { field: 'email', header: 'Email' },
    { field: 'phone', header: 'Phone' },
    { field: 'actions', header: 'Actions', width: '6rem', frozen: true, frozenPosition: 'end' },
  ]);
}

describe('gm-table column reorder across frozen bands', () => {
  let fixture: ComponentFixture<FrozenReorderHost>;
  let host: FrozenReorderHost;
  let table: GmTableComponent<Row>;

  const drop = (previousIndex: number, currentIndex: number) => {
    (table as unknown as {
      onColumnDrop: (e: { previousIndex: number; currentIndex: number }) => void;
    }).onColumnDrop({ previousIndex, currentIndex });
    fixture.detectChanges();
  };
  const predicate = () =>
    (table as unknown as {
      sameBand: (i: number, d: { data: GmTableColumn<Row> }) => boolean;
    }).sameBand;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrozenReorderHost],
    }).compileComponents();
    fixture = TestBed.createComponent(FrozenReorderHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    table = fixture.debugElement.children[0].componentInstance;
  });

  it('reorders within the frozen-start band', () => {
    drop(0, 1);
    expect(host.events.length).toBe(1);
    expect(host.events[0].columns.map((c) => c.field)).toEqual([
      'name',
      'id',
      'email',
      'phone',
      'actions',
    ]);
  });

  it('reorders within the unfrozen band', () => {
    drop(2, 3);
    expect(host.events[0].columns.map((c) => c.field)).toEqual([
      'id',
      'name',
      'phone',
      'email',
      'actions',
    ]);
  });

  it('refuses to move a frozen-start column into the unfrozen band', () => {
    drop(0, 3);
    expect(host.events.length).toBe(0);
  });

  it('refuses to move an unfrozen column into the frozen-end band', () => {
    drop(2, 4);
    expect(host.events.length).toBe(0);
  });

  it('blocks the drop preview across bands while dragging', () => {
    const columns = host.columns();
    // Dragging the frozen `id` over the unfrozen `email` slot.
    expect(predicate()(2, { data: columns[0] })).toBeFalse();
    // ...but over its own band's sibling it is allowed.
    expect(predicate()(1, { data: columns[0] })).toBeTrue();
  });
});
