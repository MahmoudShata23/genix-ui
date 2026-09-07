import {
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
} from '@angular/core';

import { GmFieldSize, GmFormFieldBase } from '../core/form-field-base';
import { gmUniqueId } from '../core/unique-id';
import type { GmInputType } from './input.types';

/**
 * Single-line text field over a native `<input>`.
 *
 * ```html
 * <gm-input formControlName="name" label="Name" placeholder="Enter name" />
 * ```
 */
@Component({
  selector: 'gm-input',
  standalone: true,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-field-host',
    '[class.gm-field-host--invalid]': 'hasError()',
    '[class.gm-field-host--filled]': 'isFilled()',
    '[class.gm-field-host--small]': "size() === 'small'",
    '[class.gm-field-host--large]': "size() === 'large'",
  },
})
export class GmInputComponent extends GmFormFieldBase<string | number> {
  readonly type = input<GmInputType>('text');

  readonly size = input<GmFieldSize>('medium');

  readonly autocomplete = input<string>();

  readonly placeholder = input<string>();

  readonly maxLength = input(undefined, { transform: numberAttribute });

  readonly minLength = input(undefined, { transform: numberAttribute });

  protected override generateId(): string {
    return gmUniqueId('gm-input');
  }

  protected handleInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    // A number field must hand the control a number, not a numeric string;
    // an empty number field is `NaN`, which has to become `null`.
    if (this.type() === 'number') {
      const numeric = element.valueAsNumber;
      this.commit(Number.isNaN(numeric) ? null : numeric);
      return;
    }
    this.commit(element.value);
  }
}
