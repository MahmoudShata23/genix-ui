import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  Directive,
  ElementRef,
  booleanAttribute,
  inject,
  input,
} from '@angular/core';

import { gmUniqueId } from '../core/unique-id';
import { GmTooltipComponent } from './tooltip.component';
import type { GmTooltipPosition } from './tooltip.types';

/** Offset between host and bubble, in px. Matches the design system's space-2. */
const OFFSET = 8;

/**
 * Text tooltip on hover and keyboard focus.
 *
 * ```html
 * <button gmTooltip="Edit" tooltipPosition="top">Edit</button>
 * ```
 *
 * Positioning is delegated to the CDK overlay, which also handles flipping when
 * the preferred side does not fit — none of that is reimplemented here.
 *
 * No show/hide delays: no tooltip in this app uses them, so the extra timers
 * (and the teardown they need) would be unused complexity.
 */
@Directive({
  selector: '[gmTooltip]',
  standalone: true,
  host: {
    '(mouseenter)': 'show(true)',
    '(mouseleave)': 'hide()',
    /* focusin/focusout rather than focus/blur: they bubble, so the tooltip also
       responds when the focusable element is nested inside the host. */
    '(focusin)': 'show(false)',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
    '[attr.aria-describedby]': 'describedBy',
  },
})
export class GmTooltipDirective {
  /** Tooltip text. An empty value suppresses the tooltip entirely. */
  readonly content = input<string | null | undefined>('', {
    alias: 'gmTooltip',
  });

  readonly position = input<GmTooltipPosition>('top', {
    alias: 'tooltipPosition',
  });

  readonly disabled = input(false, {
    alias: 'tooltipDisabled',
    transform: booleanAttribute,
  });

  private readonly overlay = inject(Overlay);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly tooltipId = gmUniqueId('gm-tooltip');

  private overlayRef: OverlayRef | null = null;

  /**
   * Set while a mouse-opened tooltip is up. `mouseleave` alone is not enough:
   * it never arrives when the host is re-rendered or removed under the pointer,
   * or is a disabled button, and the bubble would be stranded on screen.
   */
  private readonly stopWatchingPointer = { fn: null as (() => void) | null };

  constructor() {
    // A tooltip left attached when its host disappears would hang on screen.
    inject(DestroyRef).onDestroy(() => this.destroy());
  }

  /**
   * Only advertise the tooltip to assistive technology while it is actually on
   * screen; a dangling `aria-describedby` would point at nothing.
   */
  protected get describedBy(): string | null {
    return this.overlayRef ? this.tooltipId : null;
  }

  protected show(viaMouse = false): void {
    if (this.disabled() || !this.content() || this.overlayRef) {
      return;
    }

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.host)
        .withPositions(this.positionPairs()),
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });

    const ref = this.overlayRef.attach(new ComponentPortal(GmTooltipComponent));
    ref.setInput('content', this.content() ?? '');
    ref.setInput('tooltipId', this.tooltipId);

    // The bubble must never take the pointer: a large one can land on the host,
    // and the resulting mouseleave would hide the very text being read.
    this.overlayRef.overlayElement.style.pointerEvents = 'none';

    if (viaMouse) {
      this.watchPointer();
    }
  }

  protected hide(): void {
    this.destroy();
  }

  private watchPointer(): void {
    const host = this.host.nativeElement;
    const check = (event: Event) => {
      const target = event.target;
      if (!host.isConnected || !(target instanceof Node) || !host.contains(target)) {
        this.hide();
      }
    };
    document.addEventListener('mouseover', check, true);
    window.addEventListener('blur', this.onWindowBlur);
    this.stopWatchingPointer.fn = () => {
      document.removeEventListener('mouseover', check, true);
      window.removeEventListener('blur', this.onWindowBlur);
    };
  }

  private readonly onWindowBlur = () => this.hide();

  private destroy(): void {
    this.stopWatchingPointer.fn?.();
    this.stopWatchingPointer.fn = null;
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }

  /**
   * The preferred side first, then the opposite side as the fallback the CDK
   * flips to when there is not enough room.
   */
  private positionPairs() {
    switch (this.position()) {
      case 'bottom':
        return [BOTTOM, TOP];
      case 'left':
        return [LEFT, RIGHT];
      case 'right':
        return [RIGHT, LEFT];
      default:
        return [TOP, BOTTOM];
    }
  }
}

const TOP = {
  originX: 'center',
  originY: 'top',
  overlayX: 'center',
  overlayY: 'bottom',
  offsetY: -OFFSET,
} as const;

const BOTTOM = {
  originX: 'center',
  originY: 'bottom',
  overlayX: 'center',
  overlayY: 'top',
  offsetY: OFFSET,
} as const;

const LEFT = {
  originX: 'start',
  originY: 'center',
  overlayX: 'end',
  overlayY: 'center',
  offsetX: -OFFSET,
} as const;

const RIGHT = {
  originX: 'end',
  originY: 'center',
  overlayX: 'start',
  overlayY: 'center',
  offsetX: OFFSET,
} as const;
