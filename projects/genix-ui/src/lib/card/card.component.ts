import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/** `flat` drops the shadow; `elevated` is the default surface. */
export type GmCardVariant = 'elevated' | 'flat';

/** `none` hands padding control to the projected content. */
export type GmCardPadding = 'default' | 'none';

/**
 * Surface container. Content is projected, so the card never dictates what goes
 * inside it.
 *
 * ```html
 * <gm-card header="Authorization">
 *   <p>…</p>
 * </gm-card>
 * ```
 *
 * A rich header can be projected instead of using the `header` input:
 * `<div gmCardHeader>…</div>`.
 */
@Component({
  selector: 'gm-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-card-host',
    '[class.gm-card-host--flat]': "variant() === 'flat'",
    '[class.gm-card-host--flush]': "padding() === 'none'",
    '[class.gm-card-host--interactive]': 'interactive()',
  },
})
export class GmCardComponent {
  readonly header = input<string>();

  readonly subheader = input<string>();

  readonly variant = input<GmCardVariant>('elevated');

  readonly padding = input<GmCardPadding>('default');

  /**
   * Adds the hover affordance for a card that behaves as a control. It does not
   * make the card focusable — a non-interactive container must stay out of the
   * tab order, and an interactive one should contain a real button or link that
   * carries the semantics.
   */
  readonly interactive = input(false, { transform: booleanAttribute });
}
