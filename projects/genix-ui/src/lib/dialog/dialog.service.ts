import { ESCAPE, hasModifierKey } from '@angular/cdk/keycodes';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal, ComponentType } from '@angular/cdk/portal';
import { Injectable, Injector, inject } from '@angular/core';
import { filter } from 'rxjs';

import { GmDialogContainerComponent } from './dialog-container.component';
import { GmDialogConfig } from './dialog.config';
import { GmDialogRef } from './dialog-ref';
import { GM_DIALOG_CONTENT } from './dialog.tokens';

/**
 * Opens components as modal dialogs.
 *
 * ```ts
 * const ref = this.dialogService.open(EditUserComponent, {
 *   header: 'Edit User',
 *   data: user,
 *   width: '600px',
 * });
 *
 * ref.onClose.subscribe((result) => { … });
 * ```
 *
 * The opened component injects its own `GmDialogRef` and `GmDialogConfig`; each
 * `open()` builds a fresh injector for them, so two dialogs open at once never
 * see each other's data or close each other.
 */
@Injectable({ providedIn: 'root' })
export class GmDialogService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  /**
   * @param component Component to render inside the dialog.
   * @param options Everything about this dialog; see `GmDialogConfig`.
   * @returns A ref whose `onClose` emits what `close()` was called with.
   *
   * @template C The content component.
   * @template D Type of `options.data`.
   * @template R Type of the dialog's result.
   */
  open<C, D = any, R = any>(
    component: ComponentType<C>,
    options: GmDialogConfig<D> = {},
  ): GmDialogRef<R, D> {
    const config = this.resolveConfig(options);

    // No `hasBackdrop` and no position strategy on purpose: the container
    // renders and centres itself (see `GmDialogContainerComponent`). What the
    // overlay is here for is the out-of-tree host element, the disposal
    // lifecycle, and `keydownEvents()`.
    const overlayRef = this.overlay.create();
    const ref = new GmDialogRef<R, D>(overlayRef, config.data);

    // Subscribed even when `closeOnEscape` is off, and the flag checked inside:
    // the CDK routes the key to the top-most overlay that *has* a subscriber, so
    // staying unsubscribed would let Escape fall through and close the dialog
    // underneath this one instead. Completed by `dispose()`, so no teardown.
    overlayRef
      .keydownEvents()
      .pipe(filter((event) => event.keyCode === ESCAPE && !hasModifierKey(event)))
      .subscribe((event) => {
        // The top dialog owns the key either way; nothing behind it may react.
        event.preventDefault();
        if (config.closeOnEscape) {
          ref.close();
        }
      });

    overlayRef.attach(
      new ComponentPortal(
        GmDialogContainerComponent,
        null,
        Injector.create({
          parent: this.injector,
          providers: [
            { provide: GmDialogRef, useValue: ref },
            { provide: GmDialogConfig, useValue: config },
            { provide: GM_DIALOG_CONTENT, useValue: component },
          ],
        }),
      ),
    );

    return ref;
  }

  /**
   * Settles the defaults once, so the container and the content component read
   * decided values. `??=` rather than `||=` — an explicit `closable: false`
   * must survive.
   */
  private resolveConfig<D>(options: GmDialogConfig<D>): GmDialogConfig<D> {
    const config = Object.assign(new GmDialogConfig<D>(), options);
    config.closable ??= true;
    config.closeOnEscape ??= true;
    config.dismissableMask ??= false;
    config.modal ??= true;
    return config;
  }
}
