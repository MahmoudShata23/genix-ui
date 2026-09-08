import { Directive, TemplateRef, inject } from '@angular/core';

import type { GmSelectValueContext } from './select.types';

/**
 * Marks a template as the renderer for the *selected* option shown on a
 * `gm-select` trigger.
 *
 * ```html
 * <gm-select [options]="users" optionLabel="name" optionValue="id">
 *   <ng-template gmSelectValue let-option>
 *     <span class="avatar">{{ option.initials }}</span> {{ option.name }}
 *   </ng-template>
 * </gm-select>
 * ```
 *
 * The template renders inside the trigger, which is a `<button>`, so keep it
 * to phrasing content — a `<div>` or `<p>` there is invalid HTML. The
 * placeholder still shows when nothing is selected; this template is never
 * asked to render a null option.
 */
@Directive({
  selector: '[gmSelectValue]',
  standalone: true,
})
export class GmSelectValueDirective {
  readonly template = inject<TemplateRef<GmSelectValueContext>>(TemplateRef);

  /** Types `let-option` in the template. */
  static ngTemplateContextGuard(
    _directive: GmSelectValueDirective,
    context: unknown,
  ): context is GmSelectValueContext {
    return true;
  }
}
