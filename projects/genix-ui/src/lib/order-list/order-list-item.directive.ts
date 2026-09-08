import { Directive, TemplateRef, inject } from '@angular/core';

import type { GmOrderListItemContext } from './order-list.types';

/**
 * Marks a template as the renderer for each row of a `gm-order-list`, for rows
 * richer than `itemLabel` can express.
 *
 * ```html
 * <gm-order-list [items]="benefits" (orderChange)="benefits = $event">
 *   <ng-template gmOrderListItem let-item let-index="index">
 *     <strong>{{ index + 1 }}. {{ item.name }}</strong>
 *   </ng-template>
 * </gm-order-list>
 * ```
 *
 * Presentation only. The drag handle, the move buttons and the emitted order
 * stay with the component, so a custom template cannot change the ordering.
 */
@Directive({
  selector: '[gmOrderListItem]',
  standalone: true,
})
export class GmOrderListItemDirective {
  readonly template = inject<TemplateRef<GmOrderListItemContext>>(TemplateRef);

  /** Types `let-item` / `let-index` in the template. */
  static ngTemplateContextGuard(
    _directive: GmOrderListItemDirective,
    context: unknown,
  ): context is GmOrderListItemContext {
    return true;
  }
}
