import { Directive, TemplateRef, inject } from '@angular/core';

import type { GmSelectOptionContext } from './select.types';

/**
 * Marks a template as the renderer for each option in a `gm-select` panel, for
 * rows richer than `optionLabel` can express.
 *
 * ```html
 * <gm-select [options]="users" optionLabel="name" optionValue="id">
 *   <ng-template gmSelectOption let-option let-selected="selected">
 *     <strong>{{ option.name }}</strong>
 *     <span>{{ option.email }}</span>
 *   </ng-template>
 * </gm-select>
 * ```
 *
 * Presentation only. The row keeps its `role="option"` wrapper, its id and its
 * selected state, and selection still resolves through `optionValue` against
 * the real option object — so a custom template cannot change what the control
 * stores.
 */
@Directive({
  selector: '[gmSelectOption]',
  standalone: true,
})
export class GmSelectOptionDirective {
  readonly template = inject<TemplateRef<GmSelectOptionContext>>(TemplateRef);

  /** Types `let-option` / `let-selected` / `let-index` in the template. */
  static ngTemplateContextGuard(
    _directive: GmSelectOptionDirective,
    context: unknown,
  ): context is GmSelectOptionContext {
    return true;
  }
}
