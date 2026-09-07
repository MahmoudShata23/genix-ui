import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { GmFormFieldBase } from '../core/form-field-base';
import { gmUniqueId } from '../core/unique-id';

/** Value a radio can carry. Primitives cover every usage in the app. */
export type GmRadioValue = string | number | boolean;

/**
 * One option of a radio group, over a native `<input type="radio">`.
 *
 * Each instance is its own control accessor bound to the *same* form control;
 * whichever one holds the control's current value renders as checked. Sharing a
 * `name` also lets the browser handle arrow-key navigation across the group.
 *
 * ```html
 * <gm-radio formControlName="status" name="status" label="Active" value="active" />
 * <gm-radio formControlName="status" name="status" label="Inactive" value="inactive" />
 * ```
 */
@Component({
  selector: 'gm-radio',
  standalone: true,
  templateUrl: './radio.component.html',
  styleUrl: './radio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-choice-host',
    '[class.gm-choice-host--invalid]': 'hasError()',
    '[class.gm-choice-host--disabled]': 'isDisabled()',
    '[class.gm-choice-host--readonly]': 'readOnly()',
  },
})
export class GmRadioComponent extends GmFormFieldBase<GmRadioValue> {
  /**
   * The value this option contributes to the group when selected. Aliased so
   * templates read `value="…"`, while the member name stays distinct from the
   * inherited `value` signal, which holds the *group's* current value.
   */
  readonly optionValue = input.required<GmRadioValue>({ alias: 'value' });

  /**
   * Selected when the control's value matches this option's. Compared with
   * `===`, which is why `value` is restricted to primitives — object options
   * would need an identity strategy that nothing here asks for.
   */
  protected readonly checked = () => this.value() === this.optionValue();

  protected override generateId(): string {
    return gmUniqueId('gm-radio');
  }

  protected handleChange(event: Event): void {
    // Native radios have no `readonly`; undo the selection so the rendered
    // state stays in step with the unchanged control value.
    if (this.readOnly()) {
      (event.target as HTMLInputElement).checked = this.checked();
      return;
    }
    this.commit(this.optionValue());
    // Selecting an option *is* the interaction, so it also marks the control
    // touched — a radio group is rarely blurred before the user moves on.
    this.handleBlur();
  }
}
