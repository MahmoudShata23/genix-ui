import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import { GmTableRowExpansionDirective } from './table-templates';
import type { GmTableColumn } from './table.types';

interface Row {
  id: number;
  name: string;
  hasDetails: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: 'Cara', hasDetails: true },
  { id: 2, name: 'Alan', hasDetails: false },
  { id: 3, name: 'Bea', hasDetails: true },
];

const COLUMNS: GmTableColumn<Row>[] = [{ field: 'name', header: 'Name' }];

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableRowExpansionDirective],
  template: `
    <gm-table
      [data]="rows()"
      [columns]="COLUMNS"
      rowKey="id"
      [rowExpandable]="expandable()"
    >
      <ng-template gmTableRowExpansion let-row let-i="index">
        <p class="detail">Details for {{ row.name }} (#{{ i }})</p>
      </ng-template>
    </gm-table>
  `,
})
class HostComponent {
  readonly COLUMNS = COLUMNS;
  readonly rows = signal<Row[]>(ROWS);
  readonly expandable = signal<
    ((row: Row, index: number) => boolean) | undefined
  >((row) => row.hasDetails);
}

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `<gm-table [data]="rows" [columns]="COLUMNS" rowKey="id" />`,
})
class PlainHostComponent {
  readonly COLUMNS = COLUMNS;
  readonly rows = ROWS;
}

describe('gm-table row expansion', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const qa = (sel: string) =>
    Array.from(fixture.nativeElement.querySelectorAll(sel)) as HTMLElement[];
  const bodyRows = () => qa('tbody > tr');
  const toggles = () => qa('.gm-table__expand-toggle') as HTMLButtonElement[];
  const detailRows = () => qa('.gm-table__expansion-row');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] })
      .compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a toggle only for rows the predicate allows', () => {
    expect(toggles().length).toBe(2);
    expect(qa('.gm-table__td--expand').length).toBe(3);
  });

  it('renders a toggle for every row when rowExpandable is omitted', () => {
    host.expandable.set(undefined);
    fixture.detectChanges();
    expect(toggles().length).toBe(3);
  });

  it('opens the expansion row under the toggled row, with the right context', () => {
    expect(detailRows().length).toBe(0);

    toggles()[0].click();
    fixture.detectChanges();

    expect(detailRows().length).toBe(1);
    expect(detailRows()[0].querySelector('.detail')!.textContent!.trim()).toBe(
      'Details for Cara (#0)',
    );
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('true');

    // The detail row sits directly under the row it belongs to.
    const caraRow = bodyRows()[0];
    expect(caraRow.nextElementSibling).toBe(detailRows()[0]);
  });

  it('closes the expansion row on a second click', () => {
    toggles()[0].click();
    fixture.detectChanges();
    toggles()[0].click();
    fixture.detectChanges();

    expect(detailRows().length).toBe(0);
  });

  it('allows more than one row open at once', () => {
    toggles()[0].click();
    fixture.detectChanges();
    toggles()[1].click();
    fixture.detectChanges();

    expect(detailRows().length).toBe(2);
  });

  it('spans the detail cell across every column, including the toggle column', () => {
    toggles()[0].click();
    fixture.detectChanges();

    const cell = detailRows()[0].querySelector('td')!;
    // 1 data column + 1 expand-toggle column.
    expect(cell.getAttribute('colspan')).toBe('2');
  });
});

describe('gm-table without a row-expansion template', () => {
  it('renders no toggle column at all', async () => {
    await TestBed.configureTestingModule({ imports: [PlainHostComponent] })
      .compileComponents();
    const fixture = TestBed.createComponent(PlainHostComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.gm-table__td--expand'),
    ).toBeNull();
  });
});
