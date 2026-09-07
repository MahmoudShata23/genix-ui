import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Marks a template as a tab's header content, for headers richer than the
 * `label` string can express.
 *
 * ```html
 * <gm-tab value="auth">
 *   <ng-template gmTabLabel>Auth <span class="period">today</span></ng-template>
 *   …panel content…
 * </gm-tab>
 * ```
 */
@Directive({
  selector: '[gmTabLabel]',
  standalone: true,
})
export class GmTabLabelDirective {
  readonly template = inject(TemplateRef);
}
