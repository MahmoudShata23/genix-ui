import { ChangeDetectionStrategy, Component, booleanAttribute, input, model } from '@angular/core';

import { GM_ACCORDION } from './accordion.token';

/**
 * Accordion container. Owns which panels are open so a panel never tracks its
 * own state.
 *
 * ```html
 * <gm-accordion value="general">
 *   <gm-accordion-panel value="general">
 *     <gm-accordion-header>General</gm-accordion-header>
 *     <gm-accordion-content>…</gm-accordion-content>
 *   </gm-accordion-panel>
 * </gm-accordion>
 * ```
 */
@Component({
  selector: 'gm-accordion',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './accordion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: GM_ACCORDION, useExisting: GmAccordionComponent }],
  host: { class: 'gm-accordion' },
})
export class GmAccordionComponent {
  /**
   * Open panel value(s). A two-way model, so `[(value)]` and plain `value="0"`
   * both work. An array is only meaningful with `multiple`.
   */
  readonly value = model<string | number | (string | number)[] | null>(null);

  /** Allows more than one panel open at a time. */
  readonly multiple = input(false, { transform: booleanAttribute });

  isExpanded(panel: string | number): boolean {
    const current = this.value();
    return Array.isArray(current) ? current.includes(panel) : current === panel;
  }

  toggle(panel: string | number): void {
    if (!this.multiple()) {
      // Single mode: re-clicking the open panel closes it.
      this.value.set(this.isExpanded(panel) ? null : panel);
      return;
    }

    const current = this.value();
    const open = Array.isArray(current)
      ? current
      : current === null
        ? []
        : [current];

    this.value.set(
      open.includes(panel)
        ? open.filter((item) => item !== panel)
        : [...open, panel],
    );
  }
}
