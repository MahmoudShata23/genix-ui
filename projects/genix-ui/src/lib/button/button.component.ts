import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';

import type {
  GmButtonIconPosition,
  GmButtonSeverity,
  GmButtonSize,
  GmButtonType,
  GmButtonVariant,
} from './button.types';

/**
 * Design-system button.
 *
 * Renders a real `<button>`, so keyboard activation (Enter/Space), focus order,
 * form submission and the disabled state are all native browser behaviour —
 * nothing is re-implemented.
 *
 * ```html
 * <gm-button label="Save" severity="primary" (onClick)="save()" />
 * <gm-button icon="pi pi-pencil" ariaLabel="Edit" variant="text" />
 * ```
 */
@Component({
  selector: 'gm-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-button-host',
    '[class.gm-button-host--full-width]': 'fullWidth()',
  },
})
export class GmButtonComponent {
  /** Visible text. Omit for an icon-only button (then set `ariaLabel`). */
  readonly label = input<string>();

  /** Icon CSS class, e.g. `"pi pi-check"` or `"material-icons"` content class. */
  readonly icon = input<string>();

  readonly iconPosition = input<GmButtonIconPosition>('left');

  readonly severity = input<GmButtonSeverity>('primary');

  readonly variant = input<GmButtonVariant>('filled');

  readonly size = input<GmButtonSize>('medium');

  /** Swaps the icon for a spinner and blocks activation. */
  readonly loading = input(false, { transform: booleanAttribute });

  readonly disabled = input(false, { transform: booleanAttribute });

  /** Stretches the button to the width of its container. */
  readonly fullWidth = input(false, { transform: booleanAttribute });

  readonly type = input<GmButtonType>('button');

  /** Accessible name. Required when there is no `label` (icon-only button). */
  readonly ariaLabel = input<string>();

  /** Named `onClick` to keep `<p-button>` templates copy-pasteable. */
  readonly onClick = output<MouseEvent>();

  private readonly nativeButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('native');

  protected readonly stateClasses = computed(() => [
    `gm-button--${this.severity()}`,
    `gm-button--${this.variant()}`,
    `gm-button--${this.size()}`,
    ...(this.loading() ? ['gm-button--loading'] : []),
    ...(!this.label() && this.icon() ? ['gm-button--icon-only'] : []),
  ]);

  /**
   * Emitted as `aria-label`. An icon-only button has no text node so it needs
   * an explicit name; with a label present the label already names the button,
   * and the attribute is dropped rather than shadowing it.
   */
  protected readonly resolvedAriaLabel = computed(() => this.ariaLabel() ?? null);

  /** Moves focus to the button — for callers wiring up validation feedback. */
  focus(): void {
    this.nativeButton().nativeElement.focus();
  }

  protected handleClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      return;
    }
    this.onClick.emit(event);
  }
}
