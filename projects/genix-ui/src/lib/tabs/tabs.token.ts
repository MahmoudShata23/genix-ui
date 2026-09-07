import { InjectionToken, Signal } from '@angular/core';

/**
 * Contract a `gm-tab` needs from its parent `gm-tabs`. Declared here rather
 * than importing the parent component so the two files do not depend on each
 * other — no `forwardRef` needed.
 */
export interface GmTabsHost {
  /** The currently selected tab value. Owned solely by the parent. */
  readonly activeValue: Signal<string | number | null>;
}

export const GM_TABS = new InjectionToken<GmTabsHost>('GmTabsHost');
