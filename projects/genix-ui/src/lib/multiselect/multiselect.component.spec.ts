import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GmMultiselectComponent } from './multiselect.component';

interface Role {
  id: number;
  name: string;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmMultiselectComponent],
  template: `
    <gm-multiselect
      class="objects"
      [formControl]="roles"
      label="Roles"
      placeholder="Select roles"
      [options]="allRoles()"
      optionLabel="name"
      optionValue="id"
      [filter]="true"
      [clearable]="true"
      [maxSelectedLabels]="2"
      selectedItemsLabel="{0} roles selected"
    />
    <gm-multiselect
      class="chips"
      [formControl]="tags"
      display="chip"
      [options]="['Alpha', 'Beta', 'Gamma']"
      placeholder="Tags"
      [showToggleAll]="false"
    />
  `,
})
class HostComponent {
  readonly allRoles = signal<Role[]>([
    { id: 1, name: 'Admin' },
    { id: 2, name: 'User' },
    { id: 3, name: 'Auditor' },
  ]);
  // Starts pre-selected: the classic writeValue regression.
  readonly roles = new FormControl<number[] | null>([1, 3], Validators.required);
  readonly tags = new FormControl<string[] | null>([]);
}

describe('gm-multiselect', () => {
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
  const toggleAll = () =>
    document.querySelector(
      '.cdk-overlay-container .gm-multiselect__toggle-all',
    ) as HTMLButtonElement;

  const press = (key: string, sel?: string) => {
    trigger(sel).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
    fixture.detectChanges();
  };

  const openPanel = (sel = '.objects') => {
    trigger(sel).click();
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
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
  });

  // ── writeValue ────────────────────────────────────────────────────────

  it('shows a pre-set control value as selected immediately', () => {
    openPanel();
    expect(optionEls()[0].getAttribute('aria-selected')).toBe('true');
    expect(optionEls()[1].getAttribute('aria-selected')).toBe('false');
    expect(optionEls()[2].getAttribute('aria-selected')).toBe('true');
  });

  it('summarises a pre-set value on the trigger', () => {
    expect(
      fixture.nativeElement.querySelector('.objects .gm-dropdown__value')
        .textContent,
    ).toContain('Admin, Auditor');
  });

  it('treats a null control value as an empty selection', () => {
    host.roles.setValue(null);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.objects .gm-dropdown__placeholder')
        .textContent,
    ).toContain('Select roles');
  });

  // ── a11y ──────────────────────────────────────────────────────────────

  it('marks the listbox multiselectable and links it to the trigger', () => {
    openPanel();
    const listbox = panel()!.querySelector('[role="listbox"]')!;
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(listbox.id);
    expect(trigger().getAttribute('role')).toBe('combobox');
  });

  it('renders no focusable control inside an option', () => {
    openPanel();
    // A real checkbox in a role="option" would break the listbox pattern.
    expect(optionEls()[0].querySelector('input, button')).toBeNull();
  });

  // ── selection ─────────────────────────────────────────────────────────

  it('adds a value without mutating the bound array', () => {
    const before = host.roles.value;
    openPanel();
    optionEls()[1].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([1, 3, 2]);
    expect(before).toEqual([1, 3]);
  });

  it('removes a value when an already-selected option is clicked', () => {
    openPanel();
    optionEls()[0].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([3]);
  });

  it('never records a duplicate', () => {
    openPanel();
    optionEls()[1].click();
    fixture.detectChanges();
    optionEls()[1].click();
    fixture.detectChanges();
    optionEls()[1].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([1, 3, 2]);
  });

  it('keeps the panel open while toggling options', () => {
    openPanel();
    optionEls()[1].click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();
  });

  it('stores optionValue, not the whole object', () => {
    host.roles.setValue([]);
    fixture.detectChanges();
    openPanel();
    optionEls()[2].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([3]);
  });

  it('stores primitives directly', () => {
    openPanel('.chips');
    optionEls()[1].click();
    fixture.detectChanges();
    expect(host.tags.value).toEqual(['Beta']);
  });

  // ── summary / chips ───────────────────────────────────────────────────

  it('switches to a count past maxSelectedLabels, using the custom label', () => {
    host.roles.setValue([1, 2, 3]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.objects .gm-dropdown__value')
        .textContent,
    ).toContain('3 roles selected');
  });

  it('renders a removable gm-chip per selection in chip display', () => {
    host.tags.setValue(['Alpha', 'Gamma']);
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('.chips gm-chip');
    expect(chips.length).toBe(2);

    const remove = chips[0].querySelector('.gm-chip__remove') as HTMLButtonElement;
    expect(remove.tagName).toBe('BUTTON');
    expect(remove.getAttribute('aria-label')).toContain('Alpha');

    remove.click();
    fixture.detectChanges();
    expect(host.tags.value).toEqual(['Gamma']);
    // Dismissing a chip must not open the panel.
    expect(panel()).toBeNull();
  });

  // ── select all ────────────────────────────────────────────────────────

  it('selects every visible option, then clears them', () => {
    host.roles.setValue([]);
    fixture.detectChanges();
    openPanel();

    toggleAll().click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([1, 2, 3]);
    expect(toggleAll().getAttribute('aria-pressed')).toBe('true');

    toggleAll().click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([]);
  });

  it('scopes select-all to the filtered options and keeps hidden ones', () => {
    host.roles.setValue([1]);
    fixture.detectChanges();
    openPanel();

    filterInput().value = 'aud';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(optionEls().length).toBe(1);

    toggleAll().click();
    fixture.detectChanges();
    // Admin (filtered out) is untouched; Auditor is added.
    expect(host.roles.value).toEqual([1, 3]);
  });

  it('can be turned off', () => {
    openPanel('.chips');
    expect(toggleAll()).toBeNull();
  });

  // ── filtering ─────────────────────────────────────────────────────────

  it('filters case-insensitively without mutating the options', () => {
    const before = host.allRoles();
    openPanel();
    filterInput().value = 'ADM';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(optionEls().length).toBe(1);
    expect(optionEls()[0].textContent).toContain('Admin');
    expect(host.allRoles()).toBe(before);
    expect(host.allRoles().length).toBe(3);
  });

  it('shows emptyFilterMessage when nothing matches', () => {
    openPanel();
    filterInput().value = 'zzz';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(panel()!.querySelector('.gm-dropdown__empty')).toBeTruthy();
  });

  // ── clear ─────────────────────────────────────────────────────────────

  it('clears to an empty array, not null', () => {
    const clear = fixture.nativeElement.querySelector(
      '.objects .gm-dropdown__clear',
    ) as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([]);
    expect(panel()).toBeNull();
  });

  it('offers no clear action while empty', () => {
    host.roles.setValue([]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.objects .gm-dropdown__clear'),
    ).toBeNull();
  });

  // ── disabled / keyboard / touched ──────────────────────────────────────

  it('setDisabledState disables the trigger and blocks opening', () => {
    host.roles.disable();
    fixture.detectChanges();
    expect(trigger().disabled).toBeTrue();
    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('opens with ArrowDown and toggles with Enter, staying open', () => {
    press('ArrowDown');
    expect(panel()).toBeTruthy();
    press('ArrowDown');
    press('Enter');
    expect(host.roles.value).toEqual([1, 3, 2]);
    expect(panel()).toBeTruthy();
  });

  it('supports Home/End and closes on Escape', () => {
    press('ArrowDown');
    press('End');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      optionEls()[2].id,
    );
    press('Home');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      optionEls()[0].id,
    );
    press('Escape');
    expect(panel()).toBeNull();
  });

  it('marks the control touched when the panel closes', () => {
    expect(host.roles.touched).toBeFalse();
    openPanel();
    press('Escape');
    expect(host.roles.touched).toBeTrue();
  });

  it('flags the error state once a required control is empty and touched', () => {
    const hostEl = fixture.nativeElement.querySelector('gm-multiselect.objects');
    host.roles.setValue([]);
    host.roles.markAsTouched();
    fixture.detectChanges();
    expect(hostEl.classList).toContain('gm-dropdown-host--invalid');
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
  });
});
