import { Component, signal } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';

import { GmTableToolbarComponent } from './table-toolbar.component';

@Component({
  standalone: true,
  imports: [GmTableToolbarComponent],
  template: `
    <gm-table-toolbar
      [showSearch]="showSearch()"
      [(searchTerm)]="term"
      [searchDebounce]="debounce()"
      searchPlaceholder="Find a provider"
      (searchChange)="terms.push($event)"
    />
  `,
})
class SearchHost {
  readonly showSearch = signal(true);
  readonly term = signal('');
  readonly debounce = signal(400);
  readonly terms: string[] = [];
}

describe('gm-table-toolbar search', () => {
  let fixture: ComponentFixture<SearchHost>;
  let host: SearchHost;

  const box = () =>
    fixture.nativeElement.querySelector(
      '.gm-table-toolbar__search input',
    ) as HTMLInputElement | null;

  const spinner = () =>
    fixture.nativeElement.querySelector('.gm-input__spinner');

  const searchIcon = () =>
    fixture.nativeElement.querySelector('i.gm-input__icon--end');

  /** One keystroke, through the real input event the CVA listens for. */
  const type = (value: string) => {
    const input = box()!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchHost],
    }).compileComponents();
    fixture = TestBed.createComponent(SearchHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('is opt-in', () => {
    host.showSearch.set(false);
    fixture.detectChanges();
    expect(box()).toBeNull();
  });

  // ── Debouncing ──────────────────────────────────────────────────────────

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

  it('reports every keystroke when the debounce is zero', fakeAsync(() => {
    host.debounce.set(0);
    fixture.detectChanges();

    type('a');
    tick(0);
    type('ab');
    tick(0);

    expect(host.terms).toEqual(['a', 'ab']);
  }));

  // ── De-duplication ──────────────────────────────────────────────────────

  it('does not report a term the last one already was', fakeAsync(() => {
    type('cara');
    tick(400);
    expect(host.terms).toEqual(['cara']);

    // Re-typing the same word is a real thing to do — select-all, retype —
    // and must not cost a second request.
    type('cara');
    tick(400);
    expect(host.terms).toEqual(['cara']);
  }));

  it('does not report a term edited and reverted inside one window', fakeAsync(() => {
    type('cara');
    tick(400);

    type('caraX');
    tick(50);
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

  // ── The pending indicator ───────────────────────────────────────────────

  it('swaps the search icon for a spinner while a term is settling', fakeAsync(() => {
    expect(searchIcon()).toBeTruthy();
    expect(spinner()).toBeNull();

    type('ca');
    expect(spinner()).toBeTruthy();
    expect(searchIcon()).toBeNull();

    tick(400);
    fixture.detectChanges();
    expect(spinner()).toBeNull();
    expect(searchIcon()).toBeTruthy();
  }));

  // The spinner is cleared before the de-duplication step, not after it. Were
  // it after, a term that turns out to be a duplicate would emit nothing and
  // leave the field spinning for good.
  it('stops spinning even when the settled term is a duplicate', fakeAsync(() => {
    type('cara');
    tick(400);
    fixture.detectChanges();

    type('cara');
    expect(spinner()).toBeTruthy();

    tick(400);
    fixture.detectChanges();
    expect(spinner()).toBeNull();
    expect(host.terms).toEqual(['cara']);
  }));

  // ── Seeding and resetting ───────────────────────────────────────────────

  it('seeds the box from searchTerm without reporting it', fakeAsync(() => {
    host.term.set('restored');
    fixture.detectChanges();
    // ngModel pushes the new value to the control on a microtask, so the
    // element only shows it on the pass after that has been flushed.
    tick(400);
    fixture.detectChanges();

    expect(box()!.value).toBe('restored');
    expect(host.terms).toEqual([]);
  }));

  it('lets the host clear the box after the user has typed', fakeAsync(() => {
    type('typed');
    tick(400);
    expect(box()!.value).toBe('typed');

    // The point of the two-way binding: the host's copy tracked the typing,
    // so clearing it is a real change the box has to follow. Under a one-way
    // input this set would be '' over '' — a no-op leaving 'typed' on screen.
    expect(host.term()).toBe('typed');

    host.term.set('');
    fixture.detectChanges();
    tick(400);
    fixture.detectChanges();

    expect(box()!.value).toBe('');
  }));
});
