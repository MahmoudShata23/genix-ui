import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  input,
  output,
} from '@angular/core';

import type { GmSeverity } from '../core/types';

/**
 * Compact pill for a label or a piece of metadata.
 *
 * ```html
 * <gm-chip label="Active" severity="success" />
 * ```
 *
 * Richer content can be projected instead of using `label`, which is how the
 * app's `title: value` chips are built.
 */
@Component({
  selector: 'gm-chip',
  standalone: true,
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-chip-host',
    '[class]': "'gm-chip-host--' + severity()",
    '[class.gm-chip-host--disabled]': 'disabled()',
  },
})
export class GmChipComponent {
  readonly label = input<string>();

  /** Icon CSS class, e.g. `"pi pi-user"`. */
  readonly icon = input<string>();

  readonly severity = input<GmSeverity>('secondary');

  readonly disabled = input(false, { transform: booleanAttribute });

  readonly ariaLabel = input<string>();

  /**
   * Renders a dismiss button. Added for the multiselect's chip display, which
   * is the first real need for it in this app.
   */
  readonly removable = input(false, { transform: booleanAttribute });

  /** Accessible name for the dismiss button. */
  readonly removeAriaLabel = input<string>('Remove');

  readonly remove = output<void>();

  protected onRemove(event: Event): void {
    // A chip often sits inside a clickable trigger; dismissing it must not also
    // activate whatever contains it.
    event.stopPropagation();
    this.remove.emit();
  }
}
