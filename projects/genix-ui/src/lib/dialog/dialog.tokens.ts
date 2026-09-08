import { ComponentType } from '@angular/cdk/portal';
import { InjectionToken } from '@angular/core';

/**
 * The component the container should render inside itself.
 *
 * Internal. Passed through the per-dialog injector rather than through an
 * input or a setter so the container has it during construction — which lets
 * the content portal be built once, in a field initialiser, instead of being
 * assigned into the view after the fact.
 */
export const GM_DIALOG_CONTENT = new InjectionToken<ComponentType<unknown>>(
  'GM_DIALOG_CONTENT',
);
