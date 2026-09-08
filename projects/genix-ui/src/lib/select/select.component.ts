import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
} from '@angular/core';

import { GmDropdownBase, type GmDropdownOption } from '../core/dropdown-base';
import { gmUniqueId } from '../core/unique-id';
import { GmSpinnerComponent } from '../spinner/spinner.component';
import { GmSelectOptionDirective } from './select-option.directive';
import { GmSelectValueDirective } from './select-value.directive';

/**
 * Single-select dropdown.
 *
 * ```html
 * <gm-select formControlName="countryId" [options]="countries"
 *            optionLabel="name" optionValue="id" placeholder="Select country" />
 * ```
 *
 * Options may be primitives or objects. With `optionValue` the control holds
 * that property; without it, the control holds the option itself.
 *
 * Rows and the selected value can be re-rendered with `gmSelectOption` /
 * `gmSelectValue` templates, and a long list can be virtualised with
 * `[virtualScroll]="true"`.
 *
 * The overlay, filtering, option reading and keyboard handling come from
 * `GmDropdownBase`, shared with `gm-multiselect`.
 */
@Component({
  selector: 'gm-select',
  standalone: true,
  imports: [
    GmSpinnerComponent,
    NgTemplateOutlet,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
  ],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-select-host gm-dropdown-host',
    '[class.gm-dropdown-host--invalid]': 'hasError()',
    '[class.gm-dropdown-host--open]': 'open()',
    '[class.gm-dropdown-host--filled]': 'isFilled()',
  },
})
export class GmSelectComponent extends GmDropdownBase<unknown> {
  protected readonly optionTemplate = contentChild(GmSelectOptionDirective);

  protected readonly valueTemplate = contentChild(GmSelectValueDirective);

  protected readonly selectedOption = computed(() => {
    const current = this.value();
    if (current === null || current === undefined) {
      return null;
    }
    return (
      this.options().find((option) => this.valueForOption(option) === current) ??
      null
    );
  });

  protected readonly displayLabel = computed(() => {
    const selected = this.selectedOption();
    return selected === null ? null : this.labelOf(selected);
  });

  protected readonly hasValue = computed(
    () => this.value() !== null && this.value() !== undefined,
  );

  protected override generateId(): string {
    return gmUniqueId('gm-select');
  }

  protected override isSelected(option: GmDropdownOption): boolean {
    return this.valueForOption(option) === this.value();
  }

  /** Picking an option is the whole interaction, so the panel closes. */
  protected override commitActive(option: GmDropdownOption): void {
    this.commit(this.valueForOption(option));
    this.close();
    this.focusTrigger();
  }

  protected clear(event: Event): void {
    // Without this the click would bubble to the trigger and open the panel.
    event.stopPropagation();
    this.commit(null);
    this.handleBlur();
  }

}
