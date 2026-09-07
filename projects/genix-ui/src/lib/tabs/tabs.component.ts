import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  contentChildren,
  inject,
  model,
} from '@angular/core';

import { GmTabComponent } from './tab.component';
import { GM_TABS } from './tabs.token';

/**
 * Tab set. Headers are derived from the projected `gm-tab` children, so a tab's
 * header and panel stay declared in one place.
 *
 * ```html
 * <gm-tabs [(value)]="activeTab">
 *   <gm-tab value="details" label="Details">…</gm-tab>
 * </gm-tabs>
 * ```
 *
 * `value` is a two-way model, so both `[(value)]` and the
 * `[value]` + `(valueChange)` pair used by the PrimeNG templates work.
 */
@Component({
  selector: 'gm-tabs',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: GM_TABS, useExisting: GmTabsComponent }],
})
export class GmTabsComponent {
  readonly value = model<string | number | null>(null);

  protected readonly tabs = contentChildren(GmTabComponent);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Exposed to the children through `GM_TABS`. */
  readonly activeValue = this.value.asReadonly();

  protected select(tab: GmTabComponent): void {
    if (tab.disabled()) {
      return;
    }
    this.value.set(tab.value());
  }

  /**
   * Roving-focus keyboard support for the tablist, per the ARIA tabs pattern:
   * arrows move between tabs, Home/End jump to the ends. Activation follows
   * focus, so Enter/Space need no separate handling — moving to a tab selects
   * it, which is the pattern's "automatic activation" variant.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const enabled = this.tabs().filter((tab) => !tab.disabled());
    if (!enabled.length) {
      return;
    }

    const current = enabled.findIndex((tab) => tab.active());
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % enabled.length;
        break;
      case 'ArrowLeft':
        next = (current - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = enabled.length - 1;
        break;
      default:
        return;
    }

    // The keys above all scroll the page by default.
    event.preventDefault();
    this.select(enabled[next]);
    this.focusTab(enabled[next]);
  }

  private focusTab(tab: GmTabComponent): void {
    this.host.nativeElement
      .querySelector<HTMLButtonElement>(`#${tab.tabId}`)
      ?.focus();
  }
}
