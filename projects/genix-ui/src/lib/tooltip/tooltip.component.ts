import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The tooltip bubble itself. Rendered into a CDK overlay by `GmTooltipDirective`
 * and never used directly, but it owns its own template and styles so the
 * appearance stays inside the component that draws it.
 */
@Component({
  selector: 'gm-tooltip',
  standalone: true,
  template: `<div class="gm-tooltip" role="tooltip" [attr.id]="tooltipId()">
    {{ content() }}
  </div>`,
  styleUrl: './tooltip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GmTooltipComponent {
  readonly content = input<string>();
  readonly tooltipId = input<string>();
}
