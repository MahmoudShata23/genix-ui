import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { GmMultiselectComponent } from './multiselect.component';

interface Role {
  id: number;
  name: string;
}

const ROLES: Role[] = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'User' },
  { id: 3, name: 'Auditor' },
  { id: 4, name: 'Guest' },
];

function buildCities(count: number): Role[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `City ${index}`,
  }));
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmMultiselectComponent],
  template: `
    <gm-multiselect
      class="limited"
      [formControl]="roles"
      [options]="roleOptions"
      optionLabel="name"
      optionValue="id"
      placeholder="Select roles"
      display="chip"
      [clearable]="true"
      [selectionLimit]="2"
    />

    <gm-multiselect
      class="unlimited"
      [formControl]="allRoles"
      [options]="roleOptions"
      optionLabel="name"
      optionValue="id"
    />

    <gm-multiselect
      class="virtual"
      [formControl]="cityIds"
      [options]="cities()"
      optionLabel="name"
      optionValue="id"
      placeholder="Select cities"
      [filter]="true"
      [clearable]="true"
      [virtualScroll]="true"
      [virtualItemSize]="40"
      [selectionLimit]="3"
    />

    <gm-multiselect
      class="locked"
      [options]="cities()"
      optionLabel="name"
      optionValue="id"
      [virtualScroll]="true"
      [disabled]="true"
    />
  `,
})
class HostComponent {
  readonly roleOptions = ROLES;
  /** 1,200 options — well past the point where a row per option is sensible. */
  readonly cities = signal<Role[]>(buildCities(1200));
  readonly roles = new FormControl<number[] | null>([]);
  readonly allRoles = new FormControl<number[] | null>([]);
  readonly cityIds = new FormControl<number[] | null>([]);
}

describe('gm-multiselect selectionLimit', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const trigger = (sel = '.limited') =>
    fixture.nativeElement.querySelector(
      `${sel} .gm-dropdown__trigger`,
    ) as HTMLButtonElement;
  const optionEls = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.cdk-overlay-container [role="option"]',
      ),
    );
  const toggleAll = () =>
    document.querySelector(
      '.cdk-overlay-container .gm-multiselect__toggle-all',
    ) as HTMLButtonElement;

  function open(sel = '.limited'): void {
    trigger(sel).click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document
      .querySelectorAll('.cdk-overlay-container')
      .forEach((node) => node.remove());
  });

  it('stops selecting past the limit', () => {
    open();

    optionEls()[0].click();
    fixture.detectChanges();
    optionEls()[1].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([1, 2]);

    // The third addition is refused, and the value is untouched.
    optionEls()[2].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([1, 2]);
  });

  it('marks the options the limit rules out', () => {
    host.roles.setValue([1, 2]);
    fixture.detectChanges();
    open();

    const rows = optionEls();
    // Selected rows stay actionable — they can still be removed.
    expect(rows[0].getAttribute('aria-disabled')).toBeNull();
    expect(rows[1].getAttribute('aria-disabled')).toBeNull();
    expect(rows[2].getAttribute('aria-disabled')).toBe('true');
    expect(rows[2].classList).toContain('gm-multiselect__option--blocked');
  });

  it('still unselects after the limit is reached', () => {
    host.roles.setValue([1, 2]);
    fixture.detectChanges();
    open();

    optionEls()[0].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([2]);

    // A slot freed up, so the previously blocked option goes in.
    optionEls()[2].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([2, 3]);
  });

  it('removes a chip after the limit is reached', () => {
    host.roles.setValue([1, 2]);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.limited .gm-chip__remove',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(host.roles.value).toEqual([2]);
  });

  it('fills select-all only up to the limit, in option order', () => {
    open();

    toggleAll().click();
    fixture.detectChanges();

    expect(host.roles.value).toEqual([1, 2]);
    // Not every visible option got selected, so the row is not "all selected".
    expect(toggleAll().getAttribute('aria-pressed')).toBe('false');
  });

  it('disables select-all once the limit leaves it no move', () => {
    host.roles.setValue([1, 2]);
    fixture.detectChanges();
    open();

    expect(toggleAll().disabled).toBeTrue();
  });

  it('keeps select-all usable when the limit covers every option', () => {
    open('.unlimited');

    toggleAll().click();
    fixture.detectChanges();
    expect(host.allRoles.value).toEqual([1, 2, 3, 4]);
    expect(toggleAll().disabled).toBeFalse();

    // Toggling again clears them.
    toggleAll().click();
    fixture.detectChanges();
    expect(host.allRoles.value).toEqual([]);
  });

  it('leaves a value that already exceeds the limit valid', () => {
    host.roles.setValue([1, 2, 3]);
    fixture.detectChanges();

    // Not silently rewritten…
    expect(host.roles.value).toEqual([1, 2, 3]);
    expect(
      fixture.nativeElement.querySelectorAll('.limited gm-chip').length,
    ).toBe(3);

    // …and it can still shrink.
    open();
    optionEls()[0].click();
    fixture.detectChanges();
    expect(host.roles.value).toEqual([2, 3]);
  });

  it('is unlimited when selectionLimit is omitted', () => {
    open('.unlimited');

    optionEls()[0].click();
    fixture.detectChanges();
    optionEls()[1].click();
    fixture.detectChanges();
    optionEls()[2].click();
    fixture.detectChanges();
    optionEls()[3].click();
    fixture.detectChanges();

    expect(host.allRoles.value).toEqual([1, 2, 3, 4]);
    expect(optionEls()[3].getAttribute('aria-disabled')).toBeNull();
  });

  it('never records a duplicate through select-all with a limit', () => {
    host.roles.setValue([2]);
    fixture.detectChanges();
    open();

    toggleAll().click();
    fixture.detectChanges();

    expect(host.roles.value).toEqual([2, 1]);
  });
});

