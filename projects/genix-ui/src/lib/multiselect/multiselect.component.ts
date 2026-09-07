import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

import { GmDropdownBase, type GmDropdownOption } from '../core/dropdown-base';
import { gmUniqueId } from '../core/unique-id';
import { GmChipComponent } from '../chip/chip.component';
import { GmSpinnerComponent } from '../spinner/spinner.component';

/** How the current selection is summarised on the trigger. */
export type GmMultiselectDisplay = 'menu' | 'chip';

/**
 * Multiple-selection dropdown.
 *
 * ```html
 * <gm-multiselect formControlName="roles" [options]="roles"
 *                 optionLabel="name" optionValue="id" placeholder="Select roles" />
 * ```
 *
 * The control value is always an array. With `optionValue` it holds that
 * property per selection; without it, the selected options themselves —
 * matching `gm-select`.
 *
 * Overlay, filtering, option reading and keyboard handling all come from
 * `GmDropdownBase`, shared with `gm-select`.
 */
@Component({
  selector: 'gm-multiselect',
  standalone: true,
  imports: [GmChipComponent, GmSpinnerComponent],
  templateUrl: './multiselect.component.html',
  styleUrl: './multiselect.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-multiselect-host gm-dropdown-host',
    '[class.gm-dropdown-host--invalid]': 'hasError()',
    '[class.gm-dropdown-host--open]': 'open()',
    '[class.gm-dropdown-host--filled]': 'selectedValues().length > 0',
  },
})
export class GmMultiselectComponent extends GmDropdownBase<unknown[]> {
  readonly display = input<GmMultiselectDisplay>('menu');

  /**
   * Above this many selections the trigger shows a count instead of listing
   * labels. Matches the threshold the PrimeNG usages already set.
   */
  readonly maxSelectedLabels = input(3, { transform: numberAttribute });

  /** Count summary text; `{0}` is replaced with the number selected. */
  readonly selectedItemsLabel = input<string>('{0} items selected');

  readonly showToggleAll = input(true, { transform: booleanAttribute });

  readonly toggleAllLabel = input<string>('Select all');

  /**
   * The value as a plain array. `writeValue` may hand us null (a reset control)
   * or a single value, so this normalises before anything reads it — the reason
   * a pre-set `[1, 3, 5]` shows as selected immediately.
   */
  protected readonly selectedValues = computed<readonly unknown[]>(() => {
    const current = this.value();
    if (current === null || current === undefined) {
      return [];
    }
    return Array.isArray(current) ? current : [current];
  });

  protected readonly selectedOptions = computed(() =>
    this.options().filter((option) => this.isSelected(option)),
  );

  /** Labels of the current selection, in option order. */
  protected readonly selectedLabels = computed(() =>
    this.selectedOptions().map((option) => this.labelOf(option)),
  );

  /** Trigger text in `menu` display: either the labels or a count. */
  protected readonly summary = computed(() => {
    const labels = this.selectedLabels();
    if (!labels.length) {
      return null;
    }
    return labels.length <= this.maxSelectedLabels()
      ? labels.join(', ')
      : this.selectedItemsLabel().replace('{0}', String(labels.length));
  });

  protected readonly hasValue = computed(
    () => this.selectedValues().length > 0,
  );

  /** True only when every currently visible option is selected. */
  protected readonly allVisibleSelected = computed(() => {
    const visible = this.visibleOptions();
    return visible.length > 0 && visible.every((option) => this.isSelected(option));
  });

  protected override generateId(): string {
    return gmUniqueId('gm-multiselect');
  }

  protected override isSelected(option: GmDropdownOption): boolean {
    return this.selectedValues().includes(this.valueForOption(option));
  }

  /** Toggling keeps the panel open so several options can be picked. */
  protected override commitActive(option: GmDropdownOption): void {
    const optionValue = this.valueForOption(option);
    const current = this.selectedValues();

    // Always a new array — the bound value is never mutated in place, and a
    // value can never appear twice.
    this.commit(
      current.includes(optionValue)
        ? current.filter((value) => value !== optionValue)
        : [...current, optionValue],
    );
  }

  /**
   * Selects every visible option, or clears them if all are already selected.
   * Scoped to what is visible so it respects an active filter; selections
   * hidden by the filter are left alone.
   */
  protected toggleAll(): void {
    const visibleValues = this.visibleOptions().map((option) =>
      this.valueForOption(option),
    );
    const current = this.selectedValues();

    if (this.allVisibleSelected()) {
      this.commit(current.filter((value) => !visibleValues.includes(value)));
      return;
    }

    const merged = [...current];
    for (const value of visibleValues) {
      if (!merged.includes(value)) {
        merged.push(value);
      }
    }
    this.commit(merged);
  }

  /** Removes one selection, for the chip display's dismiss button. */
  protected removeValue(option: GmDropdownOption): void {
    const optionValue = this.valueForOption(option);
    this.commit(
      this.selectedValues().filter((value) => value !== optionValue),
    );
  }

  protected clear(event: Event): void {
    // Without this the click would bubble to the trigger and open the panel.
    event.stopPropagation();
    // An empty array, not null — the value of a multiselect is always a list.
    this.commit([]);
    this.handleBlur();
  }
}
