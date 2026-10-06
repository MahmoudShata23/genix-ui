import { NgTemplateOutlet } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GmTableRowExpansionDirective } from './table-templates';
import { GmTableComponent } from './table.component';
import type { TableModel } from './table-config.types';

interface Row {
  id: number;
  name: string;
  notes: string;
}

@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableRowExpansionDirective],
  template: `
    <gm-table
      [records]="rows()"
      [tableConfig]="config"
      [totalRecords]="3"
      [rowExpandable]="hasNotes"
    >
      <ng-template gmTableRowExpansion let-row>
        <p class="detail">{{ row.notes }}</p>
      </ng-template>
    </gm-table>
  `,
})
class HostComponent {
  readonly rows = signal<Row[]>([
    { id: 1, name: 'One', notes: 'first notes' },
    { id: 2, name: 'Two', notes: '' },
    { id: 3, name: 'Three', notes: 'third notes' },
  ]);

  readonly hasNotes = (row: Row): boolean => row.notes.length > 0;

  readonly config: TableModel<Row> = {
    columns: [{ field: 'name', header: 'name' }],
  };
}

describe('gm-table row expansion in config mode', () => {
  let fixture: ComponentFixture<HostComponent>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const toggles = (): HTMLButtonElement[] =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('.gm-table__expand-toggle'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('shows a toggle only on rows rowExpandable accepts', () => {
    expect(toggles().length).toBe(2);
  });

  it('opens and closes the detail row', () => {
    expect(root().querySelector('.detail')).toBeNull();

    toggles()[0].click();
    fixture.detectChanges();
    expect(root().querySelector('.detail')!.textContent).toContain('first notes');

    toggles()[0].click();
    fixture.detectChanges();
    expect(root().querySelector('.detail')).toBeNull();
  });
});

/**
 * The shape an app wrapper uses: the template arrives as an input and is
 * re-declared inside <gm-table> through an @if + outlet.
 */
@Component({
  standalone: true,
  imports: [GmTableComponent, GmTableRowExpansionDirective, NgTemplateOutlet],
  template: `
    <ng-template #details let-row><p class="wrapped">{{ row.notes }}</p></ng-template>
    <gm-table [records]="rows" [tableConfig]="config" [totalRecords]="1">
      @if (provide()) {
        <ng-template gmTableRowExpansion let-row>
          <ng-container
            [ngTemplateOutlet]="details"
            [ngTemplateOutletContext]="{ $implicit: row }"
          />
        </ng-template>
      }
    </gm-table>
  `,
})
class WrapperHostComponent {
  readonly provide = signal(true);
  readonly rows: Row[] = [{ id: 1, name: 'One', notes: 'wrapped notes' }];
  readonly config: TableModel<Row> = {
    columns: [{ field: 'name', header: 'name' }],
  };
}

describe('gm-table row expansion through a wrapper', () => {
  it('works when the template sits inside an @if', () => {
    TestBed.configureTestingModule({
      imports: [WrapperHostComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(WrapperHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const toggle = root.querySelector<HTMLButtonElement>('.gm-table__expand-toggle');
    expect(toggle).not.toBeNull();
    toggle!.click();
    fixture.detectChanges();
    expect(root.querySelector('.wrapped')!.textContent).toContain('wrapped notes');
  });

  it('shows no toggle column while the @if is false', () => {
    TestBed.configureTestingModule({
      imports: [WrapperHostComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(WrapperHostComponent);
    fixture.componentInstance.provide.set(false);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.gm-table__expand-toggle'),
    ).toBeNull();
  });
});
