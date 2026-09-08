import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  contentChildren,
  input,
  model,
} from '@angular/core';

import { GmButtonComponent } from '../button/button.component';
import { GmStepComponent } from './step.component';
import { GM_STEPPER } from './stepper.token';

/**
 * Horizontal stepper. Headers are derived from the projected `gm-step`
 * children, so a step's header and panel stay declared in one place.
 *
 * ```html
 * <gm-stepper [(activeStep)]="activeStep">
 *   <gm-step label="Details">…</gm-step>
 *   <gm-step label="Documents">…</gm-step>
 * </gm-stepper>
 * ```
 *
 * `activeStep` is a two-way model, so both `[(activeStep)]` and the
 * `[activeStep]` + `(activeStepChange)` pair work.
 *
 * Navigation here is movement, not workflow: `next()` and `previous()` only
 * skip disabled steps and stop at the ends. Whether the user is *allowed* to
 * advance is the app's call — gate it with `[nextDisabled]`, or turn off
 * `showNavigation` and drive `next()`/`previous()` from your own buttons.
 */
@Component({
  selector: 'gm-stepper',
  standalone: true,
  imports: [GmButtonComponent],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: GM_STEPPER, useExisting: GmStepperComponent }],
})
export class GmStepperComponent {
  /** Index of the step on show. */
  readonly activeStep = model<number>(0);

  /** The built-in Back/Next row. */
  readonly showNavigation = input(true, { transform: booleanAttribute });

  readonly nextLabel = input('Next');

  readonly backLabel = input('Back');

  /** Blocks Next without blocking the step itself — for the app's own rules. */
  readonly nextDisabled = input(false, { transform: booleanAttribute });

  readonly ariaLabel = input<string>();

  protected readonly steps = contentChildren(GmStepComponent);

  /** Exposed to the children through `GM_STEPPER`. */
  readonly activeIndex = this.activeStep.asReadonly();

  protected readonly canGoNext = computed(() => this.target(1) !== null);

  protected readonly canGoBack = computed(() => this.target(-1) !== null);

  /** Position of a step among its siblings. Part of `GmStepperHost`. */
  indexOf(step: unknown): number {
    return this.steps().indexOf(step as GmStepComponent);
  }

  /** Moves to the next step that is not disabled, if there is one. */
  next(): void {
    this.moveTo(this.target(1));
  }

  /** Moves to the previous step that is not disabled, if there is one. */
  previous(): void {
    this.moveTo(this.target(-1));
  }

  protected select(step: GmStepComponent): void {
    if (step.disabled()) {
      return;
    }
    this.activeStep.set(step.index());
  }

  private moveTo(index: number | null): void {
    if (index !== null) {
      this.activeStep.set(index);
    }
  }

  /**
   * Nearest step in `direction` that can be shown, or `null` at the end.
   * Reads signals, so the callers above can be `computed`.
   */
  private target(direction: 1 | -1): number | null {
    const steps = this.steps();
    for (
      let index = this.activeStep() + direction;
      index >= 0 && index < steps.length;
      index += direction
    ) {
      if (!steps[index].disabled()) {
        return index;
      }
    }
    return null;
  }
}
