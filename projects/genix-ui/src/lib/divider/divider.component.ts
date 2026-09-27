import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { GmDividerOrientation } from './divider.types';

/**
 * A plain rule separating two sections of content.
 *
 * ```html
 * <gm-divider />
 * <gm-divider orientation="vertical" />
 * ```
 */
@Component({
  selector: 'gm-divider',
  standalone: true,
  templateUrl: './divider.component.html',
  styleUrl: './divider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-divider-host',
    '[class]': "'gm-divider-host--' + orientation()",
  },
})
export class GmDividerComponent {
  readonly orientation = input<GmDividerOrientation>('horizontal');
}
