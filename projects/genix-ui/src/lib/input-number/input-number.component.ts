import {
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
} from '@angular/core';

import { GmFieldSize, GmFormFieldBase } from '../core/form-field-base';
import { gmUniqueId } from '../core/unique-id';

/**
 * Numeric field over a native `<input type="number">`.
 *
 * ```html
 * <gm-input-number formControlName="amount" [min]="0" [max]="100" suffix="%" />
 * ```
 *
 * The control value is always a `number` or null — never a formatted string.
 * `prefix` and `suffix` are decoration rendered beside the input, so a currency
 * symbol or unit never ends up inside the value; there is no locale or currency
 * engine here, and none is planned.
 *
 * `min` and `max` are enforced on commit as well as declared on the element,
 * because the native attributes constrain the spinner but not typing.
 */
@Component({
  selector: 'gm-input-number',
  standalone: true,
  templateUrl: './input-number.component.html',
  styleUrl: './input-number.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-field-host gm-input-number-host',
    '[class.gm-field-host--invalid]': 'hasError()',
    '[class.gm-field-host--filled]': 'isFilled()',
    '[class.gm-field-host--small]': "size() === 'small'",
    '[class.gm-field-host--large]': "size() === 'large'",
  },
})
export class GmInputNumberComponent extends GmFormFieldBase<number> {
  readonly size = input<GmFieldSize>('medium');

  readonly placeholder = input<string>();

  readonly min = input(undefined, { transform: numberAttribute });

  readonly max = input(undefined, { transform: numberAttribute });

  readonly step = input(1, { transform: numberAttribute });

  /** Decoration before the field, e.g. a currency symbol. Not part of the value. */
  readonly prefix = input<string>();

  /** Decoration after the field, e.g. a unit. Not part of the value. */
  readonly suffix = input<string>();

  protected override generateId(): string {
    return gmUniqueId('gm-input-number');
  }

  protected handleInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    // An empty number field reads as NaN, which has to become null rather than
    // being handed to the control.
    const numeric = element.valueAsNumber;
    this.commit(Number.isNaN(numeric) ? null : numeric);
  }

  /**
   * Clamping happens on blur, not on every keystroke: clamping while typing
   * would rewrite "1" into the minimum before the user reached "15".
   */
  protected handleFieldBlur(): void {
    const current = this.value();
    if (current !== null) {
      const clamped = this.clamp(current);
      if (clamped !== current) {
        this.commit(clamped);
      }
    }
    this.handleBlur();
  }

  private clamp(value: number): number {
    const min = this.min();
    const max = this.max();
    if (min !== undefined && value < min) {
      return min;
    }
    if (max !== undefined && value > max) {
      return max;
    }
    return value;
  }
}
