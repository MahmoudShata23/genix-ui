import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { GmToastService } from './toast.service';
import { GM_TOAST_DEFAULTS } from './toast.types';

describe('GmToastService', () => {
  let toast: GmToastService;
  let overlayContainer: HTMLElement;
  let appRef: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    toast = TestBed.inject(GmToastService);
    appRef = TestBed.inject(ApplicationRef);
    overlayContainer = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => {
    toast.clear();
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  /** The host is attached outside any fixture, so the app-level tick renders it. */
  function render(): void {
    appRef.tick();
  }

  function toastElements(): HTMLElement[] {
    return Array.from(overlayContainer.querySelectorAll<HTMLElement>('.gm-toast'));
  }

  function detailsOf(): string[] {
    return Array.from(
      overlayContainer.querySelectorAll<HTMLElement>('.gm-toast__detail'),
    ).map((node) => node.textContent!.trim());
  }

  it('shows a success toast', () => {
    toast.success('Saved successfully');
    render();

    const element = toastElements()[0];
    expect(element.classList).toContain('gm-toast--success');
    expect(detailsOf()).toEqual(['Saved successfully']);
    expect(element.querySelector('.gm-toast__icon')!.className).toContain(
      'pi-check-circle',
    );
    // Non-interruptive: it inherits the polite region rather than alerting.
    expect(element.getAttribute('role')).toBeNull();
  });

  it('shows an error toast as danger, and alerts', () => {
    toast.error('Something went wrong');
    render();

    const element = toastElements()[0];
    expect(element.classList).toContain('gm-toast--danger');
    expect(element.getAttribute('role')).toBe('alert');
  });

  it('renders a summary above the detail when given one', () => {
    toast.show({ severity: 'success', summary: 'Success', detail: 'Saved' });
    render();

    expect(
      overlayContainer.querySelector('.gm-toast__summary')!.textContent!.trim(),
    ).toBe('Success');
    expect(detailsOf()).toEqual(['Saved']);
  });

  it('accepts PrimeNG severity spellings', () => {
    toast.show({ severity: 'error', detail: 'Failed' });
    toast.show({ severity: 'warn', detail: 'Check the data' });
    render();

    const [first, second] = toastElements();
    expect(first.classList).toContain('gm-toast--danger');
    expect(second.classList).toContain('gm-toast--warning');
  });

  it('stacks multiple toasts in arrival order', () => {
    toast.info('First');
    toast.warning('Second');
    toast.error('Third');
    render();

    expect(detailsOf()).toEqual(['First', 'Second', 'Third']);
  });

  it('exposes an accessible live region', () => {
    toast.info('Updated');
    render();

    const region = overlayContainer.querySelector('.gm-toast-region')!;
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    // `role="status"` implies atomic; the whole stack must not be re-read.
    expect(region.getAttribute('aria-atomic')).toBe('false');
    expect(region.getAttribute('aria-relevant')).toBe('additions');
  });

  it('auto dismisses after the default duration', fakeAsync(() => {
    toast.success('Saved');
    render();
    expect(toastElements().length).toBe(1);

    tick(4999);
    render();
    expect(toastElements().length).toBe(1);

    tick(1);
    render();
    expect(toastElements().length).toBe(0);
  }));

  it('honours a per-message duration override', fakeAsync(() => {
    toast.success('Quick', { duration: 1000 });
    toast.error('Sticky', { duration: 0 });
    render();

    tick(1000);
    render();
    expect(detailsOf()).toEqual(['Sticky']);

    // A zero duration means no timer at all, so it outlives any wait.
    tick(60_000);
    render();
    expect(detailsOf()).toEqual(['Sticky']);
  }));

  it('dismisses manually by id and from the close button', fakeAsync(() => {
    const id = toast.info('By id');
    toast.info('By button');
    render();

    toast.dismiss(id);
    render();
    expect(detailsOf()).toEqual(['By button']);

    overlayContainer
      .querySelector<HTMLButtonElement>('.gm-toast__close button')!
      .click();
    render();
    expect(toastElements().length).toBe(0);

    // The dismissed toasts must not have left timers behind.
    tick(10_000);
  }));

  it('omits the close button when closable is false', () => {
    toast.info('Silent', { closable: false });
    render();

    expect(overlayContainer.querySelector('.gm-toast__close')).toBeNull();
  });

  it('clears everything, timers included', fakeAsync(() => {
    toast.success('One');
    toast.error('Two', { duration: 0 });
    toast.info('Three');
    render();
    expect(toastElements().length).toBe(3);

    toast.clear();
    render();
    expect(toastElements().length).toBe(0);
    expect(overlayContainer.querySelector('.gm-toast-region')).toBeNull();

    // A pending timer surviving `clear()` would make fakeAsync fail here.
    tick(10_000);
  }));

  it('replaces a toast reused under the same id instead of stacking it', fakeAsync(() => {
    toast.show({ id: 'sync', severity: 'info', detail: 'Syncing' });
    toast.show({ id: 'sync', severity: 'success', detail: 'Synced' });
    render();

    expect(detailsOf()).toEqual(['Synced']);

    // The first toast's timer was cleared, so only one dismissal is pending.
    tick(5000);
    render();
    expect(toastElements().length).toBe(0);
    tick(10_000);
  }));

  it('supports notifications in sequence, re-creating the host each time', fakeAsync(() => {
    toast.success('First');
    render();
    expect(detailsOf()).toEqual(['First']);

    tick(5000);
    render();
    expect(overlayContainer.querySelector('.gm-toast-region')).toBeNull();

    toast.error('Second');
    render();
    expect(detailsOf()).toEqual(['Second']);

    tick(5000);
    render();
    expect(toastElements().length).toBe(0);
  }));

  it('leaves no timer pending once the last toast is gone', fakeAsync(() => {
    toast.success('One');
    toast.info('Two');
    render();

    tick(5000);
    render();
    expect(toastElements().length).toBe(0);
    // fakeAsync throws on teardown if a timer is still queued.
  }));
});

describe('GmToastService with GM_TOAST_DEFAULTS', () => {
  let toast: GmToastService;
  let overlayContainer: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GM_TOAST_DEFAULTS,
          useValue: { position: 'bottom-center', duration: 200 },
        },
      ],
    });
    toast = TestBed.inject(GmToastService);
    overlayContainer = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => {
    toast.clear();
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('applies the configured position and duration', fakeAsync(() => {
    toast.info('Configured');
    TestBed.inject(ApplicationRef).tick();

    expect(
      overlayContainer.querySelector('.gm-toast-region')!.classList,
    ).toContain('gm-toast-region--bottom-center');

    tick(200);
    TestBed.inject(ApplicationRef).tick();
    expect(overlayContainer.querySelectorAll('.gm-toast').length).toBe(0);
  }));
});
