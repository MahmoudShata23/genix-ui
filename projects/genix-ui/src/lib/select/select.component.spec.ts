import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GmSelectComponent } from './select.component';

interface Country {
  id: number;
  name: string;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmSelectComponent],
  template: `
    <gm-select
      class="objects"
      [formControl]="countryId"
      label="Country"
      placeholder="Select country"
      [options]="countries()"
      optionLabel="name"
      optionValue="id"
      [filter]="true"
      [clearable]="true"
    />
    <gm-select
      class="primitives"
      [formControl]="status"
      [options]="['Active', 'Inactive']"
      placeholder="Pick"
    />
    <gm-select class="loading" [options]="[]" [loading]="true" />
  `,
})
class HostComponent {
  readonly countries = signal<Country[]>([
    { id: 1, name: 'Egypt' },
    { id: 2, name: 'UAE' },
    { id: 3, name: 'Jordan' },
  ]);
  readonly countryId = new FormControl<number | null>(null, Validators.required);
  readonly status = new FormControl<string | null>(null);
}

describe('gm-select', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const trigger = (sel = '.objects') =>
    fixture.nativeElement.querySelector(
      `${sel} .gm-dropdown__trigger`,
    ) as HTMLButtonElement;
  const panel = () =>
    document.querySelector('.cdk-overlay-container .gm-dropdown__panel');
  const optionEls = () =>
    Array.from(
      document.querySelectorAll('.cdk-overlay-container [role="option"]'),
    ) as HTMLElement[];
  const filterInput = () =>
    document.querySelector(
      '.cdk-overlay-container .gm-dropdown__filter-input',
    ) as HTMLInputElement;

  const press = (key: string, target?: HTMLElement) => {
    (target ?? trigger()).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Any panel still attached would leak into the next spec's queries.
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
  });

  // ── structure / a11y ──────────────────────────────────────────────────

  it('renders a combobox wired to its label and hint/error ids', () => {
    const label = fixture.nativeElement.querySelector(
      '.objects label',
    ) as HTMLLabelElement;
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(label.getAttribute('for')).toBe(trigger().id);
    expect(trigger().id).toBeTruthy();
  });

  it('gives each instance a distinct generated id', () => {
    expect(trigger('.objects').id).not.toBe(trigger('.primitives').id);
  });

  it('shows the placeholder until a value exists', () => {
    expect(
      fixture.nativeElement.querySelector('.objects .gm-dropdown__placeholder')
        .textContent,
    ).toContain('Select country');
  });

  // ── open / close ──────────────────────────────────────────────────────

  it('opens on click and links the listbox through aria-controls', () => {
    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(
      panel()!.querySelector('[role="listbox"]')!.id,
    );
  });

  it('closes on a second click', () => {
    trigger().click();
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('closes on Escape', () => {
    trigger().click();
    fixture.detectChanges();
    press('Escape');
    expect(panel()).toBeNull();
  });

  it('closes on an outside click', () => {
    trigger().click();
    fixture.detectChanges();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('marks the control touched when the panel closes', () => {
    expect(host.countryId.touched).toBeFalse();
    trigger().click();
    fixture.detectChanges();
    press('Escape');
    expect(host.countryId.touched).toBeTrue();
  });

  // ── values ────────────────────────────────────────────────────────────

  it('stores optionValue rather than the whole object', () => {
    trigger().click();
    fixture.detectChanges();
    optionEls()[1].click();
    fixture.detectChanges();
    expect(host.countryId.value).toBe(2);
    expect(
      fixture.nativeElement.querySelector('.objects .gm-dropdown__value')
        .textContent,
    ).toContain('UAE');
  });

  it('stores the option itself for primitive options', () => {
    trigger('.primitives').click();
    fixture.detectChanges();
    optionEls()[0].click();
    fixture.detectChanges();
    expect(host.status.value).toBe('Active');
  });

  it('writeValue renders a pre-set control value', () => {
    host.countryId.setValue(3);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.objects .gm-dropdown__value')
        .textContent,
    ).toContain('Jordan');
  });

  it('marks the matching option aria-selected', () => {
    host.countryId.setValue(1);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(optionEls()[0].getAttribute('aria-selected')).toBe('true');
    expect(optionEls()[1].getAttribute('aria-selected')).toBe('false');
  });

  // ── disabled ──────────────────────────────────────────────────────────

  it('setDisabledState disables the trigger and blocks opening', () => {
    host.countryId.disable();
    fixture.detectChanges();
    expect(trigger().disabled).toBeTrue();

    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeNull();

    host.countryId.enable();
    fixture.detectChanges();
    expect(trigger().disabled).toBeFalse();
  });

  it('does not open while loading', () => {
    trigger('.loading').click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('shows a gm-spinner while loading', () => {
    expect(
      fixture.nativeElement.querySelector('.loading gm-spinner'),
    ).toBeTruthy();
  });

  // ── keyboard ──────────────────────────────────────────────────────────

  it('opens with ArrowDown when closed', () => {
    press('ArrowDown');
    expect(panel()).toBeTruthy();
  });

  it('moves the highlight with arrows and tracks aria-activedescendant', () => {
    press('ArrowDown');
    press('ArrowDown');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      optionEls()[1].id,
    );
    press('ArrowUp');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      optionEls()[0].id,
    );
  });

  it('jumps to first/last with Home and End', () => {
    press('ArrowDown');
    press('End');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      optionEls()[2].id,
    );
    press('Home');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      optionEls()[0].id,
    );
  });

  it('selects the highlighted option with Enter', () => {
    press('ArrowDown');
    press('ArrowDown');
    press('Enter');
    expect(host.countryId.value).toBe(2);
    expect(panel()).toBeNull();
  });

  it('starts the highlight on the current selection', () => {
    host.countryId.setValue(3);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      optionEls()[2].id,
    );
  });

  // ── filtering ─────────────────────────────────────────────────────────

  it('filters case-insensitively without mutating the source array', () => {
    const original = host.countries();
    trigger().click();
    fixture.detectChanges();

    filterInput().value = 'jor';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(optionEls().length).toBe(1);
    expect(optionEls()[0].textContent).toContain('Jordan');
    expect(host.countries()).toBe(original);
    expect(host.countries().length).toBe(3);
  });

  it('shows emptyFilterMessage when nothing matches', () => {
    trigger().click();
    fixture.detectChanges();
    filterInput().value = 'zzz';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(optionEls().length).toBe(0);
    expect(panel()!.querySelector('.gm-dropdown__empty')!.textContent).toContain(
      'No results found',
    );
  });

  it('resets the filter when the panel closes', () => {
    trigger().click();
    fixture.detectChanges();
    filterInput().value = 'jor';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    press('Escape');
    trigger().click();
    fixture.detectChanges();
    expect(optionEls().length).toBe(3);
  });

  // ── clear ─────────────────────────────────────────────────────────────

  it('clears to null with a real button, without opening the panel', () => {
    host.countryId.setValue(2);
    fixture.detectChanges();

    const clear = fixture.nativeElement.querySelector(
      '.objects .gm-dropdown__clear',
    ) as HTMLButtonElement;
    expect(clear.tagName).toBe('BUTTON');
    expect(clear.getAttribute('aria-label')).toBeTruthy();

    clear.click();
    fixture.detectChanges();
    expect(host.countryId.value).toBeNull();
    // The click must not bubble into the trigger's toggle.
    expect(panel()).toBeNull();
  });

  it('offers no clear action while empty', () => {
    expect(
      fixture.nativeElement.querySelector('.objects .gm-dropdown__clear'),
    ).toBeNull();
  });

  // ── error state ───────────────────────────────────────────────────────

  it('flags the error state once a required control is touched', () => {
    const hostEl = fixture.nativeElement.querySelector('gm-select.objects');
    host.countryId.markAsTouched();
    fixture.detectChanges();
    expect(hostEl.classList).toContain('gm-dropdown-host--invalid');
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
  });
});

