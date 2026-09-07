import { InjectionToken } from '@angular/core';

/**
 * Contract a panel needs from its parent accordion. Kept in its own file so
 * panel and accordion do not import each other.
 */
export interface GmAccordionHost {
  isExpanded(value: string | number): boolean;
  toggle(value: string | number): void;
}

export const GM_ACCORDION = new InjectionToken<GmAccordionHost>(
  'GmAccordionHost',
);
