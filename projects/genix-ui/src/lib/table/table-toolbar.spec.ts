import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableToolbarComponent } from './table-toolbar.component';
import type {
  GmTableAction,
  GmTableActionEvent,
  GmTableToolbarAlign,
} from './table-action.types';
import type { GmTableColumn } from './table.types';

interface Row {
  id: number;
  name: string;
  email?: string;
  locked?: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: 'Cara' },
  { id: 2, name: 'Alan' },
];

@Component({
  standalone: true,
  imports: [GmTableToolbarComponent],
  template: `
    <gm-table-toolbar
      [actions]="actions()"
      [selection]="selection()"
      [disabled]="disabled()"
      (actionClick)="events.push($event)"
    >
      <span class="extra-default">extra</span>
      <span gmTableToolbarEnd class="extra-end">end slot</span>
    </gm-table-toolbar>
  `,
})
class HostComponent {
  readonly selection = signal<Row[]>([]);
  readonly disabled = signal(false);
  readonly events: GmTableActionEvent<Row>[] = [];
  readonly commanded: Row[][] = [];

  readonly actions = signal<GmTableAction<Row>[]>([
    { key: 'add', label: 'Add', icon: 'pi pi-plus' },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'pi pi-trash',
      severity: 'danger',
      scope: 'selection',
      command: (rows) => this.commanded.push([...rows]),
    },
  ]);
}

describe('gm-table-toolbar', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const buttons = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-table-toolbar__actions button'),
    ) as HTMLButtonElement[];

  const labels = () => buttons().map((b) => b.textContent!.trim());

  const press = (label: string) => {
    buttons()
      .find((b) => b.textContent!.trim() === label)!
      .click();
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

  // ── scope ─────────────────────────────────────────────────────────────

  it('hides a selection action while nothing is selected', () => {
    expect(labels()).toEqual(['Add']);
  });

  it('reveals it as soon as a row is selected, and hides it again', () => {
    host.selection.set([ROWS[0]]);
    fixture.detectChanges();
    expect(labels()).toEqual(['Add', 'Delete']);

    host.selection.set([]);
    fixture.detectChanges();
    expect(labels()).toEqual(['Add']);
  });

  it('honours minSelection, so a bulk-only action waits for two rows', () => {
    host.actions.update((actions) =>
      actions.map((action) =>
        action.key === 'delete' ? { ...action, minSelection: 2 } : action,
      ),
    );
    host.selection.set([ROWS[0]]);
    fixture.detectChanges();
    expect(labels()).toEqual(['Add']);

    host.selection.set(ROWS);
    fixture.detectChanges();
    expect(labels()).toEqual(['Add', 'Delete']);
  });

  it('applies visible on top of the scope rule', () => {
    host.actions.update((actions) =>
      actions.map((action) =>
        action.key === 'delete' ? { ...action, visible: () => false } : action,
      ),
    );
    host.selection.set(ROWS);
    fixture.detectChanges();
    // Selected, but the permission predicate still says no.
    expect(labels()).toEqual(['Add']);
  });

  // ── clicking ──────────────────────────────────────────────────────────

  it('calls the action command with the selection', () => {
    host.selection.set(ROWS);
    fixture.detectChanges();
    press('Delete');

    expect(host.commanded).toEqual([ROWS]);
  });

  it('emits actionClick for every action, command or not', () => {
    host.selection.set([ROWS[1]]);
    fixture.detectChanges();

    press('Add');
    press('Delete');

    expect(host.events.map((e) => e.action.key)).toEqual(['add', 'delete']);
    // A global action still receives the selection — an Export needs it.
    expect(host.events[0].rows).toEqual([ROWS[1]]);
  });

  it('hands the command a snapshot, so clearing the selection is safe', () => {
    host.actions.update((actions) =>
      actions.map((action) =>
        action.key === 'delete'
          ? {
              ...action,
              command: (rows) => {
                // A real delete handler clears the selection as it goes.
                host.selection.set([]);
                host.commanded.push([...rows]);
              },
            }
          : action,
      ),
    );
    host.selection.set(ROWS);
    fixture.detectChanges();
    press('Delete');

    expect(host.commanded).toEqual([ROWS]);
    expect(host.events[0].rows.length).toBe(2);
  });

  // ── disabled ──────────────────────────────────────────────────────────

  it('greys an action out from its own disabled predicate', () => {
    host.actions.update((actions) =>
      actions.map((action) =>
        action.key === 'delete'
          ? { ...action, disabled: (rows) => rows.length > 1 }
          : action,
      ),
    );
    host.selection.set([ROWS[0]]);
    fixture.detectChanges();
    expect(buttons()[1].disabled).toBeFalse();

    host.selection.set(ROWS);
    fixture.detectChanges();
    expect(buttons()[1].disabled).toBeTrue();
  });

  it('disables every action from the toolbar input', () => {
    host.selection.set(ROWS);
    host.disabled.set(true);
    fixture.detectChanges();
    expect(buttons().every((b) => b.disabled)).toBeTrue();
  });

  it('does not fire a disabled action', () => {
    host.selection.set(ROWS);
    host.disabled.set(true);
    fixture.detectChanges();

    buttons()[1].click();
    fixture.detectChanges();
    expect(host.commanded.length).toBe(0);
    expect(host.events.length).toBe(0);
  });

  // ── slots ─────────────────────────────────────────────────────────────

  it('projects extra content beside the actions and into the end slot', () => {
    expect(
      fixture.nativeElement.querySelector(
        '.gm-table-toolbar__actions .extra-default',
      ),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.gm-table-toolbar__aside .extra-end'),
    ).toBeTruthy();
  });

  // ── accessibility ─────────────────────────────────────────────────────

  it('names an icon-only action from its tooltip when no ariaLabel is given', () => {
    host.actions.set([
      { key: 'refresh', icon: 'pi pi-refresh', tooltip: 'Refresh' },
    ]);
    fixture.detectChanges();
    expect(buttons()[0].getAttribute('aria-label')).toBe('Refresh');
  });

  it('leaves a labelled action to name itself', () => {
    expect(buttons()[0].getAttribute('aria-label')).toBeNull();
  });
});

