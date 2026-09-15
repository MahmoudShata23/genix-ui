import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  model,
  numberAttribute,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GmButtonComponent } from '../button/button.component';
import { GmMultiselectComponent } from '../multiselect/multiselect.component';
import { GmTooltipDirective } from '../tooltip/tooltip.directive';
import type { GmSize } from '../core/types';
import type {
  GmTableAction,
  GmTableActionEvent,
  GmTableToolbarAlign,
} from './table-action.types';
import type { GmTableColumn } from './table.types';

/**
 * The bar above a `gm-table`: config-driven action buttons on one edge, and on
 * the other a column chooser plus a slot for any further view controls.
 *
 * ```html
 * <gm-table-toolbar
 *   [actions]="toolbarActions"
 *   [selection]="selected()"
 *   [columns]="columns"
 *   [(visibleFields)]="visibleFields"
 *   showColumnChooser
 *   (actionClick)="onAction($event)"
 * >
 *   <gm-button gmTableToolbarEnd icon="pi pi-filter-slash" … />
 * </gm-table-toolbar>
 * ```
 *
 * Deliberately a sibling of `gm-table` rather than part of it. The table owns
 * rows; a toolbar owns business actions, and folding the two together is what
 * makes a grid component impossible to reuse. It takes `selection` as a plain
 * input, so it pairs with `[(selection)]` on the table and needs no shared
 * service.
 *
 * An action with `scope: 'selection'` appears only once rows are ticked, which
 * is how a bulk Delete is wired up — see `GmTableAction`.
 */
@Component({
  selector: 'gm-table-toolbar',
  standalone: true,
  imports: [
    FormsModule,
    GmButtonComponent,
    GmMultiselectComponent,
    GmTooltipDirective,
  ],
  templateUrl: './table-toolbar.component.html',
  styleUrl: './table-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-table-toolbar-host' },
})
export class GmTableToolbarComponent<T> {
  readonly actions = input<readonly GmTableAction<T>[]>([]);

  /** The table's current selection. Feed `[(selection)]`'s signal straight in. */
  readonly selection = input<readonly T[]>([]);

  /** Size applied to every action that does not override it. */
  readonly size = input<GmSize>('small');

  /** Disables every action and the chooser — for a toolbar over a loading table. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Which edge the actions sit on. `auto` (the default) moves them to the end
   * edge only when nothing else is there, so turning `showColumnChooser` off
   * does not leave the bar lopsided.
   */
  readonly actionsAlign = input<GmTableToolbarAlign>('auto');

  /**
   * Fires for every action, whether or not it carries a `command`, so a
   * consumer can switch on `action.key` in one handler instead of closing over
   * a callback per entry.
   */
  readonly actionClick = output<GmTableActionEvent<T>>();

  // ── Column chooser ──────────────────────────────────────────────────────

  /**
   * Columns offered in the chooser. Pass the same array the table gets: a
   * column with no `field`, or with `toggleable: false`, is skipped.
   */
  readonly columns = input<readonly GmTableColumn<T>[]>([]);

  /**
   * Fields currently shown, two-way. Authoritative — seed it with every field
   * that should start visible, and filter the table's own `columns` by it.
   */
  readonly visibleFields = model<string[]>([]);

  readonly showColumnChooser = input(false, { transform: booleanAttribute });

  /**
   * Floor on the chooser, so the user cannot hide the whole grid. An attempt to
   * go below it is reverted and reported on `columnChooserRejected`.
   */
  readonly minVisibleColumns = input(1, { transform: numberAttribute });

  readonly columnChooserLabel = input<string>('Columns');

  /** `{0}` is replaced with the count, matching `gm-multiselect`. */
  readonly selectedColumnsLabel = input<string>('{0} items selected');

  /** The rejected change's floor, for a consumer that wants to explain it. */
  readonly columnChooserRejected = output<number>();

  protected readonly columnOptions = computed(() =>
    this.columns()
      .filter((column) => !!column.field && column.toggleable !== false)
      .map((column) => ({
        label: column.header,
        value: column.field as string,
      })),
  );

  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * The actions actually rendered: scope first, then the action's own
   * `visible` predicate, so a `selection` action can additionally depend on a
   * permission without restating the selection check.
   */
  protected readonly visibleActions = computed<readonly GmTableAction<T>[]>(
    () => {
      const rows = this.selection();
      return this.actions().filter((action) => {
        if (
          (action.scope ?? 'global') === 'selection' &&
          rows.length < (action.minSelection ?? 1)
        ) {
          return false;
        }
        return action.visible?.(rows) ?? true;
      });
    },
  );

  /** True while any selection-scoped action is showing — styles the bar. */
  protected readonly hasSelection = computed(() => this.selection().length > 0);

  protected isDisabled(action: GmTableAction<T>): boolean {
    return this.disabled() || (action.disabled?.(this.selection()) ?? false);
  }

  protected sizeOf(action: GmTableAction<T>): GmSize {
    return action.size ?? this.size();
  }

  /**
   * An icon-only action still needs a name; the tooltip is the natural place a
   * consumer already wrote one, so it doubles as the fallback.
   */
  protected labelFor(action: GmTableAction<T>): string | undefined {
    return action.ariaLabel ?? (action.label ? undefined : action.tooltip);
  }

  protected onAction(action: GmTableAction<T>): void {
    // Snapshot the selection: a command that clears it must not change the
    // array the handler is still reading.
    const rows = [...this.selection()];
    action.command?.(rows);
    this.actionClick.emit({ action, rows });
  }

  protected onColumnsChange(value: unknown): void {
    const fields = Array.isArray(value)
      ? value.filter((field): field is string => typeof field === 'string')
      : [];

    if (fields.length < this.minVisibleColumns()) {
      // Re-assert the current selection under a fresh reference, so the
      // control snaps back rather than sitting on a value we refused.
      this.visibleFields.set([...this.visibleFields()]);
      this.columnChooserRejected.emit(this.minVisibleColumns());
      return;
    }

    this.visibleFields.set(fields);
  }
}
