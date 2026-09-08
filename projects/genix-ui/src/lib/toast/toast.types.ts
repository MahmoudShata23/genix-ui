import { InjectionToken } from '@angular/core';

import type { GmSeverity } from '../core/types';

/**
 * The four severities a toast can carry — the library-wide `GmSeverity`
 * narrowed to the ones that mean something as a notification. `primary`,
 * `secondary` and `contrast` are visual weights, not outcomes, so they are not
 * offered here.
 */
export type GmToastSeverity = Extract<
  GmSeverity,
  'success' | 'info' | 'warning' | 'danger'
>;

/**
 * What `show()` accepts. `error` and `warn` are PrimeNG's spellings, kept as
 * accepted aliases so a `messageService.add({ severity: 'error', … })` call
 * migrates by renaming the service and nothing else; both are normalised to the
 * Genix names (`danger`, `warning`) on the way in.
 */
export type GmToastSeverityInput = GmToastSeverity | 'error' | 'warn';

/**
 * One notification.
 *
 * ```ts
 * toastService.show({
 *   severity: 'success',
 *   summary: 'Success',
 *   detail: 'Saved successfully',
 * });
 * ```
 */
export interface GmToastMessage {
  /** Supply one to dismiss this toast later; otherwise the service assigns it. */
  id?: string;

  severity: GmToastSeverityInput;

  /** Bold first line. Omit for a single-line toast. */
  summary?: string;

  /** The message itself. */
  detail: string;

  /**
   * Milliseconds before the toast dismisses itself. `0` (or negative) makes it
   * stick until dismissed — useful for an error the user must acknowledge.
   * Defaults to `GM_TOAST_DEFAULTS.duration`.
   */
  duration?: number;

  /** Show the dismiss button. Default `true`. */
  closable?: boolean;
}

/** Everything about a toast except what the convenience methods already know. */
export type GmToastOptions = Omit<GmToastMessage, 'severity' | 'detail'>;

/**
 * Where the stack sits. Resolved with logical properties, so `*-end` follows
 * the document direction: top-end is the top-right corner in LTR and the
 * top-left corner in RTL.
 */
export type GmToastPosition =
  | 'top-end'
  | 'top-center'
  | 'bottom-end'
  | 'bottom-center';

/** Package-level toast settings. */
export interface GmToastDefaults {
  /** Default `top-end`. */
  position?: GmToastPosition;

  /** Default `5000`. */
  duration?: number;
}

/**
 * Override the toast defaults for an application:
 *
 * ```ts
 * provideAppInitializer // …or anywhere in the app's providers
 * { provide: GM_TOAST_DEFAULTS, useValue: { position: 'bottom-center' } }
 * ```
 */
export const GM_TOAST_DEFAULTS = new InjectionToken<GmToastDefaults>(
  'GM_TOAST_DEFAULTS',
  { providedIn: 'root', factory: () => ({}) },
);

/**
 * A toast once the service has settled its defaults — the shape of the
 * entries in `GmToastService.toasts`. Every field is decided, so the host
 * renders it without re-deriving a single fallback.
 */
export interface GmResolvedToast {
  readonly id: string;
  readonly severity: GmToastSeverity;
  readonly summary?: string;
  readonly detail: string;
  readonly duration: number;
  readonly closable: boolean;
}
