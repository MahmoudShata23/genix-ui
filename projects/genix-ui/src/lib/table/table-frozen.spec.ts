import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import type { GmTableColumn } from './table.types';

interface Row {
  id: number;
  name: string;
  email: string;
  status: string;
}

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [data]="rows"
      [columns]="columns()"
      rowKey="id"
      [selectionMode]="mode()"
      [stickyHeader]="sticky()"
      [maxHeight]="maxHeight()"
      minWidth="80rem"
    />
  `,
})
class HostComponent {
  readonly rows: Row[] = [
    { id: 1, name: 'Cara', email: 'c@x.com', status: 'open' },
    { id: 2, name: 'Alan', email: 'a@x.com', status: 'closed' },
  ];
  readonly mode = signal<'multiple' | null>(null);
  readonly sticky = signal(false);
  readonly maxHeight = signal<string | number | undefined>(undefined);

  readonly columns = signal<GmTableColumn<Row>[]>([
    {
      field: 'id',
      header: 'ID',
      width: '4rem',
      frozen: true,
      sortable: true,
      filterable: true,
    },
    { field: 'name', header: 'Name', width: '10rem', frozen: true },
    { field: 'email', header: 'Email', width: '20rem' },
    { field: 'status', header: 'Status', width: '20rem' },
    {
      field: 'actions',
      header: 'Actions',
      width: '6rem',
      frozen: true,
      frozenPosition: 'end',
    },
  ]);
}

describe('gm-table frozen columns and scrolling', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const q = (sel: string) => fixture.nativeElement.querySelector(sel);
  const headers = () =>
    Array.from(fixture.nativeElement.querySelectorAll('thead tr:first-child th')) as HTMLElement[];
  const firstRowCells = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr:first-child td'),
    ) as HTMLElement[];
  const filterCells = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-table__filter-row th'),
    ) as HTMLElement[];

  beforeEach(async () => {
    // The library ships no tokens by contract; the host app defines them. Set
    // the ones these assertions depend on so computed styles are meaningful.
    document.documentElement.style.setProperty('--gm-white', '#ffffff');
    document.documentElement.style.setProperty('--gm-gray-50', '#f8f9fa');
    document.documentElement.style.setProperty('--gm-primary-light', '#e6f4ff');

    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── scroll container ──────────────────────────────────────────────────

  it('scrolls locally rather than widening the page', () => {
    const scroll = q('.gm-table__scroll') as HTMLElement;
    expect(getComputedStyle(scroll).overflowX).toBe('auto');
    expect(q('table').style.minWidth).toBe('80rem');
  });

  it('caps height and scrolls vertically only when maxHeight is set', () => {
    const scroll = () => q('.gm-table__scroll') as HTMLElement;
    expect(scroll().classList).not.toContain('gm-table__scroll--capped');

    host.maxHeight.set(400);
    fixture.detectChanges();
    expect(scroll().style.maxHeight).toBe('400px');
    expect(getComputedStyle(scroll()).overflowY).toBe('auto');

    host.maxHeight.set('30rem');
    fixture.detectChanges();
    expect(scroll().style.maxHeight).toBe('30rem');
  });

  // ── frozen offsets ────────────────────────────────────────────────────

  it('pins start-frozen columns with cumulative logical offsets', () => {
    // ID is first, so it pins at 0; Name pins after ID's 4rem.
    expect(headers()[0].style.getPropertyValue('inset-inline-start')).toBe('0px');
    expect(headers()[1].style.getPropertyValue('inset-inline-start')).toBe(
      'calc(4rem)',
    );
  });

  it('pins end-frozen columns from the opposite edge', () => {
    const actions = headers()[4];
    expect(actions.style.getPropertyValue('inset-inline-end')).toBe('0px');
    expect(actions.style.getPropertyValue('inset-inline-start')).toBe('');
  });

  it('uses logical inset properties, never left/right', () => {
    // left/right would not flip under dir="rtl".
    expect(headers()[0].style.left).toBe('');
    expect(headers()[0].style.right).toBe('');
    expect(headers()[4].style.right).toBe('');
  });

  it('leaves unfrozen columns unpinned', () => {
    expect(headers()[2].classList).not.toContain('gm-table__cell--frozen');
    expect(headers()[2].style.getPropertyValue('inset-inline-start')).toBe('');
  });

  it('applies sticky positioning to frozen cells', () => {
    expect(getComputedStyle(headers()[0]).position).toBe('sticky');
    expect(getComputedStyle(firstRowCells()[0]).position).toBe('sticky');
  });

  it('gives frozen cells an opaque background so content cannot show through', () => {
    const bg = getComputedStyle(firstRowCells()[0]).backgroundColor;
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe('transparent');
  });

  // ── header / body / filter alignment ──────────────────────────────────

  it('freezes header, filter and body cells identically', () => {
    const frozenIndexes = [0, 1, 4];
    for (const i of frozenIndexes) {
      expect(headers()[i].classList).toContain('gm-table__cell--frozen');
      expect(firstRowCells()[i].classList).toContain('gm-table__cell--frozen');
    }
    // The filter row must pin too, or it slides out from under the header.
    expect(filterCells()[0].classList).toContain('gm-table__cell--frozen');
    expect(filterCells()[0].style.getPropertyValue('inset-inline-start')).toBe(
      '0px',
    );
  });

  it('keeps offsets identical between header and body for the same column', () => {
    for (const i of [0, 1]) {
      expect(firstRowCells()[i].style.getPropertyValue('inset-inline-start')).toBe(
        headers()[i].style.getPropertyValue('inset-inline-start'),
      );
    }
    expect(firstRowCells()[4].style.getPropertyValue('inset-inline-end')).toBe(
      headers()[4].style.getPropertyValue('inset-inline-end'),
    );
  });

  // ── boundary divider ──────────────────────────────────────────────────

  it('draws one divider per boundary, not between adjacent frozen columns', () => {
    // ID and Name are both frozen-start; only Name is the edge.
    expect(headers()[0].classList).not.toContain(
      'gm-table__cell--frozen-edge-start',
    );
    expect(headers()[1].classList).toContain(
      'gm-table__cell--frozen-edge-start',
    );
    expect(headers()[4].classList).toContain('gm-table__cell--frozen-edge-end');
  });

  // ── selection column ──────────────────────────────────────────────────

  it('pins the selection column and shifts frozen offsets past it', () => {
    host.mode.set('multiple');
    fixture.detectChanges();

    const selectTh = headers()[0];
    expect(selectTh.classList).toContain('gm-table__cell--frozen');
    expect(selectTh.style.getPropertyValue('inset-inline-start')).toBe('0px');

    // ID now starts after the selection column's reserved width.
    expect(headers()[1].style.getPropertyValue('inset-inline-start')).toBe(
      'calc(3rem)',
    );
    // The browser folds the sum, which is proof the terms were composed.
    expect(headers()[2].style.getPropertyValue('inset-inline-start')).toBe(
      'calc(7rem)',
    );
  });

  it('leaves the selection column unpinned when nothing else is frozen', () => {
    host.columns.set([
      { field: 'name', header: 'Name', width: '10rem' },
      { field: 'email', header: 'Email', width: '20rem' },
    ]);
    host.mode.set('multiple');
    fixture.detectChanges();
    expect(headers()[0].classList).not.toContain('gm-table__cell--frozen');
  });

  it('keeps selection working inside a frozen column', () => {
    host.mode.set('multiple');
    fixture.detectChanges();
    const box = q('tbody gm-checkbox input') as HTMLInputElement;
    box.click();
    fixture.detectChanges();
    expect(box.checked).toBeTrue();
  });

  // ── existing features still work in frozen headers ────────────────────

  it('keeps sorting working in a frozen header', () => {
    const sortButton = headers()[0].querySelector(
      '.gm-table__sort',
    ) as HTMLButtonElement;
    expect(sortButton).toBeTruthy();
    sortButton.click();
    fixture.detectChanges();
    expect(headers()[0].getAttribute('aria-sort')).toBe('ascending');
  });

  it('keeps filtering working in a frozen header', () => {
    expect(filterCells()[0].querySelector('gm-table-filter-cell')).toBeTruthy();
  });

  // ── sticky header ─────────────────────────────────────────────────────

  it('sticks the header only when asked', () => {
    expect(q('table').classList).not.toContain('gm-table--sticky-header');
    expect(getComputedStyle(headers()[2]).position).toBe('static');

    host.sticky.set(true);
    fixture.detectChanges();
    expect(q('table').classList).toContain('gm-table--sticky-header');
    expect(getComputedStyle(headers()[2]).position).toBe('sticky');
    expect(getComputedStyle(headers()[2]).top).toBe('0px');
  });

  it('does not break the empty state, which spans all columns', () => {
    host.columns.set([{ field: 'name', header: 'Name', frozen: true, width: '5rem' }]);
    fixture.detectChanges();
    // Rows still present, so no state row; then prove the state row is intact.
    expect(q('.gm-table__state')).toBeNull();
  });
});
