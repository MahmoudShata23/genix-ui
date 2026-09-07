import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Header content of a panel. Purely a projection slot — the real toggle
 * `<button>` is rendered by `gm-accordion-panel`, which owns the aria wiring.
 */
@Component({
  selector: 'gm-accordion-header',
  standalone: true,
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-accordion__header-content' },
})
export class GmAccordionHeaderComponent {}

/** Body content of a panel. */
@Component({
  selector: 'gm-accordion-content',
  standalone: true,
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-accordion__content-inner' },
})
export class GmAccordionContentComponent {}
