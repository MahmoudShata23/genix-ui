import { NgTemplateOutlet } from '@angular/common';
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
import type { GmMenuItem } from './menu.types';

/**
 * List of commands, shown either as a popup anchored to whatever opened it or
 * inline in the page.
 *
 * ```html
 * <gm-button icon="pi pi-ellipsis-v" (onClick)="menu.toggle($event)" />
 * <gm-menu #menu [items]="items" />
 * ```
 *
 * Entries are real `<button>` elements inside a `role="menu"`, so activation,
 * the disabled state and focus all come from the platform; the arrow keys move
 * DOM focus, which is the ARIA menu pattern. The overlay, its positioning and
 * its outside-click handling come from the shared `GmOverlayPanel`.
 */
@Component({
  selector: 'gm-menu',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-menu-host',
    '[class.gm-menu-host--popup]': 'popup()',
  },
})
export class GmMenuComponent {
  readonly items = input<readonly GmMenuItem[]>([]);

  /** `false` renders the list in place instead of in an overlay. */
  readonly popup = input(true, { transform: booleanAttribute });

  /** Accessible name for the menu. */
  readonly ariaLabel = input<string>();

  readonly onShow = output<void>();

  readonly onHide = output<void>();

  readonly menuId = gmUniqueId('gm-menu');

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayPanel = gmOverlayPanel();
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  private readonly opened = signal(false);

  private anchor: HTMLElement | null = null;

  readonly isOpen = computed(() => this.opened());

  show(target?: Element | Event | null): void {
    if (!this.popup() || this.opened()) {
      return;
    }

    this.anchor = this.resolveAnchor(target);
    this.overlayPanel.open(this.panel(), () => this.hide(), {
      origin: this.anchor,
      minWidth: 12 * 16,
    });
    this.opened.set(true);
    this.onShow.emit();
    this.focusItem(0);
  }

  hide(): void {
    if (!this.opened()) {
      return;
    }
    this.overlayPanel.close();
    this.opened.set(false);
    // Focus returns to whatever opened the menu.
    this.anchor?.focus();
    this.anchor = null;
    this.onHide.emit();
  }

  toggle(target?: Element | Event | null): void {
    this.opened() ? this.hide() : this.show(target);
  }

  protected run(item: GmMenuItem): void {
    if (item.disabled || item.separator) {
      return;
    }
    // Closing first so a command that opens something else is not fighting a
    // menu that is still on screen.
    this.hide();
    item.command?.(item);
  }

  /**
   * Arrow keys move focus between entries, wrapping at both ends; Home and End
   * jump to the extremes. Enter and Space are the platform's own button
   * activation, so they need no handling here.
   */
  protected onMenuKeydown(event: KeyboardEvent): void {
    const buttons = this.itemButtons();
    if (!buttons.length) {
      return;
    }
    const current = buttons.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusItem((current + 1 + buttons.length) % buttons.length);
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.focusItem((current - 1 + buttons.length) % buttons.length);
        return;
      case 'Home':
        event.preventDefault();
        this.focusItem(0);
        return;
      case 'End':
        event.preventDefault();
        this.focusItem(buttons.length - 1);
        return;
      case 'Escape':
        if (this.opened()) {
          event.preventDefault();
          this.hide();
        }
        return;
      default:
        return;
    }
  }

  /** The rendered, enabled entries — in the overlay when popped up. */
  private itemButtons(): HTMLElement[] {
    const root = this.popup()
      ? this.overlayPanel.panelElement
      : this.hostRef.nativeElement;
    return Array.from(
      root?.querySelectorAll<HTMLElement>(
        '.gm-menu__item:not([disabled])',
      ) ?? [],
    );
  }

  /**
   * Deferred on open, because the entries only exist after the panel renders.
   * Called synchronously from a key handler, where they already do.
   */
  private focusItem(index: number): void {
    const focus = () => this.itemButtons()[index]?.focus();
    if (this.itemButtons().length) {
      focus();
      return;
    }
    requestAnimationFrame(focus);
  }

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
