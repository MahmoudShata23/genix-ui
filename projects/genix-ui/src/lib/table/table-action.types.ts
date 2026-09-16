import type { GmButtonVariant } from '../button/button.types';
import type { GmSeverity, GmSize } from '../core/types';

/**
 * Toolbar key of the built-in add button. Not a `GmTableActionType` — Add is
 * the one toolbar button that is not a configured action.
 */
export const GM_ADD_ACTION_KEY = '__gmAdd';

/**
 * When a toolbar action is offered.
 *
 * - `global`    — always available (Add, Import, Export)
 * - `selection` — only once rows are ticked (Delete, Validate, Deactivate)
 */
export type GmTableActionScope = 'global' | 'selection';

/**
 * One button in `gm-table-toolbar`, described as data rather than markup, so a
 * feature declares its toolbar in the same config object as its columns.
 *
 * Nothing here knows what the action *means*: the toolbar renders it and calls
 * back. That is what keeps Delete, Validate and Export the same shape.
 */
export interface GmTableAction<T> {
  /** Stable identity — used for tracking, and reported on `actionClick`. */
  key: string;

  label?: string;

  /** Icon CSS class, e.g. `"pi pi-trash"`. */
  icon?: string;

  severity?: GmSeverity;

  variant?: GmButtonVariant;

  /** Overrides the toolbar's own `size` for this one action. */
  size?: GmSize;

  /**
   * Defaults to `global`. A `selection` action stays hidden until at least
   * `minSelection` rows are ticked — a Delete that is always visible but
   * usually dead is worse than one that appears when it can do something.
   */
  scope?: GmTableActionScope;

  /** Rows required before a `selection` action appears. Defaults to 1. */
  minSelection?: number;

  /**
   * Hides the action outright. Applied *on top of* the scope rule, so a
   * `selection` action can additionally depend on a permission.
   */
  visible?: (rows: readonly T[]) => boolean;

  /** Renders the action greyed rather than hiding it. */
  disabled?: (rows: readonly T[]) => boolean;

  /**
   * Called with the current selection when the button is pressed. `global`
   * actions receive it too — an Export that respects the ticked rows needs it.
   *
   * Supplying this is optional: `(actionClick)` fires either way, so a
   * consumer can handle every action in one place instead of per entry.
   */
  command?: (rows: readonly T[]) => void;

  /**
   * For the "add" action: callback fired when the add button is clicked,
   * instead of the default navigate-to-create behavior.
   */
  addClicked?: () => void;

  /** Accessible name. Required when there is no `label` (icon-only action). */
  ariaLabel?: string;

  tooltip?: string;
}

/** A toolbar action the user pressed, with the selection it applies to. */
export interface GmTableActionEvent<T> {
  action: GmTableAction<T>;
  /** The selection at the moment of the click — a copy, never the live array. */
  rows: readonly T[];
}

/**
 * Which edge the toolbar's action buttons sit on.
 *
 * `auto` keeps them on the start edge while the end edge has something in it —
 * the column chooser, or projected `gmTableToolbarEnd` content — and moves them
 * to the end edge when it does not, so a toolbar with only actions is not left
 * with an empty half.
 */
export type GmTableToolbarAlign = 'auto' | 'start' | 'end';
