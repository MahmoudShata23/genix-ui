import { Component, signal } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GmSearchComponent } from './search.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmSearchComponent],
  template: `
    <gm-search
      [formControl]="term"
      label="Search"
      placeholder="Search users"
      [debounceMs]="debounceMs()"
      [loading]="loading()"
      [clearable]="clearable()"
      [error]="errorText"
      (search)="terms.push($event)"
    />
  `,
})
class HostComponent {
  readonly term = new FormControl('', Validators.required);
  readonly debounceMs = signal(400);
  readonly loading = signal(false);
  readonly clearable = signal(true);
  readonly terms: string[] = [];
  errorText = '';
}

describe('gm-search', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const input = () =>
    fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const spinner = () =>
    fixture.nativeElement.querySelector('.gm-search__spinner');
  const icon = () =>
    fixture.nativeElement.querySelector('.gm-search__icon--start');
  const clearButton = () =>
    fixture.nativeElement.querySelector(
      '.gm-search__clear',
    ) as HTMLButtonElement | null;

  /** One keystroke, through the real input event the CVA listens for. */
  const type = (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] })
      .compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a label wired to a generated id', () => {
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    expect(input().id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input().id);
  });

  it('renders the magnifier icon by default', () => {
    expect(icon()!.className).toContain('pi-search');
  });

  it('updates the bound control on every keystroke, ahead of the debounce', () => {
    type('a');
    expect(host.term.value).toBe('a');
    type('ab');
    expect(host.term.value).toBe('ab');
    // Nothing has been reported yet: `search` is on its own debounced clock.
    expect(host.terms).toEqual([]);
  });

  // ── debouncing ────────────────────────────────────────────────────────

  it('reports a run of keystrokes once, as the final term', fakeAsync(() => {
    for (const value of ['l', 'le', 'leb', 'leba']) {
      type(value);
      tick(50);
    }
    expect(host.terms).toEqual([]);

    tick(400);
    expect(host.terms).toEqual(['leba']);
  }));

  it('reports nothing until the term settles', fakeAsync(() => {
    type('ab');
    tick(399);
    expect(host.terms).toEqual([]);

    tick(1);
    expect(host.terms).toEqual(['ab']);
  }));

  it('reports every keystroke when debounceMs is zero', fakeAsync(() => {
    host.debounceMs.set(0);
    fixture.detectChanges();

    type('a');
    tick(0);
    type('ab');
    tick(0);

    expect(host.terms).toEqual(['a', 'ab']);
  }));

  it('does not report a term the last one already was', fakeAsync(() => {
    type('cara');
    tick(400);
    expect(host.terms).toEqual(['cara']);

    type('cara');
    tick(400);
    expect(host.terms).toEqual(['cara']);
  }));

  it('reports an emptied box, so the caller can drop the term', fakeAsync(() => {
    type('cara');
    tick(400);
    type('');
    tick(400);

    expect(host.terms).toEqual(['cara', '']);
  }));

  // ── pending indicator ────────────────────────────────────────────────────

  it('shows a spinner in the trailing slot while a term is settling', fakeAsync(() => {
    expect(spinner()).toBeNull();

    type('ca');
    fixture.detectChanges();
    expect(spinner()).toBeTruthy();
    // The magnifier is a fixed anchor, not a slot the spinner takes over.
    expect(icon()).toBeTruthy();

    tick(400);
    fixture.detectChanges();
    expect(spinner()).toBeNull();
  }));

  it('stops spinning even when the settled term is a duplicate', fakeAsync(() => {
    type('cara');
    tick(400);
    fixture.detectChanges();

    type('cara');
    fixture.detectChanges();
    expect(spinner()).toBeTruthy();

    tick(400);
    fixture.detectChanges();
    expect(spinner()).toBeNull();
    expect(host.terms).toEqual(['cara']);
  }));

  it('also spins while the consumer reports loading, independent of typing', () => {
    expect(spinner()).toBeNull();
    host.loading.set(true);
    fixture.detectChanges();
    expect(spinner()).toBeTruthy();

    host.loading.set(false);
    fixture.detectChanges();
    expect(spinner()).toBeNull();
  });

  // ── clear button ──────────────────────────────────────────────────────

  it('offers no clear action on an empty field', () => {
    expect(clearButton()).toBeNull();
  });

  it('clears the term and reports it once a value is present', fakeAsync(() => {
    type('cara');
    tick(400);
    fixture.detectChanges();
    expect(clearButton()).toBeTruthy();

    clearButton()!.click();
    fixture.detectChanges();

    expect(host.term.value).toBe('');
    expect(input().value).toBe('');
    tick(400);
    expect(host.terms).toEqual(['cara', '']);
  }));

  it('marks the control touched once cleared', fakeAsync(() => {
    type('cara');
    tick(400);
    fixture.detectChanges();
    expect(host.term.touched).toBeFalse();

    clearButton()!.click();
    expect(host.term.touched).toBeTrue();
  }));

  it('can be turned off', fakeAsync(() => {
    host.clearable.set(false);
    fixture.detectChanges();
    type('cara');
    tick(400);
    fixture.detectChanges();

    expect(clearButton()).toBeNull();
  }));

  // ── a11y / error state ────────────────────────────────────────────────

  it('links an explicit error message through aria-describedby', () => {
    host.errorText = 'Search term is required';
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector(
      '.gm-field__error',
    ) as HTMLElement;
    expect(error.textContent?.trim()).toBe('Search term is required');
    expect(input().getAttribute('aria-describedby')).toBe(error.id);
  });

  it('always renders the message row, so the field height stays fixed once an error appears', () => {
    expect(fixture.nativeElement.querySelector('.gm-field__message')).not.toBeNull();
  });
});