@Component({
  standalone: true,
  imports: [GmSelectComponent],
  template: `
    <gm-select
      [options]="['Active', 'Inactive']"
      [filter]="true"
      (filterChange)="terms.push($event)"
      (openChange)="openStates.push($event)"
    />
  `,
})
class EventHostComponent {
  readonly terms: string[] = [];
  readonly openStates: boolean[] = [];
}

describe('gm-select filter and open events', () => {
  let fixture: ComponentFixture<EventHostComponent>;
  let host: EventHostComponent;

  const trigger = () =>
    fixture.nativeElement.querySelector(
      '.gm-dropdown__trigger',
    ) as HTMLButtonElement;
  const filterInput = () =>
    document.querySelector(
      '.cdk-overlay-container .gm-dropdown__filter-input',
    ) as HTMLInputElement;

  const type = (value: string) => {
    filterInput().value = value;
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EventHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits openChange on open and on close', () => {
    trigger().click();
    fixture.detectChanges();
    expect(host.openStates).toEqual([true]);

    trigger().click();
    fixture.detectChanges();
    expect(host.openStates).toEqual([true, false]);
  });

  it('emits the filter term on every keystroke', () => {
    trigger().click();
    fixture.detectChanges();

    type('ac');
    type('act');

    expect(host.terms).toEqual(['ac', 'act']);
  });

  // A consumer fetching on filterChange must not be told the term went empty
  // just because the panel closed.
  it('does not emit a filter term when closing clears it', () => {
    trigger().click();
    fixture.detectChanges();
    type('ac');

    trigger().click();
    fixture.detectChanges();

    expect(host.terms).toEqual(['ac']);
  });
});
