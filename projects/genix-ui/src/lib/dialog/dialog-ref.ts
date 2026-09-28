import { OverlayRef } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Handle on one open dialog — the object both the opener and the opened
 * component talk to.
 *
 * ```ts
 * // in the opener
 * ref.onClose.subscribe((result) => { … });
 *
 * // in the dialog content
 * constructor(public ref: GmDialogRef<User>) {}
 * save() { this.ref.close(this.form.value); }
 * ```
 *
 * Root-provided with a harmless default (no `overlayRef`, never closed) so a
 * component that is shared between a screen and a dialog can inject this
 * unconditionally: outside a dialog it just gets an inert ref instead of a
 * `NullInjectorError`, and `close()` on it is a no-op.
 *
 * @template R Type of the result passed to `close()`.
 * @template D Type of `data`, mirrored from the config for convenience.
 */
@Injectable({ providedIn: 'root', useFactory: () => new GmDialogRef() })
export class GmDialogRef<R = any, D = any> {
  private readonly closeStream = new Subject<R | undefined>();
  private closed = false;

  /**
   * Emits the result exactly once, then completes — so a plain `subscribe()`
   * needs no teardown, and `firstValueFrom(ref.onClose)` works.
   */
  readonly onClose: Observable<R | undefined> = this.closeStream.asObservable();

  constructor(
    private readonly overlayRef?: OverlayRef,
    /** The same object as `config.data`, for content that reads it off the ref. */
    readonly data?: D,
  ) {}

  /** Whether `close()` has already run. */
  get isClosed(): boolean {
    return this.closed;
  }

  /**
   * Closes the dialog and hands `result` to `onClose`.
   *
   * Idempotent: a second call is a no-op, so Escape landing at the same moment
   * as a click on Save cannot emit twice or dispose an already-disposed
   * overlay.
   *
   * The overlay is disposed *before* the result is emitted. That ordering is
   * what makes focus behave: disposal destroys the container, which is what
   * returns focus to whatever was focused before the dialog opened — so by the
   * time an `onClose` subscriber runs (and possibly opens the next dialog in a
   * sequence) the page is already back in its pre-dialog focus state.
   */
  close(result?: R): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.overlayRef?.dispose();
    this.closeStream.next(result);
    this.closeStream.complete();
  }
}
