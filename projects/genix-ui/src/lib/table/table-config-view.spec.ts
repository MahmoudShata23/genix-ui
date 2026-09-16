import { Component, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import {
  GmFilterType,
  GmTableActionType,
  GmTableBulkActionScope,
} from './table-config.types';
import type { TableModel } from './table-config.types';

/**
 * The view options a config grid declares rather than binds: which rows may be
 * ticked, whether the chooser is offered, where the actions column pins, and
 * the per-column display keys (`align`, `truncateAt`, `toggleable`,
 * `exportable`, `frozenPosition`).
 *
 * `table-config.spec.ts` covers the data side — columns, actions, the request
 * events — so this file only asserts what a switch in the config changes.
 */
interface Row {
  id: number;
  name: string;
  code: string;
  score: number;
  notes: string;
  active: boolean;
}

const ROWS: Row[] = [
  {
    id: 1,
    name: 'Beirut Clinic',
    code: 'BC-1',
    score: 40,
    notes: 'A note longer than the column is willing to show at once.',
    active: true,
  },
  {
    id: 2,
    name: 'Amman Centre',
    code: 'AC-2',
    score: 12,
    notes: 'Short.',
    active: false,
  },
];

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [records]="rows"
      [tableConfig]="config()"
      [totalRecords]="2"
      [(selection)]="selected"
    />
  `,
})
class HostComponent {
  readonly rows = ROWS;
  selected: Row[] = [];

  readonly chooser = signal(true);
  readonly reorder = signal(true);
  readonly actionsEdge = signal<'start' | 'end'>('start');
  readonly lockInactive = signal(true);

  readonly config = computed<TableModel<Row>>(() => ({
    columns: [
      {
        field: 'name',
        header: 'name',
        filterType: GmFilterType.TEXT,
        align: 'start',
        // Never offered in the chooser: the grid is unreadable without it.
        toggleable: false,
      },
      { field: 'code', header: 'code', filterType: GmFilterType.TEXT },
      { field: 'score', header: 'score', align: 'end' },
      {
        field: 'notes',
        header: 'notes',
        truncateAt: 10,
        exportable: false,
      },
    ],
    singleActions: [
      { type: GmTableActionType.EDIT, command: () => undefined },
    ],
    bulkActions: [
      {
        type: GmTableActionType.DELETE,
        command: () => undefined,
        scope: GmTableBulkActionScope.SELECTED_ROWS_ONLY,
      },
    ],
    rowSelectable: this.lockInactive()
      ? (row: Row) => row.active
      : undefined,
    showColumnChooser: this.chooser(),
    reorderableColumns: this.reorder(),
    actionsPosition: this.actionsEdge(),
  }));
}

describe('gm-table config view options', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let table: GmTableComponent<Row>;

  const qa = (sel: string) =>
    Array.from(fixture.nativeElement.querySelectorAll(sel)) as HTMLElement[];
  const q = (sel: string) => fixture.nativeElement.querySelector(sel);

  const headerLabels = () =>
    qa('thead th .gm-table__th-label').map((el) => el.textContent!.trim());
  const headerCells = () => qa('thead th');
  const rowCells = (row: number) =>
    Array.from(
      (qa('tbody tr')[row] as HTMLElement).querySelectorAll('td'),
    ) as HTMLElement[];
  const rowBoxes = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tbody input[type="checkbox"]'),
    ) as HTMLInputElement[];

  /** NgModel applies `disabled` on a microtask, so the input needs a flush. */
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** CDK indices are positions among draggable cells only. */
  const drop = (previousIndex: number, currentIndex: number) => {
    (
      table as unknown as {
        onColumnDrop: (e: {
          previousIndex: number;
          currentIndex: number;
        }) => void;
      }
    ).onColumnDrop({ previousIndex, currentIndex });
    fixture.detectChanges();
  };

  /** The chooser's own output, without driving the multiselect's overlay. */
  const chooseFields = (fields: string[]) => {
    (
      table as unknown as { onVisibleFieldsChange: (f: string[]) => void }
    ).onVisibleFieldsChange(fields);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    table = fixture.debugElement.children[0].componentInstance;
  });

  afterEach(() => fixture.destroy());

  // ── rows the user may tick ────────────────────────────────────────────

  it('locks the rows the config refuses, and frees them when it stops', async () => {
    await settle();
    expect(rowBoxes().map((box) => box.disabled)).toEqual([false, true]);
    expect(qa('tbody tr')[1].classList).toContain(
      'gm-table__row--select-disabled',
    );

    host.lockInactive.set(false);
    fixture.detectChanges();
    await settle();
    expect(rowBoxes().map((box) => box.disabled)).toEqual([false, false]);
  });

  // ── the column chooser ────────────────────────────────────────────────

  it('offers the chooser by default and drops it when the config says no', () => {
    expect(q('.gm-table-toolbar__chooser')).toBeTruthy();

    host.chooser.set(false);
    fixture.detectChanges();
    expect(q('.gm-table-toolbar__chooser')).toBeNull();
  });

  it('keeps a non-toggleable column when the chooser changes another', () => {
    // The chooser never offered `name`, so its value cannot mention it.
    chooseFields(['code']);
    expect(headerLabels()).toEqual(['actions', 'name', 'code']);
  });

  it('shows only the offered fields as ticked, so the count matches the list', () => {
    const fields = (table as unknown as { chooserFields: () => string[] })
      .chooserFields();
    expect(fields).toEqual(['code', 'score', 'notes']);
  });

  // ── where the actions column sits ─────────────────────────────────────

  it('pins the actions column to the edge the config names', () => {
    expect(headerLabels()[0]).toBe('actions');
    expect(headerCells()[1].classList).toContain(
      'gm-table__cell--frozen-start',
    );

    host.actionsEdge.set('end');
    fixture.detectChanges();

    expect(headerLabels().at(-1)).toBe('actions');
    expect(headerCells().at(-1)!.classList).toContain(
      'gm-table__cell--frozen-end',
    );
  });

  // ── dragging columns ──────────────────────────────────────────────────

  it('renders a grip per data column only while the config allows dragging', () => {
    // Four data columns; the actions column opted out.
    expect(qa('.gm-table__drag-handle').length).toBe(4);

    host.reorder.set(false);
    fixture.detectChanges();
    expect(qa('.gm-table__drag-handle').length).toBe(0);
  });

  it('applies a drop itself: the config object is never rewritten', () => {
    drop(0, 2);
    expect(headerLabels()).toEqual([
      'actions',
      'code',
      'score',
      'name',
      'notes',
    ]);
    // The config still declares its own order — the table holds the new one.
    expect(host.config().columns.map((column) => column.field)).toEqual([
      'name',
      'code',
      'score',
      'notes',
    ]);
  });

  it('keeps a hidden column in its place across a reorder', () => {
    chooseFields(['code', 'score']);
    expect(headerLabels()).toEqual(['actions', 'name', 'code', 'score']);

    // Moves `name` past the two visible columns; `notes` is hidden throughout.
    drop(0, 2);
    chooseFields(['code', 'score', 'notes']);

    expect(headerLabels()).toEqual([
      'actions',
      'code',
      'score',
      'name',
      'notes',
    ]);
  });

  // ── per-column display ────────────────────────────────────────────────

  it('aligns a cell from its column, defaulting the rest to centre', () => {
    // Selection, actions, name, code, score, notes. The selection cell sets
    // no alignment of its own.
    expect(rowCells(0).map((cell) => cell.style.textAlign)).toEqual([
      '',
      'center',
      'start',
      'center',
      'end',
      'center',
    ]);
  });

  it("truncates a cell at the column's own limit, not the table's", () => {
    const notes = rowCells(0).at(-1)!;
    const truncated = notes.querySelector('.gm-cell-truncated')!;
    expect(truncated.textContent!.trim()).toBe('A note lon…');

    // The second row is under the limit, so it renders whole.
    expect(rowCells(1).at(-1)!.querySelector('.gm-cell-truncated')).toBeNull();
  });

  // ── export ────────────────────────────────────────────────────────────

  it('leaves a non-exportable column out of the CSV', async () => {
    let captured: Blob | null = null;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob | MediaSource) => {
      captured = blob as Blob;
      return 'blob:stub';
    });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');

    table.exportCsv({ fileName: 'rows' });

    const text = await (captured as unknown as Blob).text();
    const lines = text.split('\r\n');
    // Actions has no field; notes opted out.
    expect(lines[0]).toBe('name,code,score');
    expect(lines[1]).toBe('Beirut Clinic,BC-1,40');
  });
});
