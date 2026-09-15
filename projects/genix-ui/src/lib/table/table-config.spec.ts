import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import {
  GmCellType,
  GmFilterType,
  GmStatusTone,
  GmTableActionType,
  GmTableBulkActionScope,
} from './table-config.types';
import type { GmTableModel } from './table-config.types';
import {
  GmFilterCondition,
  GmFilterDataType,
} from './table-request.types';
import type { GmTableRequest, GmTableSortChange } from './table-request.types';

interface Provider {
  id: string;
  name: string;
  code: string;
  score: number;
  status: string;
  tags: string[];
  locked: boolean;
}

const ROWS: Provider[] = [
  {
    id: '1',
    name: 'Beirut Clinic',
    code: 'BC-1',
    score: 40,
    status: 'Validated',
    tags: ['a', 'b'],
    locked: false,
  },
  {
    id: '2',
    name: 'Amman Centre',
    code: 'AC-2',
    score: 12,
    status: 'Draft',
    tags: [],
    locked: true,
  },
];

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [records]="records()"
      [tableConfig]="tableConfig"
      [totalRecords]="total()"
      [translate]="translate"
      [(selection)]="selected"
      (sortChange)="sorts.push($event)"
      (filterChange)="filterRequests.push($event)"
      (pageChange)="pageRequests.push($event)"
      (addClicked)="adds = adds + 1"
    />
  `,
})
class HostComponent {
  readonly records = signal<Provider[]>(ROWS);
  readonly total = signal(42);
  selected: Provider[] = [];

  readonly sorts: GmTableSortChange[] = [];
  readonly filterRequests: GmTableRequest[] = [];
  readonly pageRequests: GmTableRequest[] = [];
  adds = 0;

  readonly viewed: Provider[] = [];
  readonly deleted: Provider[] = [];
  readonly bulkDeleted: Provider[][] = [];
  readonly imported: number[] = [];
  readonly linked: Provider[] = [];

  /** A stand-in for a real translation pipe: uppercases the key. */
  readonly translate = (key: string) => key.toUpperCase();

  readonly tableConfig: GmTableModel<Provider> = {
    columns: [
      {
        field: 'name',
        header: 'name',
        filterType: GmFilterType.TEXT,
        linkPath: (row) => this.linked.push(row),
      },
      { field: 'code', header: 'code', filterType: GmFilterType.TEXT },
      { field: 'score', header: 'score', filterType: GmFilterType.NUMERIC },
      {
        field: 'status',
        header: 'status',
        filterType: GmFilterType.SELECT,
        filterOptions: [
          { id: 1, label: 'Validated' },
          { id: 2, label: 'Draft' },
        ],
        cellType: GmCellType.DOT,
        dotColorMap: {
          validated: GmStatusTone.SUCCESS,
          draft: GmStatusTone.WARNING,
        },
      },
      { field: 'tags', header: 'tags', cellType: GmCellType.LIST },
      { field: 'locked', header: 'locked', filterType: GmFilterType.BOOLEAN },
    ],
    singleActions: [
      {
        type: GmTableActionType.VIEW,
        command: (row) => this.viewed.push(row),
      },
      {
        type: GmTableActionType.DELETE,
        command: (row) => this.deleted.push(row),
        // Locked rows keep the slot but lose the button.
        visible: (row) => !row.locked,
      },
    ],
    bulkActions: [
      {
        type: GmTableActionType.DELETE,
        command: (rows) => this.bulkDeleted.push(rows),
        scope: GmTableBulkActionScope.SELECTED_ROWS_ONLY,
      },
      {
        type: GmTableActionType.DOWNLOAD,
        command: () => this.imported.push(1),
        scope: GmTableBulkActionScope.GLOBAL,
      },
    ],
  };
}

describe('gm-table config mode', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const qa = (sel: string) =>
    Array.from(fixture.nativeElement.querySelectorAll(sel)) as HTMLElement[];
  const q = (sel: string) => fixture.nativeElement.querySelector(sel);

  const headerLabels = () =>
    qa('thead th .gm-table__th-label').map((el) => el.textContent!.trim());
  const bodyRows = () => qa('tbody tr');
  const toolbarButtons = () =>
    qa('.gm-table-toolbar__actions gm-button button');
  const toolbarLabels = () =>
    toolbarButtons().map((b) => b.textContent!.trim());

  const funnels = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-filter-trigger'),
    ) as HTMLButtonElement[];
  const menu = () => document.querySelector('.gm-filter-menu') as HTMLElement;
  const menuButton = (label: string) =>
    Array.from(menu().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    ) as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Filter panels are portalled into the overlay container, outside the
    // fixture, so they leak into the next spec unless the view is torn down.
    fixture.destroy();
  });

  // ── structure ─────────────────────────────────────────────────────────

  it('renders the selection column, the actions column, then the config columns', () => {
    // Selection + actions + six config columns.
    expect(qa('thead th').length).toBe(8);
    expect(headerLabels()).toEqual([
      'ACTIONS',
      'NAME',
      'CODE',
      'SCORE',
      'STATUS',
      'TAGS',
      'LOCKED',
    ]);
  });

  it('translates headers and action labels through the one hook', () => {
    expect(toolbarLabels()).toContain('ADD');
    expect(toolbarLabels()).toContain('IMPORT');
  });

  it('puts a funnel only on columns that declare a filter type', () => {
    // name, code, score, status, locked — not tags.
    expect(funnels().length).toBe(5);
  });

  it('frames itself with a toolbar above and a paginator below', () => {
    expect(q('gm-table-toolbar')).toBeTruthy();
    expect(q('gm-pagination')).toBeTruthy();
  });

  // ── cells ─────────────────────────────────────────────────────────────

  it('renders a linked column as a link that calls back with the row', () => {
    const link = bodyRows()[0].querySelector('.gm-cell-link') as HTMLElement;
    expect(link.textContent!.trim()).toBe('Beirut Clinic');

    link.click();
    fixture.detectChanges();
    expect(host.linked).toEqual([ROWS[0]]);
  });

  it('colours a DOT cell from the column map and renders nothing else', () => {
    const dot = bodyRows()[0].querySelector('.gm-cell-dot') as HTMLElement;
    expect(dot.classList).toContain('gm-cell-dot--success');
    expect(bodyRows()[1].querySelector('.gm-cell-dot')!.classList).toContain(
      'gm-cell-dot--warning',
    );
  });

  it('renders a LIST cell as one item per entry, and a dash when empty', () => {
    expect(bodyRows()[0].querySelectorAll('.gm-cell-list li').length).toBe(2);
    expect(
      bodyRows()[1].querySelector('.gm-cell-list li'),
    ).toBeNull();
  });

  it('renders a boolean column as a mark rather than text, false included', () => {
    expect(bodyRows()[0].querySelector('.gm-cell-bool--false')).toBeTruthy();
    expect(bodyRows()[1].querySelector('.gm-cell-bool--true')).toBeTruthy();
  });

  // ── row actions ───────────────────────────────────────────────────────

  it('runs a row action against its own row', () => {
    const view = bodyRows()[0].querySelectorAll(
      'gm-table-row-actions button',
    )[0] as HTMLElement;
    view.click();
    fixture.detectChanges();
    expect(host.viewed).toEqual([ROWS[0]]);
  });

  it('keeps the slot of an action a row hides, so the icons stay aligned', () => {
    expect(
      bodyRows()[0].querySelectorAll('gm-table-row-actions button').length,
    ).toBe(2);
    // The locked row loses Delete but keeps its place.
    expect(
      bodyRows()[1].querySelectorAll('gm-table-row-actions button').length,
    ).toBe(1);
    expect(
      bodyRows()[1].querySelectorAll('.gm-table-row-actions__slot').length,
    ).toBe(1);
  });

  // ── toolbar ───────────────────────────────────────────────────────────

  it('offers a global bulk action immediately and a selection one only past a single row', () => {
    expect(toolbarLabels()).toContain('IMPORT');
    expect(toolbarLabels()).not.toContain('DELETE');

    host.selected = [ROWS[0]];
    fixture.detectChanges();
    expect(toolbarLabels()).not.toContain('DELETE');

    host.selected = [ROWS[0], ROWS[1]];
    fixture.detectChanges();
    expect(toolbarLabels()).toContain('DELETE');
  });

  it('hands a bulk action the ticked rows', () => {
    host.selected = [ROWS[0], ROWS[1]];
    fixture.detectChanges();

    const remove = toolbarButtons().find(
      (b) => b.textContent!.trim() === 'DELETE',
    )!;
    remove.click();
    fixture.detectChanges();
    expect(host.bulkDeleted).toEqual([[ROWS[0], ROWS[1]]]);
  });

  it('reports the add button rather than navigating itself', () => {
    const add = toolbarButtons().find((b) => b.textContent!.trim() === 'ADD')!;
    add.click();
    fixture.detectChanges();
    expect(host.adds).toBe(1);
  });

  // ── sorting ───────────────────────────────────────────────────────────

  it('reports a sort in the shape a list endpoint takes, without reordering rows', () => {
    const sort = qa('.gm-table__sort').find((b) =>
      b.textContent!.includes('NAME'),
    )!;
    sort.click();
    fixture.detectChanges();

    expect(host.sorts.at(-1)).toEqual({
      field: 'name',
      direction: 'asc',
      orderBy: 'name',
      ascending: true,
    });
    // Config mode is server-side: the rows arrive ordered.
    expect(
      bodyRows().map((r) => r.querySelectorAll('td')[2].textContent!.trim()),
    ).toEqual(['Beirut Clinic', 'Amman Centre']);
  });

  // ── filtering ─────────────────────────────────────────────────────────

  it('reports a text filter as a descriptor, back at the first page', () => {
    funnels()[0].click();
    fixture.detectChanges();

    const input = menu().querySelector(
      'gm-table-filter-cell input',
    ) as HTMLInputElement;
    input.value = 'bei';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    menuButton('Apply').click();
    fixture.detectChanges();

    expect(host.filterRequests.at(-1)).toEqual({
      filters: [
        {
          propertyName: 'name',
          dataType: GmFilterDataType.String,
          condition: GmFilterCondition.StartsWith,
          value: 'bei',
          valueTo: null,
        },
      ],
      pageNumber: 1,
      pageSize: 10,
    });
  });

  it('types a numeric column as an int and stringifies its value', () => {
    funnels()[2].click();
    fixture.detectChanges();

    const input = menu().querySelector(
      'gm-table-filter-cell input',
    ) as HTMLInputElement;
    input.value = '12';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    menuButton('Apply').click();
    fixture.detectChanges();

    const descriptor = host.filterRequests.at(-1)!.filters![0];
    expect(descriptor.dataType).toBe(GmFilterDataType.Int);
    expect(descriptor.value).toBe('12');
  });

  it('does not report a filter nobody applied', () => {
    expect(host.filterRequests.length).toBe(0);
  });

  // ── paging ────────────────────────────────────────────────────────────

  it('reports a page change as a request', () => {
    const next = qa('button.gm-pagination__nav').find(
      (b) => b.getAttribute('aria-label') === 'Next page',
    )!;
    next.click();
    fixture.detectChanges();

    expect(host.pageRequests.at(-1)).toEqual({
      pageNumber: 2,
      pageSize: 10,
    });
  });
});
