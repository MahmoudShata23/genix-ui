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

  /** Accessible name when there is no `header` to name the dialog. */
  ariaLabel?: string;
}
