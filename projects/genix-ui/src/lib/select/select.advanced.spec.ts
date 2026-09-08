import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { GmSelectOptionDirective } from './select-option.directive';
import { GmSelectValueDirective } from './select-value.directive';
import { GmSelectComponent } from './select.component';

interface User {
  id: number;
  name: string;
  email: string;
}

function buildUsers(count: number): User[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `User ${index}`,
    email: `user${index}@globemed.test`,
  }));
}

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    GmSelectComponent,
    GmSelectOptionDirective,
    GmSelectValueDirective,
  ],
  template: `
    <gm-select
      class="templated"
      [formControl]="userId"
      [options]="users()"
      optionLabel="name"
      optionValue="id"
      placeholder="Pick a user"
      [clearable]="true"
    >
      <ng-template gmSelectOption let-option let-selected="selected" let-i="index">
        <strong class="row-name">{{ option.name }}</strong>
        <span class="row-email">{{ option.email }}</span>
        <span class="row-meta">{{ i }}/{{ selected }}</span>
      </ng-template>

      <ng-template gmSelectValue let-option>
        <span class="value-name">{{ option.name }}</span>
        <span class="value-email">{{ option.email }}</span>
      </ng-template>
    </gm-select>

    <gm-select
      class="virtual"
      [formControl]="bigId"
      [options]="many()"
      optionLabel="name"
      optionValue="id"
      placeholder="Pick"
      [filter]="true"
      [clearable]="true"
      [virtualScroll]="true"
      [virtualItemSize]="40"
    >
      <ng-template gmSelectOption let-option>
        <span class="big-name">{{ option.name }}</span>
      </ng-template>
    </gm-select>

    <gm-select
      class="locked"
      [options]="many()"
      optionLabel="name"
      optionValue="id"
      [virtualScroll]="true"
      [disabled]="true"
    />
  `,
})
class HostComponent {
  readonly users = signal<User[]>([
    { id: 1, name: 'Amira', email: 'amira@globemed.test' },
    { id: 2, name: 'Karim', email: 'karim@globemed.test' },
    { id: 3, name: 'Nadia', email: 'nadia@globemed.test' },
  ]);
  /** 1,200 options — well past the point where a row per option is sensible. */
  readonly many = signal<User[]>(buildUsers(1200));
  readonly userId = new FormControl<number | null>(null);
  readonly bigId = new FormControl<number | null>(null);
}

describe('gm-select custom templates', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const trigger = () =>
    fixture.nativeElement.querySelector(
      '.templated .gm-dropdown__trigger',
    ) as HTMLButtonElement;
  const optionEls = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.cdk-overlay-container [role="option"]',
      ),
    );

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

  it('renders the option template inside the semantic option wrapper', () => {
    trigger().click();
    fixture.detectChanges();

    const [first] = optionEls();
    // The wrapper survives: role, id and selected state are still the
    // component's, not the consumer's.
    expect(first.getAttribute('role')).toBe('option');
    expect(first.id).toBeTruthy();
    expect(first.getAttribute('aria-selected')).toBe('false');
    expect(first.querySelector('.row-name')!.textContent!.trim()).toBe('Amira');
    expect(first.querySelector('.row-email')!.textContent!.trim()).toBe(
      'amira@globemed.test',
    );
  });

  it('hands the template its index and selected state', () => {
    host.userId.setValue(2);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();

    const metas = optionEls().map((el) =>
      el.querySelector('.row-meta')!.textContent!.trim(),
    );
    expect(metas).toEqual(['0/false', '1/true', '2/false']);
  });

  it('selects through the template using optionValue, not the rendered text', () => {
    trigger().click();
    fixture.detectChanges();

    optionEls()[1].click();
    fixture.detectChanges();

    // The template changed presentation only — the control still holds the id.
    expect(host.userId.value).toBe(2);
  });

  it('renders the value template on the trigger', () => {
    host.userId.setValue(3);
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector(
      '.templated .gm-dropdown__value',
    ) as HTMLElement;
    expect(value.querySelector('.value-name')!.textContent!.trim()).toBe('Nadia');
    expect(value.querySelector('.value-email')!.textContent!.trim()).toBe(
      'nadia@globemed.test',
    );
  });

  it('shows the placeholder, not the value template, while empty', () => {
    expect(
      fixture.nativeElement.querySelector('.templated .gm-dropdown__placeholder')
        .textContent,
    ).toContain('Pick a user');
    expect(
      fixture.nativeElement.querySelector('.templated .value-name'),
    ).toBeNull();
  });

  it('clears back to the placeholder', () => {
    host.userId.setValue(1);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.templated .gm-dropdown__clear',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(host.userId.value).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.templated .gm-dropdown__placeholder'),
    ).not.toBeNull();
  });
});

