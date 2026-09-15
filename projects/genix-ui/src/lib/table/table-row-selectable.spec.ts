import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import type { GmTableColumn, GmTableSelectionMode } from './table.types';

interface Row {
  id: number;
  name: string;
  locked: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: 'Cara', locked: false },
  { id: 2, name: 'Alan', locked: true },
  { id: 3, name: 'Bea', locked: false },
];

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [data]="rows()"
      [columns]="columns"
      rowKey="id"
      [selectionMode]="mode()"
      [rowSelectable]="selectable()"
      [(selection)]="selection"
    />
  `,
})
class HostComponent {
  readonly rows = signal<Row[]>(ROWS);
  readonly mode = signal<GmTableSelectionMode>('multiple');
  readonly selection = signal<Row[]>([]);

  /** Locked rows cannot be picked — the config this spec is about. */
  readonly selectable = signal<((row: Row, index: number) => boolean) | undefined>(
    (row) => !row.locked,
  );

  readonly columns: GmTableColumn<Row>[] = [
    { field: 'name', header: 'Name' },
  ];
}

describe('gm-table row selection gating', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const rowBoxes = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tbody input[type="checkbox"]'),
    ) as HTMLInputElement[];

  const radios = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tbody input[type="radio"]'),
    ) as HTMLInputElement[];

  const headerBox = () =>
    fixture.nativeElement.querySelector(
      'thead input[type="checkbox"]',
    ) as HTMLInputElement;

  const selectedNames = () =>
    host
      .selection()
      .map((row) => row.name)
      .sort();

  const click = (input: HTMLInputElement) => {
    input.click();
    fixture.detectChanges();
  };

  /**
   * `[disabled]` binds to `NgModel` as well as to the component, and NgModel
   * applies both the disabled state and `writeValue` on a microtask — so
   * anything read off the native input needs a flush first. The component's own
   * inputs (`indeterminate`, the row class) are synchronous.
   */
  const settle = async () => {
    await fixture.whenStable();
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

  afterEach(() => fixture.destroy());

  // ── the control ───────────────────────────────────────────────────────

  it('disables the checkbox of a row the predicate rejects', () => {
    expect(rowBoxes().map((b) => b.disabled)).toEqual([false, true, false]);
  });

  it('marks the row so it can be styled', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows[1].classList).toContain('gm-table__row--select-disabled');
    expect(rows[0].classList).not.toContain('gm-table__row--select-disabled');
  });

  it('leaves every row selectable when no predicate is given', async () => {
    host.selectable.set(undefined);
    fixture.detectChanges();
    await settle();
    expect(rowBoxes().map((b) => b.disabled)).toEqual([false, false, false]);
  });

  it('passes the rendered index to the predicate', () => {
    const seen: number[] = [];
    host.selectable.set((_row, index) => {
      seen.push(index);
      return index !== 0;
    });
    fixture.detectChanges();

    expect(seen).toContain(0);
    expect(seen).toContain(2);
    expect(rowBoxes()[0].disabled).toBeTrue();
    expect(rowBoxes()[2].disabled).toBeFalse();
  });

  // ── selecting ─────────────────────────────────────────────────────────

  it('still selects a row the predicate allows', () => {
    click(rowBoxes()[0]);
    expect(selectedNames()).toEqual(['Cara']);
  });

  it('does not select a locked row when its control is activated', () => {
    // A disabled input fires nothing, but the guard is what makes that safe
    // rather than incidental.
    click(rowBoxes()[1]);
    expect(host.selection()).toEqual([]);
  });

  // ── select-all ────────────────────────────────────────────────────────

  it('select-all skips locked rows', () => {
    click(headerBox());
    expect(selectedNames()).toEqual(['Bea', 'Cara']);
  });

  it('reaches the checked state once every selectable row is picked', async () => {
    click(rowBoxes()[0]);
    await settle();
    expect(headerBox().checked).toBeFalse();
    expect(headerBox().indeterminate).toBeTrue();

    click(rowBoxes()[2]);
    await settle();
    // Alan is still unselected, but he is not selectable, so this is "all".
    expect(headerBox().checked).toBeTrue();
    expect(headerBox().indeterminate).toBeFalse();
  });

  it('deselect-all clears only the selectable rows', () => {
    click(headerBox());
    // Seed a locked row into the selection the way a server response would.
    host.selection.update((rows) => [...rows, ROWS[1]]);
    fixture.detectChanges();

    click(headerBox());
    // Cara and Bea are cleared; the locked row the user cannot touch stays.
    expect(selectedNames()).toEqual(['Alan']);
  });

  it('disables select-all when no row on the page is selectable', () => {
    host.selectable.set(() => false);
    fixture.detectChanges();

    expect(headerBox().disabled).toBeTrue();
    expect(headerBox().checked).toBeFalse();

    click(headerBox());
    expect(host.selection()).toEqual([]);
  });

  it('a locked row already selected does not make the header indeterminate', () => {
    host.selection.set([ROWS[1]]);
    fixture.detectChanges();
    // Nothing *selectable* is picked, so there is no partial state to show.
    expect(headerBox().indeterminate).toBeFalse();
  });

  // ── single selection ──────────────────────────────────────────────────

  it('disables the radio of a locked row in single mode', () => {
    host.mode.set('single');
    fixture.detectChanges();
    expect(radios().map((r) => r.disabled)).toEqual([false, true, false]);
  });

  it('still selects an allowed row in single mode', () => {
    host.mode.set('single');
    fixture.detectChanges();
    click(radios()[2]);
    expect(selectedNames()).toEqual(['Bea']);
  });

  // ── reacting to changes ───────────────────────────────────────────────

  it('re-evaluates when the predicate changes', async () => {
    expect(rowBoxes()[1].disabled).toBeTrue();

    host.selectable.set((row) => row.name !== 'Cara');
    fixture.detectChanges();
    await settle();

    expect(rowBoxes().map((b) => b.disabled)).toEqual([true, false, false]);
  });

  it('re-evaluates when the data changes', async () => {
    host.rows.set([{ id: 9, name: 'Zoe', locked: true }]);
    fixture.detectChanges();
    await settle();

    expect(rowBoxes()[0].disabled).toBeTrue();
    expect(headerBox().disabled).toBeTrue();
  });
});
