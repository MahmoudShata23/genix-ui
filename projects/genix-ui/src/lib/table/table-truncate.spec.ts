import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import { GmTableCellDirective } from './table-templates';
import type { GmTableColumn } from './table.types';

interface Row {
  id: number;
  note: string;
  code: string;
  count: number;
}

/** 30 characters, so it is over the 25-character default by 5. */
const LONG = 'Contracted since October 2019x';

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableCellDirective],
  template: `
    <gm-table [data]="rows()" [columns]="columns()" [truncateAt]="limit()">
      <ng-template gmTableCell="code" let-row>
        <span class="templated">{{ row.code }}</span>
      </ng-template>
    </gm-table>
  `,
})
class HostComponent {
  readonly limit = signal(25);
  readonly rows = signal<Row[]>([
    { id: 1, note: LONG, code: LONG, count: 1234567890123 },
  ]);
  readonly columns = signal<GmTableColumn<Row>[]>([
    { field: 'note', header: 'Note' },
    { field: 'code', header: 'Code' },
    { field: 'count', header: 'Count' },
  ]);
}

describe('gm-table cell truncation', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const cells = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tbody td'),
    ) as HTMLElement[];

  const truncated = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-table__truncated'),
    ) as HTMLElement[];

  const noteCell = () => cells()[0];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // ── the default ───────────────────────────────────────────────────────

  it('truncates past 25 characters, showing the head plus an ellipsis', () => {
    const span = noteCell().querySelector(
      '.gm-table__truncated',
    ) as HTMLElement;
    expect(span).toBeTruthy();
    // Character 25 is the space before "2019", so the trailing trim drops it.
    expect(span.textContent).toBe('Contracted since October…');
    // The whole value is only in the tooltip — see the focus test below.
    expect(span.textContent).not.toContain('2019');
  });

  it('leaves a value inside the limit alone, with no tooltip host', () => {
    host.rows.set([{ id: 1, note: 'Short', code: 'x', count: 1 }]);
    fixture.detectChanges();

    expect(truncated().length).toBe(0);
    expect(noteCell().textContent!.trim()).toBe('Short');
  });

  it('does not truncate a value exactly on the limit', () => {
    host.rows.set([
      { id: 1, note: 'x'.repeat(25), code: 'x', count: 1 },
      { id: 2, note: 'x'.repeat(26), code: 'x', count: 1 },
    ]);
    fixture.detectChanges();

    // Only the 26-character row gets a tooltip host.
    expect(truncated().length).toBe(1);
  });

  // ── configuring the limit ─────────────────────────────────────────────

  it('takes the limit from the table input', () => {
    host.limit.set(10);
    fixture.detectChanges();
    expect(
      noteCell().querySelector('.gm-table__truncated')!.textContent,
    ).toBe('Contracted…');

    host.limit.set(28);
    fixture.detectChanges();
    expect(
      noteCell().querySelector('.gm-table__truncated')!.textContent,
    ).toBe('Contracted since October 201…');
  });

  it('lets a column override the table limit', () => {
    host.columns.update((columns) =>
      columns.map((column) =>
        column.field === 'note' ? { ...column, truncateAt: 5 } : column,
      ),
    );
    fixture.detectChanges();

    expect(
      noteCell().querySelector('.gm-table__truncated')!.textContent,
    ).toBe('Contr…');
  });

  it('turns truncation off for one column with truncateAt: 0', () => {
    host.columns.update((columns) =>
      columns.map((column) =>
        column.field === 'note' ? { ...column, truncateAt: 0 } : column,
      ),
    );
    fixture.detectChanges();

    expect(noteCell().querySelector('.gm-table__truncated')).toBeNull();
    expect(noteCell().textContent!.trim()).toBe(LONG);
  });

  it('turns truncation off for the whole table with truncateAt: 0', () => {
    host.limit.set(0);
    fixture.detectChanges();

    expect(truncated().length).toBe(0);
    expect(noteCell().textContent!.trim()).toBe(LONG);
  });

  it('a column override still applies while the table default is off', () => {
    host.limit.set(0);
    host.columns.update((columns) =>
      columns.map((column) =>
        column.field === 'note' ? { ...column, truncateAt: 8 } : column,
      ),
    );
    fixture.detectChanges();

    expect(
      noteCell().querySelector('.gm-table__truncated')!.textContent,
    ).toBe('Contract…');
  });

  // ── scope ─────────────────────────────────────────────────────────────

  it('never touches a templated cell', () => {
    // `code` holds the same over-long value, but renders through a template.
    const codeCell = cells()[1];
    expect(codeCell.querySelector('.gm-table__truncated')).toBeNull();
    expect(codeCell.querySelector('.templated')!.textContent).toBe(LONG);
  });

  it('measures the stringified value, so a long number truncates too', () => {
    host.limit.set(6);
    fixture.detectChanges();

    expect(cells()[2].querySelector('.gm-table__truncated')!.textContent).toBe(
      '123456…',
    );
  });

  it('trims a trailing space rather than leaving it before the ellipsis', () => {
    // 11 characters of "Contracted since then" is "Contracted " — the cut
    // lands *after* the space, which is the only case trimEnd affects.
    host.limit.set(11);
    host.rows.set([
      { id: 1, note: 'Contracted since then', code: 'x', count: 1 },
    ]);
    fixture.detectChanges();

    expect(
      noteCell().querySelector('.gm-table__truncated')!.textContent,
    ).toBe('Contracted…');
  });

  // ── accessibility ─────────────────────────────────────────────────────

  it('makes the truncated cell focusable, so the tooltip is reachable', () => {
    const span = noteCell().querySelector(
      '.gm-table__truncated',
    ) as HTMLElement;
    expect(span.getAttribute('tabindex')).toBe('0');
  });

  it('shows the full value on focus, not only on hover', () => {
    const span = noteCell().querySelector(
      '.gm-table__truncated',
    ) as HTMLElement;

    span.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();

    const bubble = document.querySelector('.cdk-overlay-container gm-tooltip');
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent!.trim()).toBe(LONG);
    expect(span.getAttribute('aria-describedby')).toBeTruthy();

    span.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();
    expect(
      document.querySelector('.cdk-overlay-container gm-tooltip'),
    ).toBeNull();
  });
});
