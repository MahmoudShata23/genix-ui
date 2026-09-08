import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { GmButtonComponent } from '../button/button.component';
import { GM_TOAST_HOST } from './toast.tokens';
import { GM_TOAST_DEFAULTS, GmToastSeverity } from './toast.types';

/** Severity to primeicons class — the package's existing icon strategy. */
const TOAST_ICONS: Record<GmToastSeverity, string> = {
  success: 'pi pi-check-circle',
  info: 'pi pi-info-circle',
  warning: 'pi pi-exclamation-triangle',
  danger: 'pi pi-times-circle',
};

/**
 * The single host that renders the toast stack.
 *
 * Internal — `GmToastService` creates it in an overlay on the first toast, so
 * no application template mentions it.
 *
 * Like the dialog container it positions itself (`position: fixed` with logical
 * insets) rather than relying on the CDK's `overlay-prebuilt.css` geometry,
 * which this package does not ask consumers to load.
 */
@Component({
  selector: 'gm-toast-container',
  standalone: true,
  imports: [GmButtonComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GmToastContainerComponent {
  private readonly host = inject(GM_TOAST_HOST);

  protected readonly toasts = this.host.toasts;

  protected readonly icons = TOAST_ICONS;

  protected readonly positionClass = `gm-toast-region--${
    inject(GM_TOAST_DEFAULTS).position ?? 'top-end'
  }`;

  protected dismiss(id: string): void {
    this.host.dismiss(id);
  }
}
