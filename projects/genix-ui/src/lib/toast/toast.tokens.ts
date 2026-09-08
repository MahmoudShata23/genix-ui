import { InjectionToken, Signal } from '@angular/core';

import type { GmResolvedToast } from './toast.types';

/** The slice of the service the host needs. */
export interface GmToastHost {
  readonly toasts: Signal<readonly GmResolvedToast[]>;
  dismiss(id: string): void;
}

/**
 * How the host reaches the live stack.
 *
 * Internal, and the reason it exists is the import graph: the service has to
 * name the container class in order to attach it, so the container must not
 * name the service back. Handing it this token through the per-host injector
 * keeps the dependency one-way — the same shape the dialog uses for its
 * ref and config.
 */
export const GM_TOAST_HOST = new InjectionToken<GmToastHost>('GM_TOAST_HOST');
