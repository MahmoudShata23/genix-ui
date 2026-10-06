import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GmTableComponent } from './table.component';
import { GmCellType, GmTableBulkActionScope } from './table-config.types';
import type { TableModel } from './table-config.types';

interface Row {
  id: string;
  name: string;
}

const calls: string[] = [];

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `<gm-table [records]="rows" [tableConfig]="config" [totalRecords]="2" />`,
})
class HostComponent {
  readonly rows: Row[] = [
    { id: '1', name: 'One' },
    { id: '2', name: 'Two' },
  ];

  readonly config: TableModel<Row> = {
    columns: [{ field: 'name', header: 'name' }],
    singleActions: [
      {
        key: 'send',
        icon: 'pi pi-send',
        label: 'Send',
        severity: 'info',
        command: (row) => calls.push(`send ${row.id}`),
      },
      {
        key: 'archive',
        icon: 'pi pi-box',
        label: 'Archive',
        display: 'menu',
        command: (row) => calls.push(`archive ${row.id}`),
      },
      {
        key: 'purge',
        label: 'Purge',
        display: 'menu',
        visible: (row) => row.id === '2',
        command: (row) => calls.push(`purge ${row.id}`),
      },
    ],
    bulkActions: [
      {
        key: 'notify',
        icon: 'pi pi-bell',
        label: 'Notify',
        scope: GmTableBulkActionScope.GLOBAL,
        command: (rows) => calls.push(`notify ${rows.length}`),
      },
    ],
  };
}

describe('gm-table custom actions', () => {
  let fixture: ComponentFixture<HostComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const firstRowActions = (): HTMLElement =>
    root().querySelector('tbody tr gm-table-row-actions') as HTMLElement;

  beforeEach(async () => {
    calls.length = 0;
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    const overlays = document.querySelector('.cdk-overlay-container');
    if (overlays) {
      overlays.innerHTML = '';
    }
  });

  it('draws a keyed action with its own icon and runs its command', () => {
    const button = firstRowActions().querySelector('button')!;
    expect(button.querySelector('.pi-send')).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Send');

    button.click();
    expect(calls).toEqual(['send 1']);
  });

  it('puts menu actions behind one overflow button', () => {
    const buttons = firstRowActions().querySelectorAll('button');
    expect(buttons.length).toBe(2);

    buttons[1].click();
    fixture.detectChanges();

    const items = document.querySelectorAll<HTMLElement>(
      '.cdk-overlay-container .gm-menu__item',
    );
    // "Purge" is hidden on row 1.
    expect(Array.from(items).map((i) => i.textContent!.trim())).toEqual([
      'Archive',
    ]);

    items[0].click();
    expect(calls).toEqual(['archive 1']);
  });

  it('runs a custom bulk action from the toolbar', () => {
    const notify = Array.from(root().querySelectorAll('button')).find((b) =>
      b.textContent!.includes('Notify'),
    )!;
    notify.click();
    expect(calls).toEqual(['notify 0']);
  });
});

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `<gm-table [records]="rows" [tableConfig]="config" [totalRecords]="2" />`,
})
class ButtonCellHostComponent {
  readonly rows: Row[] = [
    { id: '1', name: 'One' },
    { id: '2', name: 'Two' },
  ];

  readonly config: TableModel<Row> = {
    columns: [
      { field: 'name', header: 'name' },
      {
        field: 'id',
        header: 'documents',
        cellType: GmCellType.BUTTONS,
        actions: [
          {
            key: 'preview',
            icon: 'pi pi-eye',
            label: 'Preview',
            command: (row) => calls.push(`preview ${row.id}`),
          },
          {
            key: 'download',
            label: 'Download',
            visible: (row) => row.id === '2',
            command: (row) => calls.push(`download ${row.id}`),
          },
        ],
      },
    ],
  };
}

describe('gm-table BUTTONS cell', () => {
  it('draws the column actions as buttons in the cell and runs them', () => {
    calls.length = 0;
    TestBed.configureTestingModule({
      imports: [ButtonCellHostComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ButtonCellHostComponent);
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    const first = rows[0].querySelectorAll('gm-table-config-cell button');
    const second = rows[1].querySelectorAll('gm-table-config-cell button');
    // Row 1 hides "Download" via `visible`; row 2 shows both.
    expect(first.length).toBe(1);
    expect(second.length).toBe(2);

    first[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(calls).toEqual(['preview 1']);
  });
});
