import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';

import { gmUniqueId } from '../core/unique-id';
import { GM_ACCORDION } from './accordion.token';

/** One collapsible panel. */
@Component({
  selector: 'gm-accordion-panel',
  standalone: true,
  templateUrl: './accordion-panel.component.html',
  styleUrl: './accordion-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-accordion__panel',
    '[class.gm-accordion__panel--expanded]': 'expanded()',
    '[class.gm-accordion__panel--disabled]': 'disabled()',
  },
})
export class GmAccordionPanelComponent {
  readonly value = input.required<string | number>();

  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly accordion = inject(GM_ACCORDION);

  readonly expanded = computed(() => this.accordion.isExpanded(this.value()));

  readonly contentId = gmUniqueId('gm-accordion-content');
  readonly headerId = `${this.contentId}-header`;

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.accordion.toggle(this.value());
  }
}
