import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GmFormFieldBase } from '../core/form-field-base';
import { gmUniqueId } from '../core/unique-id';

/**
 * On/off switch over a native `<input type="checkbox">`.
 *
 * ```html
 * <gm-toggle-switch formControlName="enabled" label="Enabled" />
 * ```
 *
 * The same element as `gm-checkbox` underneath, carrying `role="switch"` —
 * which is what assistive technology expects — so activation, the disabled
 * state and focus are all the platform's. It differs only in appearance and in
 * that announcement: a checkbox is "checked", a switch is "on".
 */
@Component({
  selector: 'gm-toggle-switch',
  standalone: true,
  templateUrl: './toggle-switch.component.html',
  styleUrl: './toggle-switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-switch-host',
    '[class.gm-switch-host--invalid]': 'hasError()',
    '[class.gm-switch-host--disabled]': 'isDisabled()',
    '[class.gm-switch-host--readonly]': 'readOnly()',
  },
})
export class GmToggleSwitchComponent extends GmFormFieldBase<boolean> {
  protected readonly checked = () => this.value() === true;

  protected override generateId(): string {
    return gmUniqueId('gm-toggle-switch');
  }

  protected handleChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    // Native checkboxes have no `readonly`, so the toggle is undone here to
    // keep the rendered state in step with the unchanged control value.
    if (this.readOnly()) {
      element.checked = this.checked();
      return;
    }
    this.commit(element.checked);
    // Flipping the switch *is* the interaction, so it counts as touched at once
    // rather than waiting for a blur.
    this.handleBlur();
  }
}
