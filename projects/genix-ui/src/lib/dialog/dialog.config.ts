import { Injectable } from '@angular/core';

/**
 * Everything a dialog needs to know about itself.
 *
 * One class serves two roles, deliberately: it is the *argument* type of
 * `GmDialogService.open()` — so call sites pass a plain object literal — and it
 * is the *injection token* the opened component uses to read that object back.
 * That is the shape PrimeNG's `DynamicDialogConfig` has, which is what keeps a
 * migration to `GmDialogConfig` a rename rather than a rewrite.
 *
 * Every field is optional; the service resolves the defaults once, into the
 * instance it provides, so the container and the content both read settled
 * values rather than re-deriving `?? true` in each place.
 *
 * Root-provided with an empty instance so a component shared between a screen
 * and a dialog can inject this unconditionally — outside a dialog it just
 * reads an all-`undefined` config instead of a `NullInjectorError`.
 *
 * ```ts
 * const ref = dialogService.open(EditUserComponent, {
 *   header: 'Edit User',
 *   data: user,
 *   width: '600px',
 * });
 * ```
 *
 * @template D Type of `data`. Defaults to `any` so `config.data` stays as
 *   permissive as the PrimeNG original when a caller does not name a type.
 */
/**
 * Where the dialog sits. `'middle'` is a centred modal; `'start'` and `'end'`
 * dock a full-height panel to the inline start/end edge (left/right in LTR,
 * mirrored in RTL).
 */
export type GmDialogPosition = 'start' | 'middle' | 'end';

@Injectable({ providedIn: 'root' })
export class GmDialogConfig<D = any> {
  /** Payload handed to the opened component. Read as `config.data`. */
  data?: D;

  /** Title text. Also becomes the dialog's accessible name. */
  header?: string;

  /** Any CSS length, e.g. `'600px'` or `'50rem'`. Defaults to content width. */
  width?: string;

  /** Any CSS length. Defaults to content height. */
  height?: string;

  /** Overrides the viewport-relative cap the dialog applies by default. */
  maxWidth?: string;

  /** Overrides the viewport-relative cap the dialog applies by default. */
  maxHeight?: string;

  /**
   * `'start'` / `'end'` render a side panel spanning the full page height,
   * flush against that edge. Default `'middle'`. `height` and `maxHeight` are
   * ignored for side panels.
   */
  position?: GmDialogPosition;

  /** Show the header close button. Default `true`. */
  closable?: boolean;

  /** Escape closes the dialog. Default `true`. */
  closeOnEscape?: boolean;

  /** Clicking the backdrop closes the dialog. Default `false`. */
  dismissableMask?: boolean;

  /**
   * Dim the page behind the dialog and mark it `aria-modal`. Default `true`.
   * With `false` the backdrop is transparent but still captures pointer events
   * — the dialog is not a non-modal popover, it just does not tint the page.
   */
  modal?: boolean;

  /** Extra class(es) on the dialog panel, for per-dialog layout tweaks. */
  panelClass?: string | string[];

  /**
   * Writing direction. Defaults to the document's (`<html dir>` / `<body dir>`),
   * which is what a dialog rendered under <body> can actually see; set it when
   * `dir` is applied to an app element instead.
   */
  direction?: 'ltr' | 'rtl';

  /** Accessible name when there is no `header` to name the dialog. */
  ariaLabel?: string;
}