/*
 * Real async rather than `fakeAsync`: virtualisation depends on the browser
 * firing `scroll` and on the CDK measuring across animation frames, and neither
 * is a task the virtual clock can flush. These tests let the real ones happen.
 */
describe('gm-select virtual scroll', () => {
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
    // A row per option would be 1,200 nodes; a fixed-size window plus the CDK's
    // buffer is a small multiple of the ~6 rows that fit in 16rem.
    expect(rendered.length).toBeLessThan(100);
  });

  it('keeps the listbox semantics and links the trigger to it', async () => {
    await open();

    const listbox = viewport()!;
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(trigger().getAttribute('aria-controls')).toBe(listbox.id);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(optionEls()[0].getAttribute('aria-selected')).toBe('false');
  });

  it('renders the custom option template in virtualised rows', async () => {
    await open();

    const [first] = optionEls();
    expect(first.querySelector('.big-name')!.textContent!.trim()).toBe('User 0');
  });

  it('virtualises the filtered result without touching the source array', async () => {
    const source = host.many();
    await open();

    filterInput().value = 'User 7';
    filterInput().dispatchEvent(new Event('input'));
    await settle();

    const rendered = optionEls();
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(100);
    expect(rendered[0].textContent).toContain('User 7');

    expect(host.many()).toBe(source);
    expect(host.many().length).toBe(1200);
  });

  it('shows the empty message when the filter matches nothing', async () => {
    await open();

    filterInput().value = 'no-such-user';
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
    // The highlighted row is rendered, so the id actually resolves.
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
    // Row 1,199 is nowhere near the initial window; it exists only because the
    // list was scrolled to it.
    expect(document.getElementById(lastId)).not.toBeNull();
    expect(viewport()!.scrollTop).toBeGreaterThan(0);

    await keydown('Home');
    const firstId = trigger().getAttribute('aria-activedescendant')!;
    expect(firstId).toContain('option-0');
    expect(document.getElementById(firstId)).not.toBeNull();
    expect(viewport()!.scrollTop).toBe(0);
  });

  it('selects the highlighted option with Enter', async () => {
    await open();

    await keydown('ArrowDown');
    await keydown('Enter');

    expect(host.bigId.value).toBe(1);
    expect(panel()).toBeNull();
  });

  it('keeps a far-down selection correct through scrolling', async () => {
    host.bigId.setValue(900);
    await settle();
    expect(
      fixture.nativeElement.querySelector('.virtual .gm-dropdown__value')
        .textContent,
    ).toContain('User 900');

    await open();
    // The highlight starts on the selection, so it is already named even before
    // that row has been scrolled into existence.
    expect(trigger().getAttribute('aria-activedescendant')).toContain(
      'option-900',
    );

    // One arrow key reveals the neighbourhood of the selection.
    await keydown('ArrowDown');
    expect(viewport()!.scrollTop).toBeGreaterThan(0);

    const selected = document.getElementById(
      trigger().getAttribute('aria-activedescendant')!.replace('901', '900'),
    )!;
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(selected.classList).toContain('gm-dropdown__option--selected');

    // Scrolling back to the top must not disturb the value.
    await keydown('Home');
    expect(host.bigId.value).toBe(900);
    expect(
      fixture.nativeElement.querySelector('.virtual .gm-dropdown__value')
        .textContent,
    ).toContain('User 900');
  });

  it('clears the value, and closes and reopens cleanly', async () => {
    host.bigId.setValue(5);
    await settle();

    (
      fixture.nativeElement.querySelector(
        '.virtual .gm-dropdown__clear',
      ) as HTMLButtonElement
    ).click();
    await settle();
    expect(host.bigId.value).toBeNull();
    expect(panel()).toBeNull();

    await open();
    expect(panel()).not.toBeNull();
    await keydown('Escape');
    expect(panel()).toBeNull();
  });

  it('does not open while disabled', async () => {
    const locked = trigger('.locked');
    expect(locked.disabled).toBeTrue();

    locked.click();
    await settle();
    expect(panel()).toBeNull();
  });
});
