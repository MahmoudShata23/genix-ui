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
  // Mirrors PrimeNG's TabPanel exactly — the panel is created when the tab
  // becomes active and destroyed when it leaves, so migrated tabs keep their
  // existing load/teardown behaviour instead of all initialising at once.
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
