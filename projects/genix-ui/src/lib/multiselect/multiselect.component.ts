import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  contentChild,
  input,
  numberAttribute,
} from '@angular/core';

import { GmDropdownBase, type GmDropdownOption } from '../core/dropdown-base';
import { gmFormat } from '../core/i18n';
import { gmUniqueId } from '../core/unique-id';
import { GmChipComponent } from '../chip/chip.component';
import { GmSpinnerComponent } from '../spinner/spinner.component';
import { GmTooltipDirective } from '../tooltip/tooltip.directive';
import type { GmSeverity } from '../core/types';
import { GmMultiselectHeaderDirective } from './multiselect-header.directive';

/** How the current selection is summarised on the trigger. */
export type GmMultiselectDisplay = 'menu' | 'chip';

/**
 * `numberAttribute` maps a missing value to `NaN`, which would read as a limit
 * of zero — so an optional numeric input needs its own parsing to keep "no
 * limit" expressible.
 */
function optionalCount(
  value: number | string | undefined | null,
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

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
 * Overlay, filtering, option reading, keyboard handling and virtual scrolling
 * all come from `GmDropdownBase`, shared with `gm-select`.
 */
@Component({
  selector: 'gm-multiselect',
  standalone: true,
  imports: [
    GmChipComponent,
    GmSpinnerComponent,
    GmTooltipDirective,
    NgTemplateOutlet,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
  ],
  templateUrl: './multiselect.component.html',
  styleUrl: './multiselect.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-multiselect-host gm-dropdown-host',
    '[class.gm-dropdown-host--invalid]': 'hasError()',
    '[class.gm-field-host--invalid]': 'hasError()',
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
  readonly selectedItemsLabel = input<string>();

  readonly showToggleAll = input(true, { transform: booleanAttribute });

  readonly toggleAllLabel = input<string>();

  /**
   * Most selections allowed. Omit for no limit.
   *
   * The limit blocks *additions* only: a selection that already exists stays
   * valid and can always be removed, so a control that arrives holding more
   * than the limit is not silently rewritten — it just cannot grow.
   */
  readonly selectionLimit = input(undefined, { transform: optionalCount });

  /**
   * Per-chip icon class, e.g. for marking a locked/mandatory selection —
   * `(option) => isLocked(option) ? 'pi pi-lock' : undefined`. Rendered
   * instead of the chip's own dismiss button when it returns a value, so a
   * locked chip cannot be removed and reads as locked rather than removable.
   */
  readonly chipIcon = input<(option: GmDropdownOption) => string | undefined>();

  /** Per-option severity for the `chip` display. Defaults to `primary`. */
  readonly chipSeverity = input<(option: GmDropdownOption) => GmSeverity>();

  /**
   * When every option is selected, shows this text as a single summary chip
   * (`chip` display) or as the trigger's whole label (`menu` display) instead
   * of listing every selection individually. Unset — the default — leaves
   * existing behaviour untouched: a full selection renders exactly like any
   * other, just longer.
   */
  readonly allSelectedLabel = input<string>();

  protected readonly headerTemplate = contentChild(GmMultiselectHeaderDirective);

  protected iconFor(option: GmDropdownOption): string | undefined {
    return this.chipIcon()?.(option);
  }

  protected severityFor(option: GmDropdownOption): GmSeverity {
    return this.chipSeverity()?.(option) ?? 'primary';
  }

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

  /**
   * True once every option is selected and `allSelectedLabel` opts into the
   * collapsed summary — never true with no options at all, since selecting
   * "everything" out of an empty list is not a meaningful state.
   */
  protected readonly isFullySelected = computed(() => {
    const options = this.options();
    return (
      !!this.allSelectedLabel() &&
      options.length > 0 &&
      options.every((option) => this.isSelected(option))
    );
  });

  /** Trigger text in `menu` display: the "all selected" label, the labels, or a count. */
  protected readonly summary = computed(() => {
    if (this.isFullySelected()) {
      return this.allSelectedLabel() ?? null;
    }
    const labels = this.selectedLabels();
    if (!labels.length) {
      return null;
    }
    return labels.length <= this.maxSelectedLabels()
      ? labels.join(', ')
      : gmFormat(
          this.selectedItemsLabel() ?? this.labels().itemsSelected,
          labels.length,
        );
  });

  /**
   * Whether the closed trigger's own text/chips already show every selected
   * label. Past `maxSelectedLabels`, `menu` display collapses to a count and
   * `chip` display collapses the rest into a "+N" badge — either way the full
   * list is no longer visible at a glance, so it needs a tooltip instead.
   */
  protected readonly hasHiddenSelections = computed(
    () => this.selectedLabels().length > this.maxSelectedLabels(),
  );

  /** Full selection, comma-joined — the tooltip content for a closed trigger
   * that is not showing every label. */
  protected readonly allSelectedLabelsText = computed(() =>
    this.selectedLabels().join(', '),
  );

  /**
   * Chips actually drawn in `display="chip"` mode. Capped at the same
   * `maxSelectedLabels` threshold `menu` display uses for its count summary,
   * so the trigger never grows without bound as the selection does — the rest
   * collapse into one "+N" badge (`overflowChipCount`). Empty once
   * `isFullySelected` — the template draws the single "all selected" chip
   * instead of this list.
   */
  protected readonly visibleChipOptions = computed(() =>
    this.isFullySelected()
      ? []
      : this.selectedOptions().slice(0, this.maxSelectedLabels()),
  );

  protected removeLabel(option: GmDropdownOption): string {
    return gmFormat(this.labels().remove, this.labelOf(option));
  }

  protected readonly moreSelectedLabel = computed(() =>
    gmFormat(this.labels().moreSelected, this.overflowChipCount()),
  );

  protected readonly overflowChipCount = computed(() =>
    this.isFullySelected()
      ? 0
      : this.selectedOptions().length - this.visibleChipOptions().length,
  );

  protected readonly hasValue = computed(
    () => this.selectedValues().length > 0,
  );

  /** True only when every currently visible option is selected. */
  protected readonly allVisibleSelected = computed(() => {
    const visible = this.visibleOptions();
    return visible.length > 0 && visible.every((option) => this.isSelected(option));
  });

  /** Whether the selection has reached `selectionLimit`. */
  protected readonly atLimit = computed(() => {
    const limit = this.selectionLimit();
    return limit !== undefined && this.selectedValues().length >= limit;
  });

  /**
   * Select-all has nothing left to do once the limit is reached and the visible
   * options are still not all selected — the only move it could make is an
   * addition the limit forbids.
   */
  protected readonly toggleAllBlocked = computed(
    () => this.atLimit() && !this.allVisibleSelected(),
  );

  protected override generateId(): string {
    return gmUniqueId('gm-multiselect');
  }

  protected override isSelected(option: GmDropdownOption): boolean {
    return this.selectedValues().includes(this.valueForOption(option));
  }

  /** Whether the limit currently rules this option out. */
  protected isBlocked(option: GmDropdownOption): boolean {
    return this.atLimit() && !this.isSelected(option);
  }

  /** Toggling keeps the panel open so several options can be picked. */
  protected override commitActive(option: GmDropdownOption): void {
    const optionValue = this.valueForOption(option);
    const current = this.selectedValues();

    // Always a new array — the bound value is never mutated in place, and a
    // value can never appear twice.
    if (current.includes(optionValue)) {
      this.commit(current.filter((value) => value !== optionValue));
      return;
    }

    // The limit stops additions and nothing else, which is what keeps a full
    // selection editable.
    if (this.atLimit()) {
      return;
    }
    this.commit([...current, optionValue]);
  }

  /**
   * Selects every visible option, or clears them if all are already selected.
   * Scoped to what is visible so it respects an active filter; selections
   * hidden by the filter are left alone. Stops at `selectionLimit`, filling the
   * remaining slots in option order.
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

    const limit = this.selectionLimit();
    const merged = [...current];
    for (const value of visibleValues) {
      if (limit !== undefined && merged.length >= limit) {
        break;
      }
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
