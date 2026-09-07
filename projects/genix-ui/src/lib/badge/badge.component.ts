import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

import type { GmSeverity, GmSize } from '../core/types';

/**
 * Status pill.
 *
 * ```html
 * <gm-badge value="Pending" severity="warning" />
 * ```
 *
 * The design system renders badges as uppercase tinted pills, so `value` is
 * short status text or a count — not arbitrary content.
 */
@Component({
  selector: 'gm-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-badge-host',
  },
})
export class GmBadgeComponent {
  readonly value = input<string | number>();

  readonly severity = input<GmSeverity>('primary');

  readonly size = input<GmSize>('medium');

  /**
   * A count badge: fixed circular footprint rather than a text pill. Named for
   * the shape it produces, matching the design system's `.gm-badge-count`.
   */
  readonly rounded = input(false, { transform: booleanAttribute });

  /**
   * Accessible name, for when the bare value is not self-explanatory
   * (e.g. `value="12"` meaning "12 unread").
   */
  readonly ariaLabel = input<string>();
}
