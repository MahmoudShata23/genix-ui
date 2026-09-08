import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DestroyRef, Injectable, Injector, inject, signal } from '@angular/core';

import { gmUniqueId } from '../core/unique-id';
import { GmToastContainerComponent } from './toast-container.component';
import { GM_TOAST_HOST } from './toast.tokens';
import {
  GM_TOAST_DEFAULTS,
  GmResolvedToast,
  GmToastMessage,
  GmToastOptions,
  GmToastSeverity,
  GmToastSeverityInput,
} from './toast.types';

/** Used when neither the message nor `GM_TOAST_DEFAULTS` says otherwise. */
const FALLBACK_DURATION = 5000;

/** PrimeNG's severity spellings, mapped to the Genix ones. */
const SEVERITY_ALIASES: Record<GmToastSeverityInput, GmToastSeverity> = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  warn: 'warning',
  error: 'danger',
};

/**
 * Shows toast notifications.
 *
 * ```ts
 * this.toastService.success('Saved successfully');
 * this.toastService.error('Something went wrong');
 * this.toastService.show({ severity: 'success', summary: 'Success', detail: 'Saved' });
 * ```
 *
 * There is nothing to add to a template: the first toast creates the one host
 * that renders the stack, and it is torn down again when the last toast goes.
 * So a consuming application injects this service and that is the whole
 * integration — no `<gm-toast>` per page, and no host to forget.
 */
@Injectable({ providedIn: 'root' })
export class GmToastService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly defaults = inject(GM_TOAST_DEFAULTS);

  private readonly items = signal<readonly GmResolvedToast[]>([]);

  /** One timer per toast id — the map is what makes a duplicate impossible. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  private overlayRef: OverlayRef | null = null;

  /** The live stack, read by the container. */
  readonly toasts = this.items.asReadonly();

  constructor() {
    // An application teardown must not leave timers pending.
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  /**
   * Shows `message`, applying the defaults for anything it leaves out.
   *
   * @returns The toast's id, for `dismiss()`.
   */
  show(message: GmToastMessage): string {
    const duration = message.duration ?? this.defaults.duration ?? FALLBACK_DURATION;
    const toast: GmResolvedToast = {
      id: message.id ?? gmUniqueId('gm-toast'),
      severity: SEVERITY_ALIASES[message.severity] ?? 'info',
      summary: message.summary,
      detail: message.detail,
      closable: message.closable ?? true,
      duration,
    };

    // Re-showing an id replaces the toast rather than stacking a second copy,
    // so its pending timer has to go with it.
    this.clearTimer(toast.id);
    this.items.update((items) => [
      ...items.filter((item) => item.id !== toast.id),
      toast,
    ]);
    this.attachHost();

    if (duration > 0) {
      this.timers.set(
        toast.id,
        setTimeout(() => this.dismiss(toast.id), duration),
      );
    }

    return toast.id;
  }

  /** @returns The toast's id, for `dismiss()`. */
  success(detail: string, options?: GmToastOptions): string {
    return this.show({ ...options, severity: 'success', detail });
  }

  /** @returns The toast's id, for `dismiss()`. */
  info(detail: string, options?: GmToastOptions): string {
    return this.show({ ...options, severity: 'info', detail });
  }

  /** @returns The toast's id, for `dismiss()`. */
  warning(detail: string, options?: GmToastOptions): string {
    return this.show({ ...options, severity: 'warning', detail });
  }

  /** Shown as `danger` — the Genix name for the same thing. */
  error(detail: string, options?: GmToastOptions): string {
    return this.show({ ...options, severity: 'danger', detail });
  }

  /** Removes one toast. Unknown ids are ignored. */
  dismiss(id: string): void {
    this.clearTimer(id);
    this.items.update((items) => items.filter((item) => item.id !== id));
    this.detachHostIfEmpty();
  }

  /** Removes every toast and every pending timer. */
  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.items.set([]);
    this.detachHostIfEmpty();
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * The host is created on the first toast and reused while any are showing.
   * The overlay is what puts it outside the app's stacking contexts, so a
   * toast is not clipped by whatever it was raised from.
   */
  private attachHost(): void {
    if (this.overlayRef) {
      return;
    }
    this.overlayRef = this.overlay.create();
    this.overlayRef.attach(
      new ComponentPortal(
        GmToastContainerComponent,
        null,
        Injector.create({
          parent: this.injector,
          providers: [
            {
              provide: GM_TOAST_HOST,
              useValue: {
                toasts: this.toasts,
                dismiss: (id: string) => this.dismiss(id),
              },
            },
          ],
        }),
      ),
    );
  }

  private detachHostIfEmpty(): void {
    if (this.items().length === 0) {
      this.overlayRef?.dispose();
      this.overlayRef = null;
    }
  }
}
