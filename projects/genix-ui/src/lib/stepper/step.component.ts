import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';

import { gmUniqueId } from '../core/unique-id';
import { GM_STEPPER } from './stepper.token';

/** `completed` is tri-state: unset means "derive it from the active step". */
function optionalBoolean(
  value: boolean | string | undefined | null,
): boolean | undefined {
  return value === undefined || value === null ? undefined : booleanAttribute(value);
}

/** One step: its header text and its panel. */
@Component({
  selector: 'gm-step',
  standalone: true,
  // Same caveat as `gm-tab`: this keeps an inactive panel out of the DOM but
  // does not defer it, because content projection is eager — the consumer's
  // template constructs the projected components either way. A panel that
  // fetches on init needs the consumer's own `@if` around it.
  template: `@if (active()) {
    <ng-content />
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-step',
    role: 'group',
    '[attr.id]': 'panelId',
    '[attr.aria-labelledby]': 'headerId',
    '[hidden]': '!active()',
  },
})
export class GmStepComponent {
  readonly label = input<string>();

  /** Icon class for the marker, in place of the step number. */
  readonly icon = input<string>();

  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Forces the completed mark. Left alone, a step counts as completed once the
   * stepper has moved past it — which is what a linear form wants. Set it
   * explicitly when the app tracks completion itself.
   */
  readonly completed = input(undefined, { transform: optionalBoolean });

  private readonly stepper = inject(GM_STEPPER);

  /** Position among the sibling steps. */
  readonly index = computed(() => this.stepper.indexOf(this));

  /** Selection lives in the parent, so there is no local active flag. */
  readonly active = computed(() => this.index() === this.stepper.activeIndex());

  readonly isCompleted = computed(() => {
    const forced = this.completed();
    if (forced !== undefined) {
      return forced;
    }
    const index = this.index();
    return index >= 0 && index < this.stepper.activeIndex();
  });

  readonly panelId = gmUniqueId('gm-step');
  readonly headerId = `${this.panelId}-header`;
}
