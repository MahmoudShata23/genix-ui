import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { GmAutocompleteComponent } from '../autocomplete/autocomplete.component';
import { GmButtonComponent } from '../button/button.component';
import { GmInputNumberComponent } from '../input-number/input-number.component';
import { GmMenuComponent } from '../menu/menu.component';
import type { GmMenuItem } from '../menu/menu.types';
import { GmPopoverComponent } from '../popover/popover.component';
import { GmSelectButtonComponent } from '../select-button/select-button.component';
import { GmSelectOptionDirective } from '../select/select-option.directive';
import { GmToggleSwitchComponent } from '../toggle-switch/toggle-switch.component';

interface Status {
  label: string;
  value: string;
  inactive?: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    GmButtonComponent,
    GmPopoverComponent,
    GmMenuComponent,
    GmToggleSwitchComponent,
    GmInputNumberComponent,
    GmSelectButtonComponent,
    GmAutocompleteComponent,
    GmSelectOptionDirective,
  ],
  template: `
    <gm-button class="pop-trigger" label="Open" (onClick)="popover.toggle($event)" />
    <gm-popover #popover ariaLabel="Details">
      <p class="pop-body">Popover content</p>
      <button class="pop-inner" type="button">Inner</button>
    </gm-popover>

    <gm-button class="menu-trigger" label="Actions" (onClick)="menu.toggle($event)" />
    <gm-menu #menu [items]="items" ariaLabel="Actions" />

    <gm-toggle-switch class="switch" [formControl]="enabled" label="Enabled" />

    <gm-input-number
      class="amount"
      [formControl]="amount"
      label="Amount"
      [min]="0"
      [max]="100"
      [step]="5"
      suffix="%"
    />

    <gm-select-button
      class="status"
      [formControl]="status"
      label="Status"
      [options]="statuses"
      optionLabel="label"
      optionValue="value"
      optionDisabled="inactive"
    />

    <gm-autocomplete
      class="user"
      [formControl]="user"
      label="User"
      [suggestions]="suggestions()"
      optionLabel="name"
      optionValue="id"
      placeholder="Search users"
      [loading]="searching()"
      [clearable]="true"
      (search)="onSearch($event)"
    >
      <ng-template gmSelectOption let-option>
        <strong class="sug-name">{{ option.name }}</strong>
        <span class="sug-email">{{ option.email }}</span>
      </ng-template>
    </gm-autocomplete>
  `,
})
class HostComponent {
  readonly edited: string[] = [];
  readonly terms: string[] = [];

  readonly items: GmMenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', command: () => this.edited.push('edit') },
    { separator: true },
    { label: 'Archive', disabled: true, command: () => this.edited.push('archive') },
    { label: 'Delete', command: () => this.edited.push('delete') },
  ];

  readonly statuses: Status[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Active', value: 'active' },
    { label: 'Void', value: 'void', inactive: true },
    { label: 'Closed', value: 'closed' },
  ];

  readonly allUsers: User[] = [
    { id: 1, name: 'Amira', email: 'amira@globemed.test' },
    { id: 2, name: 'Karim', email: 'karim@globemed.test' },
    { id: 3, name: 'Nadia', email: 'nadia@globemed.test' },
  ];

  readonly suggestions = signal<User[]>([]);
  readonly searching = signal(false);

  readonly enabled = new FormControl<boolean | null>(false);
  readonly amount = new FormControl<number | null>(null);
  readonly status = new FormControl<string | null>(null);
  readonly user = new FormControl<number | null>(null);

  onSearch(term: string): void {
    this.terms.push(term);
    this.suggestions.set(
      this.allUsers.filter((candidate) =>
        candidate.name.toLowerCase().includes(term.toLowerCase()),
      ),
    );
  }
}

