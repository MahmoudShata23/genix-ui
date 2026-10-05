import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { GmButtonComponent } from '../button/button.component';
import { GmMenuComponent } from '../menu/menu.component';
import type { GmMenuItem } from '../menu/menu.types';
import { GmTooltipDirective } from '../tooltip/tooltip.directive';
import { gmResolveAction } from './table-action-registry';
import type { GmResolvedAction } from './table-action-registry';
import type { SingleAction, GmTableTranslate } from './table-config.types';

/**
 * The actions in one row's actions cell, rendered from
 * `tableConfig.singleActions`: icon buttons for `display: 'row'` actions (the
 * default) and one overflow menu for `display: 'menu'` ones.
 *
 * Actions keep their slot when a row hides one, so the icons in the column
 * stay in the same place from row to row — a Delete that shifts left because
 * the row above could not be edited is much easier to mis-click.
 */
@Component({
  selector: 'gm-table-row-actions',
  standalone: true,
  imports: [GmButtonComponent, GmMenuComponent, GmTooltipDirective],
  template: `
    <div class="gm-table-row-actions">
      @for (action of rowActions(); track action.key) {
        @if (isVisible(action.source)) {
          <gm-button
            variant="text"
            size="small"
            [icon]="action.icon"
            [severity]="action.severity"
            [ariaLabel]="action.text"
            [gmTooltip]="action.text"
            [disabled]="isDisabled(action.source)"
            (onClick)="action.source.command(row())"
          />
        } @else {
          <span class="gm-table-row-actions__slot" aria-hidden="true"></span>
        }
      }
      @if (hasMenu()) {
        @if (menuItems().length) {
          <gm-button
            variant="text"
            size="small"
            severity="secondary"
            icon="pi pi-ellipsis-v"
            [ariaLabel]="translate()('actions')"
            [gmTooltip]="translate()('actions')"
            (onClick)="menu.toggle($event)"
          />
          <gm-menu #menu [items]="menuItems()" [ariaLabel]="translate()('actions')" />
        } @else {
          <span class="gm-table-row-actions__slot" aria-hidden="true"></span>
        }
      }
    </div>
  `,
  styles: `
    .gm-table-row-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--gm-space-1);
    }

    /* Same footprint as the small icon button it stands in for. */
    .gm-table-row-actions__slot {
      display: inline-block;
      width: 2rem;
      height: 2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GmTableRowActionsComponent<T> {
  readonly actions = input<readonly SingleAction<T>[]>([]);

  readonly row = input.required<T>();

  /**
   * Keys of the actions visible on at least one row of the current page,
   * computed by the table across every loaded row. An action absent from this
   * list is dropped outright — reserving a slot nobody on the page ever sees
   * would only waste the column's width.
   */
  readonly visibleActionKeys = input<readonly string[]>([]);

  readonly translate = input<GmTableTranslate>((key) => key);

  private readonly relevantActions = computed(() =>
    this.actions()
      .map((source) => ({ source, ...this.resolve(source) }))
      .filter((action) => this.visibleActionKeys().includes(action.key)),
  );

  protected readonly rowActions = computed(() =>
    this.relevantActions().filter((a) => a.source.display !== 'menu'),
  );

  /** Whether any menu action exists on this page, so the trigger keeps its slot. */
  protected readonly hasMenu = computed(() =>
    this.relevantActions().some((a) => a.source.display === 'menu'),
  );

  protected readonly menuItems = computed<GmMenuItem[]>(() =>
    this.relevantActions()
      .filter((a) => a.source.display === 'menu' && this.isVisible(a.source))
      .map((a) => ({
        label: a.text,
        icon: a.icon,
        severity: a.severity,
        disabled: this.isDisabled(a.source),
        command: () => a.source.command(this.row()),
      })),
  );

  protected isVisible(action: SingleAction<T>): boolean {
    return action.visible?.(this.row()) ?? true;
  }

  protected isDisabled(action: SingleAction<T>): boolean {
    return action.disabled?.(this.row()) ?? false;
  }

  private resolve(action: SingleAction<T>): GmResolvedAction & { text: string } {
    const resolved = gmResolveAction(action);
    return { ...resolved, text: this.translate()(resolved.label) };
  }
}
