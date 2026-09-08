import {
  ConnectedPosition,
  Overlay,
  OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** Below the trigger, flipping above when there is no room. */
export const GM_PANEL_BELOW: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

/**
 * The one overlay engine for trigger-anchored panels (`gm-select`,
 * `gm-multiselect`, `gm-datepicker`).
 *
 * Owns the CDK overlay lifecycle and the outside-click handling, including the
 * detail that makes it work: the CDK reports clicks on the *trigger* as
 * "outside" (the trigger is not inside the overlay), so those are filtered out
 * — otherwise a click to close would race the trigger's own toggle and reopen
 * the panel immediately.
 *
 * Create it with `gmOverlayPanel()` from a field initialiser so the injection
 * context is available.
 */
export class GmOverlayPanel {
  private overlayRef: OverlayRef | null = null;

  /** What the open panel is anchored to and measured "outside" against. */
  private origin: HTMLElement | null = null;

  constructor(
    private readonly overlay: Overlay,
    private readonly viewContainer: ViewContainerRef,
    private readonly host: ElementRef<HTMLElement>,
    private readonly destroyRef: DestroyRef,
  ) {
    // A panel left attached after its trigger is destroyed would be orphaned.
    destroyRef.onDestroy(() => this.close());
  }

  get isOpen(): boolean {
    return this.overlayRef !== null;
  }

  /**
   * The overlay element while the panel is attached.
   *
   * For the rare caller that has to reach into the rendered panel: a view
   * query cannot see inside it, because the panel is an embedded view the
   * portal created, not one this component's own template did.
   */
  get panelElement(): HTMLElement | null {
    return this.overlayRef?.overlayElement ?? null;
  }

  /**
   * Attaches `template` under the host. `onOutsideClick` fires only for clicks
   * genuinely outside both the panel and the trigger.
   */
  open(
    template: TemplateRef<unknown>,
    onOutsideClick: () => void,
    options: { minWidth?: number | string; origin?: HTMLElement } = {},
  ): void {
    if (this.overlayRef) {
      return;
    }

    // A popover or menu is opened *by* something other than its own host, so
    // the anchor is a parameter; everything else defaults to the host.
    this.origin = options.origin ?? this.host.nativeElement;

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.origin)
        .withPositions(GM_PANEL_BELOW)
        .withFlexibleDimensions(false)
        .withPush(false),
      // Follows the trigger while the page scrolls rather than detaching.
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      minWidth: options.minWidth,
    });

    this.overlayRef.attach(new TemplatePortal(template, this.viewContainer));

    // Completes when the overlay is disposed; takeUntilDestroyed additionally
    // covers teardown while the panel is still open.
    //
    // Deliberately no `keydownEvents()` subscription: the CDK dispatches those
    // from the document, so it would double-handle every key the trigger has
    // already seen. Callers handle keys on the trigger and on the panel.
    this.overlayRef
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!this.origin?.contains(event.target as Node)) {
          onOutsideClick();
        }
      });
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.origin = null;
  }
}

/** Builds a `GmOverlayPanel` from the current injection context. */
export function gmOverlayPanel(): GmOverlayPanel {
  return new GmOverlayPanel(
    inject(Overlay),
    inject(ViewContainerRef),
    inject<ElementRef<HTMLElement>>(ElementRef),
    inject(DestroyRef),
  );
}
