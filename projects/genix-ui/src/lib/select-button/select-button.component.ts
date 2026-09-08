import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';

import { GmFormFieldBase } from '../core/form-field-base';
import { gmOptionLabel, gmOptionValue, gmReadOption } from '../core/option-reader';
import { gmUniqueId } from '../core/unique-id';
import type { GmSize } from '../core/types';

/** One choice in a `gm-select-button`. Primitive or object, like a select's. */
export type GmSelectButtonOption = unknown;

/**
 * Segmented single-choice control — a radio group that looks like a row of
 * buttons.
 *
 * ```html
 * <gm-select-button formControlName="status" [options]="statuses"
 *                   optionLabel="label" optionValue="value" />
 * ```
 *
 * It is a `role="radiogroup"` of `role="radio"` buttons with a roving tabindex,
 * so the whole group is one tab stop and the arrow keys move *and* select —
 * the ARIA radio-group pattern. No overlay and no filtering: this is not a
 * collapsed `gm-select`, so none of that machinery is involved. Option reading
 * is the package's shared `gmOptionLabel` / `gmOptionValue`.
 */
@Component({
  selector: 'gm-select-button',
  standalone: true,
  templateUrl: './select-button.component.html',
  styleUrl: './select-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-select-button-host',
    '[class.gm-select-button-host--invalid]': 'hasError()',
  },
})
export class GmSelectButtonComponent extends GmFormFieldBase<unknown> {
  readonly options = input<readonly GmSelectButtonOption[]>([]);

  /** Property holding an option's display text. Omit for primitive options. */
  readonly optionLabel = input<string>();

  /** Property holding an option's form value. Omit to store the whole option. */
  readonly optionValue = input<string>();

  /** Property marking an option unusable, e.g. `"inactive"`. */
  readonly optionDisabled = input<string>();

  readonly size = input<GmSize>('medium');

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly groupId = gmUniqueId('gm-select-button');

  /**
   * Which option owns the group's single tab stop: the selected one, else the
   * first usable one. Without this a group with nothing selected would be
   * unreachable by keyboard.
   */
  protected readonly tabbableIndex = computed(() => {
    const options = this.options();
    const selected = options.findIndex((option) => this.isSelected(option));
    if (selected >= 0) {
      return selected;
    }
    const firstUsable = options.findIndex((option) => !this.isOptionDisabled(option));
    return firstUsable >= 0 ? firstUsable : -1;
  });

  protected override generateId(): string {
    return gmUniqueId('gm-select-button');
  }

  protected labelOf(option: GmSelectButtonOption): string {
    return gmOptionLabel(option, this.optionLabel());
  }

  protected valueForOption(option: GmSelectButtonOption): unknown {
    return gmOptionValue(option, this.optionValue());
  }

  protected isSelected(option: GmSelectButtonOption): boolean {
    return this.valueForOption(option) === this.value();
  }

  protected isOptionDisabled(option: GmSelectButtonOption): boolean {
    return this.isDisabled() || gmReadOption(option, this.optionDisabled()) === true;
  }

  protected select(option: GmSelectButtonOption): void {
    if (this.isOptionDisabled(option) || this.readOnly()) {
      return;
    }
    this.commit(this.valueForOption(option));
    // Choosing *is* the interaction, so the group counts as touched at once.
    this.handleBlur();
  }

  /**
   * Arrows move to the next usable option and select it, which is how a radio
   * group behaves; Home and End jump to the extremes. Enter and Space are the
   * platform's own button activation and need no handling.
   */
  protected onKeydown(event: KeyboardEvent, index: number): void {
    if (this.isDisabled() || this.readOnly()) {
      return;
    }

    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;

    let target = -1;
    if (step !== 0) {
      target = this.nextUsable(index, step);
    } else if (event.key === 'Home') {
      target = this.nextUsable(-1, 1);
    } else if (event.key === 'End') {
      target = this.nextUsable(this.options().length, -1);
    } else {
      return;
    }

    event.preventDefault();
    const option = this.options()[target];
    if (option !== undefined) {
      this.select(option);
      this.focusOption(target);
    }
  }

  /** Walks in `step` direction, wrapping, until it finds a usable option. */
  private nextUsable(from: number, step: number): number {
    const options = this.options();
    const count = options.length;
    for (let i = 1; i <= count; i += 1) {
      const index = (from + step * i + count * count) % count;
      if (!this.isOptionDisabled(options[index])) {
        return index;
      }
    }
    return -1;
  }

  private focusOption(index: number): void {
    this.hostRef.nativeElement
      .querySelectorAll<HTMLElement>('.gm-select-button__option')
      [index]?.focus();
  }
}
