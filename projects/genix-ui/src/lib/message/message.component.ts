import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { GmSeverity } from '../core/types';

/**
 * Inline notice that stays in the page, next to the thing it describes.
 *
 * ```html
 * <gm-message severity="warning" icon="pi pi-lock" text="This record is locked." />
 * ```
 *
 * Distinct from `GmToastService`, which is for transient overlay feedback. Use
 * this one for a condition the user needs to keep seeing — a locked record, an
 * in-use warning on a form.
 *
 * `text` covers the common single-string case; project content instead when the
 * message needs markup.
 */
@Component({
  selector: 'gm-message',
  standalone: true,
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-message-host',
  },
})
export class GmMessageComponent {
  readonly severity = input<GmSeverity>('info');

  /** Message text. Omit it and project content into the element instead. */
  readonly text = input<string>();

  /** Icon class, e.g. `pi pi-info-circle`. Decoration only. */
  readonly icon = input<string>();

  /**
   * `alert` announces the message as soon as it appears, which is right for a
   * warning or error the user must notice. Informational notices default to
   * `status`, the polite variant.
   */
  protected get role(): 'alert' | 'status' {
    const severity = this.severity();
    return severity === 'danger' || severity === 'warning' ? 'alert' : 'status';
  }
}
