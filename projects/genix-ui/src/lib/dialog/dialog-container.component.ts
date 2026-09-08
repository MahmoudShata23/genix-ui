import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkPortalOutlet, ComponentPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  inject,
} from '@angular/core';

import { GmButtonComponent } from '../button/button.component';
import { gmUniqueId } from '../core/unique-id';
import { GmDialogConfig } from './dialog.config';
import { GmDialogRef } from './dialog-ref';
import { GM_DIALOG_CONTENT } from './dialog.tokens';

/**
 * The chrome around a dialog: backdrop, centred panel, header, close button,
 * and the outlet the opened component is rendered into.
 *
 * Internal — consumers reach it only by calling `GmDialogService.open()`, and
 * it is not part of the package's public surface.
 *
 * It owns full-screen positioning itself (`position: fixed` on the backdrop)
 * rather than leaning on the CDK's `.cdk-overlay-*` geometry or `hasBackdrop`.
 * Genix's styling contract is "load `tokens.css`, nothing else", and the CDK's
 * own positioning and backdrop rules live in `overlay-prebuilt.css` — a sheet
 * this package does not ask consumers to add. Fixed positioning is relative to
 * the viewport, so the panel centres correctly whether or not that sheet is
 * present. The overlay is still what puts the dialog in a container outside the
 * app's stacking contexts, and what routes Escape to the top-most dialog only.
 */
@Component({
  selector: 'gm-dialog-container',
  standalone: true,
  imports: [CdkPortalOutlet, CdkTrapFocus, GmButtonComponent],
  templateUrl: './dialog-container.component.html',
  styleUrl: './dialog-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-dialog-container' },
})
export class GmDialogContainerComponent {
  protected readonly config = inject<GmDialogConfig>(GmDialogConfig);
  protected readonly ref = inject<GmDialogRef>(GmDialogRef);

  /**
   * The content's injector is this component's own, so the chain reaches the
   * per-dialog providers the service created — which is how the opened
   * component can inject its `GmDialogRef` and `GmDialogConfig`.
   */
  protected readonly contentPortal = new ComponentPortal(
    inject(GM_DIALOG_CONTENT),
    null,
    inject(Injector),
  );

  /** Ties the panel's `aria-labelledby` to the rendered title. */
  protected readonly headerId = gmUniqueId('gm-dialog-title');

  protected readonly panelClasses = [
    ...(typeof this.config.panelClass === 'string'
      ? [this.config.panelClass]
      : (this.config.panelClass ?? [])),
  ];

  /**
   * Only a click on the backdrop itself dismisses. Comparing against
   * `currentTarget` rather than stopping propagation on the panel keeps clicks
   * inside the dialog untouched — a content component is free to listen for
   * them.
   */
  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.config.dismissableMask) {
      this.ref.close();
    }
  }
}
