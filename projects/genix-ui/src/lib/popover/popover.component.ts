import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { gmOverlayPanel } from '../core/overlay-panel';
import { gmUniqueId } from '../core/unique-id';

/**
 * Anchored content panel — a tooltip's big sibling, for content the user is
 * meant to read and interact with rather than glance at.
 *
 * ```html
 * <gm-button label="Open" (onClick)="popover.toggle($event)" />
 *
 * <gm-popover #popover>Popover content</gm-popover>
 * ```
 *
 * Positioning, outside-click detection and teardown all come from the shared
 * `GmOverlayPanel` — the same engine behind `gm-select` and `gm-datepicker`.
 * The panel anchors to whatever opened it, taken from the click event, so the
 * `<gm-popover>` element itself can sit anywhere in the template.
 */
@Component({
  selector: 'gm-popover',
  standalone: true,
  templateUrl: './popover.component.html',
  styleUrl: './popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-popover-host' },
})
export class GmPopoverComponent {
  /** Whether a click outside the panel closes it. */
  readonly dismissable = input(true, { transform: booleanAttribute });

  /** Accessible name for the panel. */
  readonly ariaLabel = input<string>();

  readonly onShow = output<void>();

  readonly onHide = output<void>();

  readonly panelId = gmUniqueId('gm-popover');

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayPanel = gmOverlayPanel();
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  private readonly opened = signal(false);

  /** Whichever element the panel is currently anchored to. */
  private anchor: HTMLElement | null = null;

  readonly isOpen = computed(() => this.opened());

  /**
   * Opens against `target` — an element, or the event whose `currentTarget`
   * opened it. Reopening against a different target moves the panel rather
   * than stacking a second one.
   */
  show(target?: Element | Event | null): void {
    const anchor = this.resolveAnchor(target);
    if (this.opened()) {
      if (anchor === this.anchor) {
        return;
      }
      this.hide();
    }

    this.anchor = anchor;
    this.overlayPanel.open(
      this.panel(),
      () => {
        if (this.dismissable()) {
          this.hide();
        }
      },
      { origin: anchor },
    );
    this.opened.set(true);
    this.onShow.emit();
    this.focusPanel();
  }

  hide(): void {
    if (!this.opened()) {
      return;
    }
    this.overlayPanel.close();
    this.opened.set(false);
    // Focus returns to whatever opened the panel, so a keyboard user is not
    // dropped at the top of the document.
    this.anchor?.focus();
    this.anchor = null;
    this.onHide.emit();
  }

  toggle(target?: Element | Event | null): void {
    this.opened() ? this.hide() : this.show(target);
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  }

  /**
   * Moves focus into the panel so its content is reachable and a screen reader
   * announces it. Deferred because the panel only exists once it renders.
   */
  private focusPanel(): void {
    requestAnimationFrame(() => {
      this.overlayPanel.panelElement
        ?.querySelector<HTMLElement>('.gm-popover')
        ?.focus();
    });
  }

  /**
   * `currentTarget` is the element the handler is bound to — the button —
   * rather than whatever child of it was actually clicked. With no target at
   * all the component's own host element anchors it.
   */
  private resolveAnchor(target?: Element | Event | null): HTMLElement {
    if (target instanceof Event) {
      const from = target.currentTarget ?? target.target;
      if (from instanceof HTMLElement) {
        return from;
      }
    }
    if (target instanceof HTMLElement) {
      return target;
    }
    return this.hostRef.nativeElement;
  }
}
