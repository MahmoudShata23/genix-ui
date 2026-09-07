import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import {
  GmTableCellDirective,
  GmTableEmptyDirective,
} from './table-templates';
import type { GmSortEvent, GmTableColumn } from './table.types';

interface User {
  id: number;
  name: string;
  age: number;
}

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableCellDirective, GmTableEmptyDirective],
  template: `
    <gm-table
      [data]="users()"
      [columns]="columns"
      [loading]="loading()"
      [selectionMode]="mode()"
      [(selection)]="selected"
      [sortMode]="sortMode()"
      rowKey="id"
      caption="Users"
      (sortChange)="sorts.push($event)"
    >
      <ng-template gmTableCell="actions" let-row let-i="index">
        <button class="edit" type="button">Edit {{ row.name }} #{{ i }}</button>
      </ng-template>
    </gm-table>
  `,
})
class HostComponent {
  readonly users = signal<User[]>([
    { id: 1, name: 'Cara', age: 41 },
    { id: 2, name: 'alan', age: 9 },
    { id: 3, name: 'Bea', age: 30 },
  ]);
  readonly loading = signal(false);
  readonly mode = signal<'single' | 'multiple' | null>(null);
  readonly sortMode = signal<'client' | 'server'>('client');
  selected: User[] = [];
  readonly sorts: GmSortEvent[] = [];

  readonly columns: GmTableColumn<User>[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'age', header: 'Age', sortable: true, align: 'end' },
    { field: 'actions', header: 'Actions' },
  ];
}

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableEmptyDirective],
  template: `
    <gm-table [data]="[]" [columns]="[]">
      <ng-template gmTableEmpty>
        <span class="custom-empty">Nothing here</span>
      </ng-template>
    </gm-table>
  `,
})
class EmptyTemplateHostComponent {}

