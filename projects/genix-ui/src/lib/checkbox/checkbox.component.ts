import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  input,
} from '@angular/core';

import { GmFormFieldBase } from '../core/form-field-base';
import { gmUniqueId } from '../core/unique-id';

/**
 * Binary checkbox over a native `<input type="checkbox">`.
 *
 * ```html
 * <gm-checkbox formControlName="active" label="Active" />
 * ```
 *
 * Only the boolean form is implemented: every checkbox in the app is a binary
 * one bound to a single control. Checkbox *groups* (a control holding an array
 * of selected values) have no usage here, so no group machinery exists.
 */
@Component({
  selector: 'gm-checkbox',
  standalone: true,
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-choice-host',
    '[class.gm-choice-host--invalid]': 'hasError()',
    '[class.gm-choice-host--disabled]': 'isDisabled()',
    '[class.gm-choice-host--readonly]': 'readOnly()',
  },
})
export class GmCheckboxComponent extends GmFormFieldBase<boolean> {
  /**
   * Visually mixed state, for a "select all" that is partially satisfied. It is
   * presentation only — the checkbox's value stays boolean, matching the native
   * element, where `indeterminate` is likewise independent of `checked`.
   */
  readonly indeterminate = input(false, { transform: booleanAttribute });

  protected readonly checked = () => this.value() === true;

  protected override generateId(): string {
    return gmUniqueId('gm-checkbox');
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
    // A checkbox has no meaningful "blur after edit" moment — clicking it *is*
    // the interaction — so it counts as touched as soon as it is toggled.
    this.handleBlur();
  }
}
