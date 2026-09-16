import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';

import { GmTableComponent } from './table.component';
import { GmFilterType } from './table-config.types';
import type { TableModel } from './table-config.types';

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: '1', name: 'One' }];

/**
 * Who owns the toolbar's add button. Both halves are asserted together on
 * purpose: the emit half regressed once already, silently, because only the
 * navigate half was covered.
 */
@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [records]="records()"
      [tableConfig]="config"
      [totalRecords]="1"
      [displayActionsInModals]="modals()"
      (addClicked)="adds = adds + 1"
    />
  `,
})
class HostComponent {
  readonly records = signal<Row[]>(ROWS);
  readonly modals = signal(false);
  adds = 0;

  readonly config: TableModel<Row> = {
    columns: [{ field: 'name', header: 'name', filterType: GmFilterType.TEXT }],
  };
}

describe('gm-table add button', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const addButton = (): HTMLButtonElement =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent!.trim().toUpperCase() === 'ADD')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('navigates to create by default, leaving the output silent', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    addButton().click();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['create'], {
      relativeTo: TestBed.inject(ActivatedRoute),
    });
    // Emitting as well would run the feature's handler *and* change route off
    // one click.
    expect(host.adds).toBe(0);
  });

  it('emits instead of navigating once actions live in modals', () => {
    host.modals.set(true);
    fixture.detectChanges();

    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    addButton().click();
    fixture.detectChanges();

    expect(host.adds).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