describe('gm-table', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const q = (sel: string) => fixture.nativeElement.querySelector(sel);
  const qa = (sel: string) =>
    Array.from(fixture.nativeElement.querySelectorAll(sel)) as HTMLElement[];
  const headers = () => qa('th');
  const bodyRows = () => qa('tbody tr');
  const colText = (col: number) =>
    bodyRows().map((r) => r.querySelectorAll('td')[col].textContent!.trim());
  const sortButton = (label: string) =>
    qa('.gm-table__sort').find((b) => b.textContent!.includes(label))!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, EmptyTemplateHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── rendering ─────────────────────────────────────────────────────────

  it('renders semantic table markup', () => {
    expect(q('table')).toBeTruthy();
    expect(q('thead')).toBeTruthy();
    expect(q('tbody')).toBeTruthy();
    expect(q('caption').textContent).toContain('Users');
    expect(headers().length).toBe(3);
    expect(bodyRows().length).toBe(3);
  });

  it('renders cell text from the column field', () => {
    expect(colText(0)).toEqual(['Cara', 'alan', 'Bea']);
    expect(colText(1)).toEqual(['41', '9', '30']);
  });

  it('applies column alignment', () => {
    expect(bodyRows()[0].querySelectorAll('td')[1].style.textAlign).toBe('end');
  });

  it('does not make ordinary rows focusable', () => {
    expect(bodyRows().every((r) => r.getAttribute('tabindex') === null)).toBeTrue();
  });

  // ── custom cell templates ─────────────────────────────────────────────

  it('renders a custom cell template with row and index context', () => {
    const edits = qa('.edit');
    expect(edits.length).toBe(3);
    expect(edits[0].textContent).toContain('Edit Cara #0');
    expect(edits[2].textContent).toContain('Edit Bea #2');
  });

  it('leaves untemplated columns on default text rendering', () => {
    expect(bodyRows()[0].querySelectorAll('td')[0].querySelector('button')).toBeNull();
  });

  // ── sorting ───────────────────────────────────────────────────────────

  it('marks sortable headers with aria-sort and cycles asc → desc → none', () => {
    const nameHeader = headers()[0];
    expect(nameHeader.getAttribute('aria-sort')).toBe('none');

    sortButton('Name').click();
    fixture.detectChanges();
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');

    sortButton('Name').click();
    fixture.detectChanges();
    expect(nameHeader.getAttribute('aria-sort')).toBe('descending');

    sortButton('Name').click();
    fixture.detectChanges();
    expect(nameHeader.getAttribute('aria-sort')).toBe('none');
  });

  it('reports aria-sort="none" for non-sortable columns', () => {
    expect(headers()[2].getAttribute('aria-sort')).toBe('none');
    expect(sortButton('Actions')).toBeUndefined();
  });

  it('sorts client-side, case-insensitively, without mutating the input', () => {
    const original = host.users();
    sortButton('Name').click();
    fixture.detectChanges();
    expect(colText(0)).toEqual(['alan', 'Bea', 'Cara']);
    // The bound array is untouched.
    expect(original.map((u) => u.name)).toEqual(['Cara', 'alan', 'Bea']);
  });

  it('sorts numbers numerically, not as text', () => {
    sortButton('Age').click();
    fixture.detectChanges();
    expect(colText(1)).toEqual(['9', '30', '41']);
  });

  it('emits a typed sort event including the unsorted step', () => {
    sortButton('Name').click();
    sortButton('Name').click();
    sortButton('Name').click();
    fixture.detectChanges();
    expect(host.sorts).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'name', direction: 'desc' },
      { field: 'name', direction: null },
    ]);
  });

  it('leaves row order to the server in server mode', () => {
    host.sortMode.set('server');
    fixture.detectChanges();
    sortButton('Name').click();
    fixture.detectChanges();

    // Still source order; only the event fired.
    expect(colText(0)).toEqual(['Cara', 'alan', 'Bea']);
    expect(host.sorts.at(-1)).toEqual({ field: 'name', direction: 'asc' });
  });

  // ── selection ─────────────────────────────────────────────────────────

  it('renders no selection column when selection is off', () => {
    expect(q('tbody gm-checkbox')).toBeNull();
    expect(headers().length).toBe(3);
  });

  it('selects and deselects rows in multiple mode', () => {
    host.mode.set('multiple');
    fixture.detectChanges();
    expect(headers().length).toBe(4);

    const boxes = qa('tbody gm-checkbox input') as HTMLInputElement[];
    boxes[0].click();
    fixture.detectChanges();
    expect(host.selected.map((u) => u.id)).toEqual([1]);

    boxes[2].click();
    fixture.detectChanges();
    expect(host.selected.map((u) => u.id)).toEqual([1, 3]);

    boxes[0].click();
    fixture.detectChanges();
    expect(host.selected.map((u) => u.id)).toEqual([3]);
  });

  it('selects all and clears all from the header checkbox', () => {
    host.mode.set('multiple');
    fixture.detectChanges();
    const header = q('thead gm-checkbox input') as HTMLInputElement;

    header.click();
    fixture.detectChanges();
    expect(host.selected.map((u) => u.id)).toEqual([1, 2, 3]);

    header.click();
    fixture.detectChanges();
    expect(host.selected).toEqual([]);
  });

  it('shows the header checkbox as indeterminate on a partial selection', () => {
    host.mode.set('multiple');
    fixture.detectChanges();
    (qa('tbody gm-checkbox input')[0] as HTMLInputElement).click();
    fixture.detectChanges();
    expect((q('thead gm-checkbox input') as HTMLInputElement).indeterminate).toBeTrue();
  });

  it('keeps single mode exclusive using a radio group', () => {
    host.mode.set('single');
    fixture.detectChanges();
    const radios = qa('tbody gm-radio input') as HTMLInputElement[];
    expect(radios.length).toBe(3);
    expect(radios[0].type).toBe('radio');

    radios[0].click();
    fixture.detectChanges();
    expect(host.selected.map((u) => u.id)).toEqual([1]);

    radios[2].click();
    fixture.detectChanges();
    expect(host.selected.map((u) => u.id)).toEqual([3]);
  });

  it('labels every selection control', () => {
    host.mode.set('multiple');
    fixture.detectChanges();
    const labels = (qa('gm-checkbox input') as HTMLInputElement[]).map((i) =>
      i.getAttribute('aria-label'),
    );
    expect(labels[0]).toBe('Select all rows');
    expect(labels.slice(1)).toEqual(['Select row 1', 'Select row 2', 'Select row 3']);
  });

  it('matches selection by rowKey, surviving a re-fetch of equal rows', () => {
    host.mode.set('multiple');
    fixture.detectChanges();
    (qa('tbody gm-checkbox input')[0] as HTMLInputElement).click();
    fixture.detectChanges();

    // New objects, same ids — reference equality would lose the selection.
    host.users.set([
      { id: 1, name: 'Cara', age: 41 },
      { id: 2, name: 'alan', age: 9 },
      { id: 3, name: 'Bea', age: 30 },
    ]);
    fixture.detectChanges();
    expect(
      (qa('tbody gm-checkbox input')[0] as HTMLInputElement).checked,
    ).toBeTrue();
  });

  // ── loading / empty ───────────────────────────────────────────────────

  it('shows the spinner while loading and no empty state', () => {
    host.loading.set(true);
    fixture.detectChanges();
    expect(q('gm-spinner')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('No records found');
  });

  it('keeps the header visible while loading', () => {
    host.loading.set(true);
    fixture.detectChanges();
    expect(headers().length).toBe(3);
  });

  it('shows the empty message only when not loading and there are no rows', () => {
    host.users.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No records found');
    expect(q('gm-spinner')).toBeNull();

    host.loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('No records found');
  });

  it('spans the state row across every column', () => {
    host.users.set([]);
    fixture.detectChanges();
    expect(q('.gm-table__state').getAttribute('colspan')).toBe('3');
  });

  it('renders a custom empty template when provided', () => {
    const empty = TestBed.createComponent(EmptyTemplateHostComponent);
    empty.detectChanges();
    expect(empty.nativeElement.querySelector('.custom-empty')).toBeTruthy();
    expect(empty.nativeElement.textContent).not.toContain('No records found');
  });
});