describe('small components', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const el = <T extends HTMLElement>(selector: string) =>
    fixture.nativeElement.querySelector(selector) as T;
  const overlay = <T extends HTMLElement>(selector: string) =>
    document.querySelector(`.cdk-overlay-container ${selector}`) as T | null;
  const overlayAll = (selector: string) =>
    Array.from(
      document.querySelectorAll<HTMLElement>(`.cdk-overlay-container ${selector}`),
    );

  function keydown(target: HTMLElement, key: string): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document
      .querySelectorAll('.cdk-overlay-container')
      .forEach((node) => node.remove());
  });

  // ── gm-popover ────────────────────────────────────────────────────────────

  describe('gm-popover', () => {
    const trigger = () => el<HTMLButtonElement>('.pop-trigger button');

    it('opens, closes and toggles', () => {
      expect(overlay('.gm-popover')).toBeNull();

      trigger().click();
      fixture.detectChanges();
      const panel = overlay('.gm-popover')!;
      expect(panel).not.toBeNull();
      expect(panel.getAttribute('role')).toBe('dialog');
      expect(panel.getAttribute('aria-label')).toBe('Details');

      trigger().click();
      fixture.detectChanges();
      expect(overlay('.gm-popover')).toBeNull();
    });

    it('projects its content, and again after reopening', () => {
      trigger().click();
      fixture.detectChanges();
      expect(overlay('.pop-body')!.textContent!.trim()).toBe('Popover content');

      trigger().click();
      fixture.detectChanges();
      trigger().click();
      fixture.detectChanges();

      // Content projection has to survive the panel being destroyed and rebuilt.
      expect(overlay('.pop-body')).not.toBeNull();
      expect(overlay('.pop-body')!.textContent!.trim()).toBe('Popover content');
    });

    it('closes on an outside click but not on a click inside', () => {
      trigger().click();
      fixture.detectChanges();

      overlay<HTMLButtonElement>('.pop-inner')!.click();
      fixture.detectChanges();
      expect(overlay('.gm-popover')).not.toBeNull();

      document.body.click();
      fixture.detectChanges();
      expect(overlay('.gm-popover')).toBeNull();
    });

    it('closes on Escape', () => {
      trigger().click();
      fixture.detectChanges();

      keydown(overlay('.gm-popover')!, 'Escape');

      expect(overlay('.gm-popover')).toBeNull();
    });
  });

  // ── gm-menu ───────────────────────────────────────────────────────────────

  describe('gm-menu', () => {
    const trigger = () => el<HTMLButtonElement>('.menu-trigger button');
    const items = () => overlayAll('.gm-menu__item');

    function openMenu(): void {
      trigger().click();
      fixture.detectChanges();
    }

    it('renders labels, icons and a separator', () => {
      openMenu();

      const menu = overlay('.gm-menu')!;
      expect(menu.getAttribute('role')).toBe('menu');
      expect(menu.getAttribute('aria-label')).toBe('Actions');
      expect(items().map((item) => item.textContent!.trim())).toEqual([
        'Edit',
        'Archive',
        'Delete',
      ]);
      expect(overlayAll('.gm-menu__separator').length).toBe(1);
      expect(
        overlay('.gm-menu__separator')!.getAttribute('role'),
      ).toBe('separator');
      expect(items()[0].querySelector('.gm-menu__icon')!.className).toContain(
        'pi-pencil',
      );
      expect(items()[0].getAttribute('role')).toBe('menuitem');
    });

    it('runs a command and closes', () => {
      openMenu();

      items()[0].click();
      fixture.detectChanges();

      expect(host.edited).toEqual(['edit']);
      expect(overlay('.gm-menu')).toBeNull();
    });

    it('does not run a disabled item', () => {
      openMenu();

      const archive = items()[1];
      expect((archive as HTMLButtonElement).disabled).toBeTrue();
      archive.click();
      fixture.detectChanges();

      expect(host.edited).toEqual([]);
      expect(overlay('.gm-menu')).not.toBeNull();
    });

    it('moves focus with the arrows, skipping the disabled item', () => {
      openMenu();

      const menu = overlay('.gm-menu')!;
      const enabled = overlayAll('.gm-menu__item:not([disabled])');
      expect(enabled.length).toBe(2);

      enabled[0].focus();
      keydown(menu, 'ArrowDown');
      expect(document.activeElement).toBe(enabled[1]);

      // Wraps at the end.
      keydown(menu, 'ArrowDown');
      expect(document.activeElement).toBe(enabled[0]);

      keydown(menu, 'ArrowUp');
      expect(document.activeElement).toBe(enabled[1]);

      keydown(menu, 'Home');
      expect(document.activeElement).toBe(enabled[0]);

      keydown(menu, 'End');
      expect(document.activeElement).toBe(enabled[1]);
    });

    it('closes on Escape', () => {
      openMenu();

      keydown(overlay('.gm-menu')!, 'Escape');

      expect(overlay('.gm-menu')).toBeNull();
    });
  });

  // ── gm-toggle-switch ──────────────────────────────────────────────────────

  describe('gm-toggle-switch', () => {
    const input = () => el<HTMLInputElement>('.switch .gm-switch__control');

    it('is a native checkbox announced as a switch', () => {
      expect(input().type).toBe('checkbox');
      expect(input().getAttribute('role')).toBe('switch');
      expect(el('.switch .gm-switch__label')!.textContent!.trim()).toContain(
        'Enabled',
      );
    });

    it('reflects and reports the control value', () => {
      expect(input().checked).toBeFalse();

      host.enabled.setValue(true);
      fixture.detectChanges();
      expect(input().checked).toBeTrue();

      input().click();
      fixture.detectChanges();
      expect(host.enabled.value).toBeFalse();
      // Toggling is the whole interaction, so it counts as touched at once.
      expect(host.enabled.touched).toBeTrue();
    });

    it('setDisabledState disables the input', () => {
      host.enabled.disable();
      fixture.detectChanges();
      expect(input().disabled).toBeTrue();

      host.enabled.enable();
      fixture.detectChanges();
      expect(input().disabled).toBeFalse();
    });
  });

  // ── gm-input-number ───────────────────────────────────────────────────────

  describe('gm-input-number', () => {
    const input = () => el<HTMLInputElement>('.amount .gm-field__control');

    it('declares its numeric constraints on the element', () => {
      expect(input().type).toBe('number');
      expect(input().min).toBe('0');
      expect(input().max).toBe('100');
      expect(input().step).toBe('5');
      expect(el('.amount .gm-input-number__affix')!.textContent!.trim()).toBe('%');
    });

    it('reports a number, never a string', () => {
      type(input(), '42');

      expect(host.amount.value).toBe(42);
      expect(typeof host.amount.value).toBe('number');
    });

    it('reports null for an empty field', () => {
      type(input(), '42');
      type(input(), '');

      expect(host.amount.value).toBeNull();
    });

    it('clamps to min/max on blur, not while typing', () => {
      type(input(), '250');
      // Still mid-edit: the typed value stands.
      expect(host.amount.value).toBe(250);

      input().dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(host.amount.value).toBe(100);

      type(input(), '-5');
      input().dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(host.amount.value).toBe(0);
    });

    it('renders a pre-set control value', () => {
      host.amount.setValue(17);
      fixture.detectChanges();

      expect(input().value).toBe('17');
    });

    it('setDisabledState disables the input', () => {
      host.amount.disable();
      fixture.detectChanges();

      expect(input().disabled).toBeTrue();
    });
  });

  // ── gm-select-button ──────────────────────────────────────────────────────

  describe('gm-select-button', () => {
    const options = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
          '.status .gm-select-button__option',
        ),
      );

    it('is a radiogroup of radios named by its label', () => {
      const group = el('.status .gm-select-button')!;
      expect(group.getAttribute('role')).toBe('radiogroup');
      expect(group.getAttribute('aria-labelledby')).toBeTruthy();
      expect(options().map((option) => option.textContent!.trim())).toEqual([
        'Draft',
        'Active',
        'Void',
        'Closed',
      ]);
      expect(options()[0].getAttribute('role')).toBe('radio');
    });

    it('stores optionValue and marks the choice checked', () => {
      options()[1].click();
      fixture.detectChanges();

      expect(host.status.value).toBe('active');
      expect(options()[1].getAttribute('aria-checked')).toBe('true');
      expect(options()[0].getAttribute('aria-checked')).toBe('false');
      expect(options()[1].classList).toContain(
        'gm-select-button__option--selected',
      );
    });

    it('renders a pre-set control value as checked', () => {
      host.status.setValue('closed');
      fixture.detectChanges();

      expect(options()[3].getAttribute('aria-checked')).toBe('true');
    });

    it('honours optionDisabled', () => {
      expect(options()[2].disabled).toBeTrue();

      options()[2].click();
      fixture.detectChanges();
      expect(host.status.value).toBeNull();
    });

    it('keeps one tab stop, on the selection', () => {
      // Nothing selected: the first usable option holds the tab stop.
      expect(options().map((option) => option.tabIndex)).toEqual([0, -1, -1, -1]);

      host.status.setValue('closed');
      fixture.detectChanges();
      expect(options().map((option) => option.tabIndex)).toEqual([-1, -1, -1, 0]);
    });

    it('arrows move and select, skipping disabled options', () => {
      host.status.setValue('draft');
      fixture.detectChanges();

      keydown(options()[0], 'ArrowRight');
      expect(host.status.value).toBe('active');

      // 'void' is disabled, so the next stop is 'closed'.
      keydown(options()[1], 'ArrowRight');
      expect(host.status.value).toBe('closed');

      // Wraps back to the start.
      keydown(options()[3], 'ArrowRight');
      expect(host.status.value).toBe('draft');

      keydown(options()[0], 'End');
      expect(host.status.value).toBe('closed');

      keydown(options()[3], 'Home');
      expect(host.status.value).toBe('draft');
    });

    it('setDisabledState disables every option', () => {
      host.status.disable();
      fixture.detectChanges();

      expect(options().every((option) => option.disabled)).toBeTrue();
    });
  });

  // ── gm-autocomplete ───────────────────────────────────────────────────────

  describe('gm-autocomplete', () => {
    const input = () => el<HTMLInputElement>('.user .gm-field__control');
    const suggestions = () => overlayAll('.gm-autocomplete__option');

    it('is a combobox over a text input', () => {
      expect(input().getAttribute('role')).toBe('combobox');
      expect(input().getAttribute('aria-autocomplete')).toBe('list');
      expect(input().getAttribute('aria-expanded')).toBe('false');
      expect(input().placeholder).toBe('Search users');
    });

    it('emits search as the user types, and never fetches itself', () => {
      type(input(), 'am');

      expect(host.terms).toEqual(['am']);
      expect(input().getAttribute('aria-expanded')).toBe('true');
      expect(suggestions().length).toBe(1);
      expect(suggestions()[0].textContent).toContain('Amira');
    });

    it('respects minLength before searching', () => {
      type(input(), '');

      expect(host.terms).toEqual([]);
      expect(overlay('.gm-autocomplete__panel')).toBeNull();
    });

    it('renders the custom option template inside the option wrapper', () => {
      type(input(), 'a');

      const [first] = suggestions();
      expect(first.getAttribute('role')).toBe('option');
      expect(first.querySelector('.sug-name')!.textContent!.trim()).toBe('Amira');
      expect(first.querySelector('.sug-email')!.textContent!.trim()).toBe(
        'amira@globemed.test',
      );
    });

    it('stores optionValue on selection and shows the label', () => {
      type(input(), 'kar');
      suggestions()[0].click();
      fixture.detectChanges();

      expect(host.user.value).toBe(2);
      expect(input().value).toBe('Karim');
      expect(overlay('.gm-autocomplete__panel')).toBeNull();
    });

    it('navigates with the keyboard and selects with Enter', () => {
      type(input(), 'a');
      expect(suggestions().length).toBe(3);

      keydown(input(), 'ArrowDown');
      const active = input().getAttribute('aria-activedescendant');
      expect(active).toBeTruthy();
      expect(document.getElementById(active!)!.classList).toContain(
        'gm-autocomplete__option--active',
      );

      keydown(input(), 'ArrowDown');
      keydown(input(), 'Enter');

      expect(host.user.value).toBe(2);
      expect(input().value).toBe('Karim');
    });

    it('closes on Escape without selecting', () => {
      type(input(), 'a');

      keydown(input(), 'Escape');

      expect(overlay('.gm-autocomplete__panel')).toBeNull();
      expect(host.user.value).toBeNull();
    });

    it('puts the box back in step with the value on blur', () => {
      type(input(), 'kar');
      suggestions()[0].click();
      fixture.detectChanges();

      // Typing over the selection without picking anything.
      type(input(), 'nonsense');
      input().dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(input().value).toBe('Karim');
      expect(host.user.value).toBe(2);
      expect(host.user.touched).toBeTrue();
    });

    it('shows the empty state when a search returns nothing', () => {
      type(input(), 'zzz');

      expect(suggestions().length).toBe(0);
      expect(overlay('.gm-autocomplete__empty')!.textContent!.trim()).toBe(
        'No results found',
      );
    });

    it('shows a spinner while loading', () => {
      host.searching.set(true);
      fixture.detectChanges();

      expect(el('.user gm-spinner')).not.toBeNull();
    });

    it('clears the selection', () => {
      type(input(), 'kar');
      suggestions()[0].click();
      fixture.detectChanges();

      el<HTMLButtonElement>('.user .gm-autocomplete__clear')!.click();
      fixture.detectChanges();

      expect(host.user.value).toBeNull();
      expect(input().value).toBe('');
    });

    it('renders a pre-set control value as its label', () => {
      host.suggestions.set(host.allUsers);
      host.user.setValue(3);
      fixture.detectChanges();

      expect(input().value).toBe('Nadia');
    });

    it('setDisabledState disables the input', () => {
      host.user.disable();
      fixture.detectChanges();

      expect(input().disabled).toBeTrue();
    });
  });
});
