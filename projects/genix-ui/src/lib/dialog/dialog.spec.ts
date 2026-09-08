import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';

import { GmDialogConfig } from './dialog.config';
import { GmDialogRef } from './dialog-ref';
import { GmDialogService } from './dialog.service';

interface Payload {
  name: string;
}

interface Result {
  saved: boolean;
}

/**
 * Written the way a migrated PrimeNG dialog is written — constructor injection
 * of the ref and the config, `config.data` in, `ref.close(result)` out. If this
 * shape ever stops compiling or resolving, the migration story is broken.
 */
@Component({
  standalone: true,
  template: `
    <p class="content">{{ config.data?.name }}</p>
    <button class="save" (click)="ref.close({ saved: true })">Save</button>
  `,
})
class ContentComponent {
  constructor(
    public ref: GmDialogRef<Result, Payload>,
    public config: GmDialogConfig<Payload>,
  ) {}
}

describe('GmDialogService', () => {
  let dialog: GmDialogService;
  let overlayContainer: HTMLElement;
  let appRef: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ContentComponent] });
    dialog = TestBed.inject(GmDialogService);
    appRef = TestBed.inject(ApplicationRef);
    overlayContainer = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  /**
   * The dialog is attached outside any fixture, so the application-level tick
   * is the one that renders it.
   */
  function render(): void {
    appRef.tick();
  }

  function query<T extends HTMLElement>(selector: string): T | null {
    return overlayContainer.querySelector<T>(selector);
  }

  function dispatchEscape(): void {
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    // `keyCode` is not writable through the constructor, and the CDK reads it.
    Object.defineProperty(event, 'keyCode', { get: () => 27 });
    document.body.dispatchEvent(event);
  }

  it('renders the component with its data, header and close button', () => {
    dialog.open(ContentComponent, {
      header: 'Edit User',
      data: { name: 'Amira' },
      width: '600px',
    });
    render();

    expect(query('.content')!.textContent!.trim()).toBe('Amira');
    expect(query('.gm-dialog__title')!.textContent!.trim()).toBe('Edit User');
    expect(query('.gm-dialog__close')).not.toBeNull();
    expect(query<HTMLElement>('.gm-dialog')!.style.width).toBe('600px');
  });

  it('names the dialog by its header for assistive technology', () => {
    dialog.open(ContentComponent, { header: 'Edit User' });
    render();

    const panel = query<HTMLElement>('.gm-dialog')!;
    const title = query<HTMLElement>('.gm-dialog__title')!;

    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.id).toBeTruthy();
  });

  it('falls back to ariaLabel when there is no header', () => {
    dialog.open(ContentComponent, { ariaLabel: 'User editor' });
    render();

    const panel = query<HTMLElement>('.gm-dialog')!;
    expect(panel.getAttribute('aria-label')).toBe('User editor');
    expect(panel.getAttribute('aria-labelledby')).toBeNull();
  });

  it('emits the result on onClose exactly once, then completes', () => {
    const ref = dialog.open<ContentComponent, Payload, Result>(
      ContentComponent,
      { data: { name: 'Amira' } },
    );
    render();

    const results: (Result | undefined)[] = [];
    let completed = false;
    ref.onClose.subscribe({
      next: (result) => results.push(result),
      complete: () => (completed = true),
    });

    ref.close({ saved: true });
    ref.close({ saved: false });

    expect(results).toEqual([{ saved: true }]);
    expect(completed).toBeTrue();
    expect(ref.isClosed).toBeTrue();
    expect(query('.gm-dialog')).toBeNull();
  });

  it('closes from inside the content component', () => {
    const ref = dialog.open<ContentComponent, Payload, Result>(ContentComponent);
    render();

    let result: Result | undefined;
    ref.onClose.subscribe((value) => (result = value));

    query<HTMLButtonElement>('.save')!.click();

    expect(result).toEqual({ saved: true });
    expect(query('.gm-dialog')).toBeNull();
  });

  it('closes on the header close button', () => {
    const ref = dialog.open(ContentComponent, { header: 'Edit User' });
    render();

    query<HTMLButtonElement>('.gm-dialog__close button')!.click();

    expect(ref.isClosed).toBeTrue();
    expect(query('.gm-dialog')).toBeNull();
  });

  it('closes on Escape, and does not when closeOnEscape is off', () => {
    const closable = dialog.open(ContentComponent);
    render();
    dispatchEscape();
    expect(closable.isClosed).toBeTrue();

    const pinned = dialog.open(ContentComponent, { closeOnEscape: false });
    render();
    dispatchEscape();
    expect(pinned.isClosed).toBeFalse();

    pinned.close();
  });

  it('closes on a backdrop click only when dismissableMask is set', () => {
    const pinned = dialog.open(ContentComponent);
    render();
    query<HTMLElement>('.gm-dialog-backdrop')!.click();
    expect(pinned.isClosed).toBeFalse();
    pinned.close();

    const dismissable = dialog.open(ContentComponent, {
      dismissableMask: true,
    });
    render();
    query<HTMLElement>('.gm-dialog-backdrop')!.click();
    expect(dismissable.isClosed).toBeTrue();
  });

  it('ignores a click that started inside the dialog', () => {
    const ref = dialog.open(ContentComponent, { dismissableMask: true });
    render();

    query<HTMLElement>('.gm-dialog')!.click();

    expect(ref.isClosed).toBeFalse();
    ref.close();
  });

  it('moves focus into the dialog and restores it on close', fakeAsync(() => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const ref = dialog.open(ContentComponent, { header: 'Edit User' });
    render();
    flush();

    const panel = query<HTMLElement>('.gm-dialog')!;
    expect(panel.contains(document.activeElement)).toBeTrue();

    ref.close();
    flush();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  }));

  it('gives each dialog its own ref and config', () => {
    const first = dialog.open(ContentComponent, { data: { name: 'Amira' } });
    const second = dialog.open(ContentComponent, { data: { name: 'Karim' } });
    render();

    const names = Array.from(overlayContainer.querySelectorAll('.content')).map(
      (node) => node.textContent!.trim(),
    );
    expect(names).toEqual(['Amira', 'Karim']);
    expect(first.data).toEqual({ name: 'Amira' });
    expect(second.data).toEqual({ name: 'Karim' });

    first.close();
    render();

    expect(second.isClosed).toBeFalse();
    expect(overlayContainer.querySelectorAll('.gm-dialog').length).toBe(1);

    second.close();
  });

  it('supports opening dialogs in sequence', () => {
    const first = dialog.open<ContentComponent, Payload, Result>(
      ContentComponent,
      { data: { name: 'Amira' } },
    );
    render();

    let second: GmDialogRef<Result, Payload> | undefined;
    first.onClose.subscribe(() => {
      second = dialog.open<ContentComponent, Payload, Result>(ContentComponent, {
        data: { name: 'Karim' },
      });
    });

    first.close({ saved: true });
    render();

    expect(overlayContainer.querySelectorAll('.gm-dialog').length).toBe(1);
    expect(query('.content')!.textContent!.trim()).toBe('Karim');

    second!.close();
    expect(query('.gm-dialog')).toBeNull();
  });

  it('applies panelClass and the sizing config', () => {
    dialog.open(ContentComponent, {
      panelClass: ['wide', 'tall'],
      height: '400px',
      maxWidth: '90vw',
      maxHeight: '80vh',
    });
    render();

    const panel = query<HTMLElement>('.gm-dialog')!;
    expect(panel.classList).toContain('wide');
    expect(panel.classList).toContain('tall');
    expect(panel.style.height).toBe('400px');
    expect(panel.style.maxWidth).toBe('90vw');
    expect(panel.style.maxHeight).toBe('80vh');
  });

  it('drops the header row when there is nothing to put in it', () => {
    dialog.open(ContentComponent, { closable: false });
    render();

    expect(query('.gm-dialog__header')).toBeNull();
    expect(query('.content')).not.toBeNull();
  });
});
