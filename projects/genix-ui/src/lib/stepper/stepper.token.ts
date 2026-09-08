import { InjectionToken, Signal } from '@angular/core';

/**
 * Contract a `gm-step` needs from its parent `gm-stepper`. Declared here rather
 * than importing the parent component so the two files do not depend on each
 * other — no `forwardRef` needed.
 */
export interface GmStepperHost {
  /** Index of the step on show. Owned solely by the parent. */
  readonly activeIndex: Signal<number>;

  /** Position of a step among its siblings, or `-1` before it registers. */
  indexOf(step: unknown): number;
}

export const GM_STEPPER = new InjectionToken<GmStepperHost>('GmStepperHost');
