import type { GmDropdownOption } from '../core/dropdown-base';

/** Option shape accepted by `gm-select`. The library-wide dropdown option. */
export type GmSelectOption = GmDropdownOption;

/**
 * What a `gmSelectOption` template receives.
 *
 * `$implicit` is `any` rather than `unknown` on purpose. A content template is
 * declared by the consumer, and nothing at that site tells the compiler what
 * `[options]` holds — so `unknown` would make `{{ option.name }}` an error in
 * every real usage. `index` and `selected` come from the component, so those
 * stay typed.
 */
export interface GmSelectOptionContext {
  /** The option object itself — bind it with `let-option`. */
  readonly $implicit: any;

  /** Position in the currently visible (filtered) list. */
  readonly index: number;

  /** Whether this option is the control's current value. */
  readonly selected: boolean;
}

/** What a `gmSelectValue` template receives. See `GmSelectOptionContext`. */
export interface GmSelectValueContext {
  /** The selected option object — bind it with `let-option`. */
  readonly $implicit: any;
}
