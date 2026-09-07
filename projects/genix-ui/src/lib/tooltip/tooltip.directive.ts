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
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    /* focusin/focusout rather than focus/blur: they bubble, so the tooltip also
       responds when the focusable element is nested inside the host. */
    '(focusin)': 'show()',
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

  protected show(): void {
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
  }

  protected hide(): void {
    this.destroy();
  }

  private destroy(): void {
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