// ── column chooser + action alignment ──────────────────────────────────────

@Component({
  standalone: true,
  imports: [GmTableToolbarComponent],
  template: `
    <gm-table-toolbar
      [actions]="actions"
      [columns]="columns"
      [(visibleFields)]="visibleFields"
      [showColumnChooser]="showChooser()"
      [minVisibleColumns]="minColumns()"
      [actionsAlign]="align()"
      (columnChooserRejected)="rejected.push($event)"
    >
      @if (showEndSlot()) {
        <span gmTableToolbarEnd class="end-slot">end</span>
      }
    </gm-table-toolbar>
  `,
})
class ChooserHostComponent {
  readonly showChooser = signal(true);
  readonly showEndSlot = signal(false);
  readonly minColumns = signal(1);
  readonly align = signal<GmTableToolbarAlign>('auto');
  readonly visibleFields = signal<string[]>(['name', 'email']);
  readonly rejected: number[] = [];

  readonly actions: GmTableAction<Row>[] = [{ key: 'add', label: 'Add' }];

  readonly columns: GmTableColumn<Row>[] = [
    { field: 'name', header: 'Name' },
    { field: 'email', header: 'Email' },
    { field: 'locked', header: 'Locked', toggleable: false },
    { header: 'Actions' },
  ];
}

describe('gm-table-toolbar column chooser', () => {
  let fixture: ComponentFixture<ChooserHostComponent>;
  let host: ChooserHostComponent;

  const chooser = () =>
    fixture.nativeElement.querySelector('.gm-table-toolbar__chooser');
  const trigger = () =>
    chooser()!.querySelector('.gm-dropdown__trigger') as HTMLButtonElement;

  const options = () =>
    Array.from(
      document.querySelectorAll('.cdk-overlay-container [role="option"]'),
    ) as HTMLElement[];

  const openChooser = () => {
    trigger().click();
    fixture.detectChanges();
  };

  const toggleOption = (label: string) => {
    options()
      .find((o) => o.textContent?.trim() === label)!
      .click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooserHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ChooserHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the chooser only when asked', () => {
    expect(chooser()).toBeTruthy();

    host.showChooser.set(false);
    fixture.detectChanges();
    expect(chooser()).toBeNull();
  });

  it('offers only columns with a field that have not opted out', () => {
    openChooser();
    // `locked` sets toggleable: false; the Actions column has no field.
    expect(options().map((o) => o.textContent!.trim())).toEqual([
      'Name',
      'Email',
    ]);
  });

  it('writes the chooser back through the two-way binding', () => {
    openChooser();
    toggleOption('Email');
    expect(host.visibleFields()).toEqual(['name']);
  });

  it('reverts a change that would drop below minVisibleColumns', () => {
    host.minColumns.set(2);
    fixture.detectChanges();

    openChooser();
    toggleOption('Email');

    expect(host.visibleFields()).toEqual(['name', 'email']);
    expect(host.rejected).toEqual([2]);
  });

  it('allows a change that stays on the floor', () => {
    host.minColumns.set(1);
    fixture.detectChanges();

    openChooser();
    toggleOption('Email');

    expect(host.visibleFields()).toEqual(['name']);
    expect(host.rejected).toEqual([]);
  });

  // ── alignment ───────────────────────────────────────────────────────────

  const actionsEl = () =>
    fixture.nativeElement.querySelector(
      '.gm-table-toolbar__actions',
    ) as HTMLElement;

  /**
   * `auto` is resolved in CSS, and a browser reports the *used* value of an
   * auto margin — a non-zero pixel offset — never the keyword itself.
   *
   * Geometry cannot stand in for it: the bar is `space-between`, so the
   * actions render flush to the end edge whenever the aside holds anything,
   * with or without the margin. The applied margin is the only thing that
   * tells the two apart.
   */
  const actionsPushedToEnd = () =>
    parseFloat(getComputedStyle(actionsEl()).marginInlineStart) > 0;

  it('keeps actions on the start edge while the chooser is showing', () => {
    expect(actionsPushedToEnd()).toBeFalse();
  });

  it('moves actions to the end edge when nothing else is in the bar', () => {
    host.showChooser.set(false);
    fixture.detectChanges();
    expect(actionsPushedToEnd()).toBeTrue();
  });

  it('keeps actions on the start edge for projected end content alone', () => {
    host.showChooser.set(false);
    host.showEndSlot.set(true);
    fixture.detectChanges();
    // The chooser is off, but the slot is filled, so the bar is not lopsided.
    expect(actionsPushedToEnd()).toBeFalse();
  });

  it('honours an explicit end alignment even with the chooser showing', () => {
    host.align.set('end');
    fixture.detectChanges();
    expect(actionsPushedToEnd()).toBeTrue();
  });

  it('honours an explicit start alignment with an empty bar', () => {
    host.showChooser.set(false);
    host.align.set('start');
    fixture.detectChanges();
    expect(actionsPushedToEnd()).toBeFalse();
  });
});
