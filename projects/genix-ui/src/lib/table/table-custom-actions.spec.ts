import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GmTableComponent } from './table.component';
import { GmTableBulkActionScope } from './table-config.types';
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
    document.querySelector('.cdk-overlay-container')!.innerHTML = '';
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