/*
 * Real async rather than `fakeAsync`: virtualisation depends on the browser
 * firing `scroll` and on the CDK measuring across animation frames, and neither
 * is a task the virtual clock can flush.
 */
describe('gm-multiselect virtual scroll', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const trigger = (sel = '.virtual') =>
    fixture.nativeElement.querySelector(
      `${sel} .gm-dropdown__trigger`,
    ) as HTMLButtonElement;
  const panel = () =>
    document.querySelector('.cdk-overlay-container .gm-dropdown__panel');
  const viewport = () =>
    document.querySelector(
      '.cdk-overlay-container .gm-dropdown__viewport',
    ) as HTMLElement | null;
  const optionEls = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.cdk-overlay-container [role="option"]',
      ),
    );
  const filterInput = () =>
    document.querySelector(
      '.cdk-overlay-container .gm-dropdown__filter-input',
    ) as HTMLInputElement;

  /** Lets the CDK measure, scroll and re-render before the next assertion. */
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function open(): Promise<void> {
    trigger().click();
    await settle();
  }

  async function keydown(key: string): Promise<void> {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await settle();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => {
    document
      .querySelectorAll('.cdk-overlay-container')
      .forEach((node) => node.remove());
  });

  it('renders only a window of a 1,200-option list', async () => {
    await open();

    expect(viewport()).not.toBeNull();
    const rendered = optionEls();
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(100);
  });

  it('keeps the multiselectable listbox semantics', async () => {
    await open();

    const listbox = viewport()!;
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(listbox.id);
    expect(optionEls()[0].getAttribute('aria-selected')).toBe('false');
  });

  it('shows a pre-set control value as selected immediately', async () => {
    host.cityIds.setValue([0, 2]);
    await settle();

    expect(
      fixture.nativeElement.querySelector('.virtual .gm-dropdown__value')
        .textContent,
    ).toContain('City 0, City 2');

    await open();
    const rows = optionEls();
    expect(rows[0].getAttribute('aria-selected')).toBe('true');
    expect(rows[1].getAttribute('aria-selected')).toBe('false');
    expect(rows[2].getAttribute('aria-selected')).toBe('true');
    expect(rows[0].querySelector('.gm-multiselect__tick--checked')).not.toBeNull();
  });

  it('selects and unselects virtualised rows, storing optionValue', async () => {
    await open();

    optionEls()[1].click();
    await settle();
    expect(host.cityIds.value).toEqual([1]);

    optionEls()[3].click();
    await settle();
    expect(host.cityIds.value).toEqual([1, 3]);

    optionEls()[1].click();
    await settle();
    expect(host.cityIds.value).toEqual([3]);
  });

  it('honours the selection limit in virtualised rows', async () => {
    host.cityIds.setValue([0, 1, 2]);
    await settle();
    await open();

    const rows = optionEls();
    expect(rows[3].getAttribute('aria-disabled')).toBe('true');

    rows[3].click();
    await settle();
    expect(host.cityIds.value).toEqual([0, 1, 2]);

    // Freeing a slot re-enables it.
    optionEls()[0].click();
    await settle();
    optionEls()[3].click();
    await settle();
    expect(host.cityIds.value).toEqual([1, 2, 3]);
  });

  it('virtualises the filtered result without touching the source array', async () => {
    const source = host.cities();
    await open();

    filterInput().value = 'City 7';
    filterInput().dispatchEvent(new Event('input'));
    await settle();

    const rendered = optionEls();
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(100);
    expect(rendered[0].textContent).toContain('City 7');

    expect(host.cities()).toBe(source);
    expect(host.cities().length).toBe(1200);
  });

  it('selects from a filtered virtualised list', async () => {
    await open();

    filterInput().value = 'City 700';
    filterInput().dispatchEvent(new Event('input'));
    await settle();

    optionEls()[0].click();
    await settle();
    expect(host.cityIds.value).toEqual([700]);
  });

  it('shows the empty message when the filter matches nothing', async () => {
    await open();

    filterInput().value = 'no-such-city';
    filterInput().dispatchEvent(new Event('input'));
    await settle();

    expect(optionEls().length).toBe(0);
    expect(panel()!.querySelector('.gm-dropdown__empty')).not.toBeNull();
  });

  it('moves the highlight with arrows and keeps aria-activedescendant', async () => {
    await open();

    await keydown('ArrowDown');
    const active = trigger().getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).not.toBeNull();
    expect(document.getElementById(active!)!.classList).toContain(
      'gm-dropdown__option--active',
    );
  });

  it('scrolls a far-off option into view for End and back for Home', async () => {
    await open();

    await keydown('End');
    const lastId = trigger().getAttribute('aria-activedescendant')!;
    expect(lastId).toContain('option-1199');
    expect(document.getElementById(lastId)).not.toBeNull();
    expect(viewport()!.scrollTop).toBeGreaterThan(0);

    await keydown('Home');
    expect(trigger().getAttribute('aria-activedescendant')).toContain('option-0');
    expect(viewport()!.scrollTop).toBe(0);
  });

  it('toggles the highlighted row with Enter and stays open', async () => {
    await open();

    await keydown('ArrowDown');
    await keydown('Enter');
    expect(host.cityIds.value).toEqual([1]);
    expect(panel()).not.toBeNull();

    await keydown('Enter');
    expect(host.cityIds.value).toEqual([]);
    expect(panel()).not.toBeNull();

    await keydown('Escape');
    expect(panel()).toBeNull();
  });

  it('renders chips for virtualised selections and clears them', async () => {
    host.cityIds.setValue([5, 9]);
    await settle();

    (
      fixture.nativeElement.querySelector(
        '.virtual .gm-dropdown__clear',
      ) as HTMLButtonElement
    ).click();
    await settle();

    expect(host.cityIds.value).toEqual([]);
    expect(
      fixture.nativeElement.querySelector('.virtual .gm-dropdown__placeholder'),
    ).not.toBeNull();
  });

  it('does not open while disabled', async () => {
    const locked = trigger('.locked');
    expect(locked.disabled).toBeTrue();

    locked.click();
    await settle();
    expect(panel()).toBeNull();
  });
});
