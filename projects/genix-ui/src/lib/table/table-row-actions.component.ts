import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { GmButtonComponent } from '../button/button.component';
import { GmTooltipDirective } from '../tooltip/tooltip.directive';
import { gmActionStyle } from './table-action-registry';
import type {
  GmActionStyle,
  GmSingleAction,
  GmTableActionType,
  GmTableTranslate,
} from './table-config.types';

/**
 * The icon buttons in one row's actions cell, rendered from
 * `tableConfig.singleActions`.
 *
 * Actions keep their slot when a row hides one, so the icons in the column
 * stay in the same place from row to row — a Delete that shifts left because
 * the row above could not be edited is much easier to mis-click.
 */
@Component({
  selector: 'gm-table-row-actions',
  standalone: true,
  imports: [GmButtonComponent, GmTooltipDirective],
  template: `
    <div class="gm-table-row-actions">
      @for (action of relevantActions(); track action.type) {
        @if (isVisible(action)) {
          @let style = styleOf(action.type);
          <gm-button
            variant="text"
            size="small"
            [icon]="style.icon"
            [severity]="style.color"
            [ariaLabel]="label(style)"
            [gmTooltip]="label(style)"
            (onClick)="action.command(row())"
          />
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
  readonly actions = input<readonly GmSingleAction<T>[]>([]);

  readonly row = input.required<T>();

  /**
   * Action types visible on at least one row of the current page, computed by
   * the table across every loaded row. An action absent from this list is
   * dropped outright — reserving a slot nobody on the page ever sees would
   * only waste the column's width.
   */
  readonly visibleActionTypes = input<readonly GmTableActionType[]>([]);

  readonly translate = input<GmTableTranslate>((key) => key);

  protected readonly relevantActions = computed(() =>
    this.actions().filter((action) =>
      this.visibleActionTypes().includes(action.type),
    ),
  );

  protected isVisible(action: GmSingleAction<T>): boolean {
    return action.visible?.(this.row()) ?? true;
  }

  protected styleOf(type: GmTableActionType): GmActionStyle {
    return gmActionStyle(type);
  }

  protected label(style: GmActionStyle): string {
    return this.translate()(style.label);
  }
}
