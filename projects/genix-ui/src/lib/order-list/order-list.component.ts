import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  contentChild,
  input,
  output,
} from '@angular/core';

import { GmButtonComponent } from '../button/button.component';
import { gmOptionLabel } from '../core/option-reader';
import { gmUniqueId } from '../core/unique-id';
import { GmOrderListItemDirective } from './order-list-item.directive';

/**
 * Reorderable list, dragged with the CDK or moved with the per-row buttons.
 *
 * ```html
 * <gm-order-list
 *   [items]="items"
 *   itemLabel="name"
 *   (orderChange)="items = $event"
 * />
 * ```
 *
 * Controlled, like the rest of the package: the component never mutates
 * `items`, it emits a reordered copy. Assign that back — as above — or the list
 * springs back to the order it was given, which is the right behaviour when the
 * app rejects the move.
 *
 * Reordering is all it does. Persisting the order is a request, and requests
 * belong to the app's own service.
 */
@Component({
  selector: 'gm-order-list',
  standalone: true,
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    NgTemplateOutlet,
    GmButtonComponent,
  ],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-order-list' },
})
export class GmOrderListComponent {
  readonly items = input<readonly unknown[]>([]);

  /** Property to display. Omit it when the items are already strings. */
  readonly itemLabel = input<string>();

  readonly disabled = input(false, { transform: booleanAttribute });

  /** Visible caption above the list. */
  readonly header = input<string>();

  readonly ariaLabel = input<string>();

  /**
   * The Move up / Move down buttons. They are the keyboard route to
   * reordering, so turning them off leaves the list mouse-only.
   */
  readonly showControls = input(true, { transform: booleanAttribute });

  /** The whole list in its new order. */
  readonly orderChange = output<unknown[]>();

  protected readonly itemTemplate = contentChild(GmOrderListItemDirective);

  protected readonly listId = gmUniqueId('gm-order-list');

  protected readonly headerId = `${this.listId}-header`;

  protected label(item: unknown): string {
    return gmOptionLabel(item, this.itemLabel());
  }

  protected onDrop(event: CdkDragDrop<readonly unknown[]>): void {
    this.move(event.previousIndex, event.currentIndex);
  }

  protected moveBy(index: number, step: 1 | -1): void {
    this.move(index, index + step);
  }

  private move(from: number, to: number): void {
    const items = this.items();
    if (this.disabled() || from === to || to < 0 || to >= items.length) {
      return;
    }
    const next = [...items];
    moveItemInArray(next, from, to);
    this.orderChange.emit(next);
  }
}
