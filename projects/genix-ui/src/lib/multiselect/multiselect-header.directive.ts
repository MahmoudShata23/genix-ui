import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Marks a template rendered inside the `gm-multiselect` panel, above the
 * option list and below the filter input — for a control row that applies to
 * the selection as a whole (e.g. a "select all" or "any/no filter" checkbox)
 * rather than to one option.
 *
 * ```html
 * <gm-multiselect [options]="roles" optionLabel="name" optionValue="id">
 *   <ng-template gmMultiselectHeader>
 *     <label>
 *       <input type="checkbox" [checked]="isAnySelected" (change)="toggleAny()" />
 *       Any (no filter)
 *     </label>
 *   </ng-template>
 * </gm-multiselect>
 * ```
 *
 * Presentation only — it does not receive or drive the control's value. A
 * click handler inside it is expected to call back into the host component,
 * exactly like the built-in "select all" row does internally.
 */
@Directive({
  selector: '[gmMultiselectHeader]',
  standalone: true,
})
export class GmMultiselectHeaderDirective {
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}
