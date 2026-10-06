import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
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

  /** Explicit placeholder; otherwise the translated default for the label. */
  protected readonly placeholderText = computed(
    () => this.placeholder() ?? this.fieldPlaceholder('enter'),
  );

  readonly maxLength = input(undefined, { transform: numberAttribute });

  readonly minLength = input(undefined, { transform: numberAttribute });

  /**
   * Icon class rendered inside the field, before the text — e.g.
   * `iconStart="pi pi-search"` for a search box. Decoration only, and hidden
   * from screen readers, so whatever it signifies belongs in the label too.
   *
   * `start`/`end` rather than `left`/`right`: the side follows the writing
   * direction, which the Arabic locale depends on.
   */
  readonly iconStart = input<string>();

  /** Icon class rendered inside the field, after the text. */
  readonly iconEnd = input<string>();

  /**
   * Swaps the trailing icon for a busy indicator — for a field whose value is
   * being acted on, such as a debounced search box between the last keystroke
   * and the request it triggers.
   *
   * The trailing slot rather than the leading one: a leading icon names what
   * the field is for and should not move under the user, whereas the trailing
   * slot is where a field already reports state.
   *
   * Drawn in CSS rather than set as an icon class, because the package bundles
   * no icon font — a spinner the consumer cannot see is not a loading
   * affordance.
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /** Names the wait for a screen reader; the spinner itself is a status role. */
  readonly loadingLabel = input<string>();

  /**
   * Whether anything occupies the trailing slot. The padding that keeps the
   * text clear of it has to follow the spinner too, not only `iconEnd`.
   */
  protected readonly hasIconEnd = computed(
    () => this.loading() || !!this.iconEnd(),
  );

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
