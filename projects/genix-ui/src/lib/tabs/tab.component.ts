import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';

import { gmUniqueId } from '../core/unique-id';
import { GmTabLabelDirective } from './tab-label.directive';
import { GM_TABS } from './tabs.token';

/** One tab: its header content and its panel. */
@Component({
  selector: 'gm-tab',
  standalone: true,
  // Keeps an inactive panel out of the DOM, but does NOT defer it. Content
  // projection in Angular is eager: the projected components are constructed
  // by the *consumer's* template regardless of whether this `@if` renders the
  // slot. Verified with a probe — a component placed in an inactive gm-tab
  // still runs its constructor on page load.
  //
  // So this is not equivalent to PrimeNG's `p-tabs lazy`. A consumer whose
  // panel content fetches on init must keep its own `@if` guard around it.
  // Making it genuinely lazy means projecting through an <ng-template> the
  // panel instantiates itself (or `@defer`) — a breaking change to the content
  // API, so it is deliberately not done here.
  template: `@if (active()) {
    <ng-content />
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-tab-panel',
    role: 'tabpanel',
    '[attr.id]': 'panelId',
    '[attr.aria-labelledby]': 'tabId',
    '[hidden]': '!active()',
  },
})
export class GmTabComponent {
  /** Identifies the tab; matched against the parent's value. */
  readonly value = input.required<string | number>();

  readonly label = input<string>();

  readonly disabled = input(false, { transform: booleanAttribute });

  /** Rich header template, used in place of `label` when present. */
  readonly labelTemplate = contentChild(GmTabLabelDirective);

  private readonly tabs = inject(GM_TABS);

  /** Selection lives in the parent, so there is no local active flag. */
  readonly active = computed(() => this.tabs.activeValue() === this.value());

  readonly panelId = gmUniqueId('gm-tabpanel');
  readonly tabId = `${this.panelId}-tab`;
}
