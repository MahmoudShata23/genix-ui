import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { GmSize } from '../core/types';

/**
 * Indeterminate loading indicator, drawn in CSS — no SVG, no animation library.
 *
 * ```html
 * <gm-spinner ariaLabel="Loading data" />
 * ```
 *
 * The host carries `role="status"`, so assistive technology announces the
 * loading state when the spinner appears.
 */
@Component({
  selector: 'gm-spinner',
  standalone: true,
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-spinner-host',
    '[class.gm-spinner-host--small]': "size() === 'small'",
    '[class.gm-spinner-host--large]': "size() === 'large'",
    role: 'status',
    '[attr.aria-label]': 'ariaLabel()',
    'aria-live': 'polite',
  },
})
export class GmSpinnerComponent {
  readonly size = input<GmSize>('medium');

  readonly ariaLabel = input<string>('Loading');
}
