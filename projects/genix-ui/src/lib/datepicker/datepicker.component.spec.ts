import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GmDatepickerComponent } from './datepicker.component';
import { gmCoerceDate, gmFormatDate, gmAddMonths } from './date-utils';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmDatepickerComponent],
  template: `
    <gm-datepicker
      class="main"
      [formControl]="date"
      label="Start Date"
      placeholder="Select date"
      [clearable]="true"
      [showButtonBar]="true"
    />
    <gm-datepicker
      class="bounded"
      [formControl]="bounded"
      [minDate]="min"
      [maxDate]="max"
    />
  `,
})
class HostComponent {
  readonly date = new FormControl<Date | null>(null, Validators.required);
  readonly bounded = new FormControl<Date | null>(null);
  // Local-midnight dates throughout — never parsed from a string.
  readonly min = new Date(2026, 7, 10);
  readonly max = new Date(2026, 7, 20);
}

describe('gm-datepicker', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const trigger = (sel = '.main') =>
    fixture.nativeElement.querySelector(
      `${sel} .gm-datepicker__trigger`,
    ) as HTMLButtonElement;
  const panel = () =>
    document.querySelector('.cdk-overlay-container .gm-datepicker__panel');
  const days = () =>
    Array.from(
      document.querySelectorAll('.cdk-overlay-container .gm-datepicker__day'),
    ) as HTMLButtonElement[];
  const dayByText = (text: string) =>
    days().find((d) => d.textContent?.trim() === text && !d.classList.contains('gm-datepicker__day--outside'))!;
  const monthLabel = () =>
    (panel()!.querySelector('.gm-datepicker__month') as HTMLElement).textContent!.trim();

  const open = (sel = '.main') => {
    trigger(sel).click();
    fixture.detectChanges();
  };
  const press = (key: string) => {
    (panel()!.querySelector('.gm-datepicker__grid') as HTMLElement).dispatchEvent(
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
    if (panel()) {
      press('Escape');
    }
  });

  // ── timezone safety ───────────────────────────────────────────────────

  it('coerces a yyyy-MM-dd string without shifting the calendar day', () => {
    // `new Date('2026-08-24')` is parsed as UTC and lands on the 23rd west of
    // UTC. The util must read the parts instead.
    const coerced = gmCoerceDate('2026-08-24')!;
    expect(coerced.getFullYear()).toBe(2026);
    expect(coerced.getMonth()).toBe(7);
    expect(coerced.getDate()).toBe(24);
  });

  it('keeps the day when a string value round-trips through the control', () => {
    host.date.setValue('2026-08-01' as unknown as Date);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.main .gm-datepicker__value')
        .textContent,
    ).toContain('01/08/2026');
  });

  it('stores selections at local midnight, not UTC', () => {
    open();
    dayByText('15').click();
    fixture.detectChanges();
    const value = host.date.value!;
    expect(value.getHours()).toBe(0);
    expect(value.getMinutes()).toBe(0);
  });

  it('clamps a month shift instead of rolling over a short month', () => {
    // 31 Jan + 1 month must be 28 Feb, not 3 March.
    const shifted = gmAddMonths(new Date(2026, 0, 31), 1);
    expect(shifted.getMonth()).toBe(1);
    expect(shifted.getDate()).toBe(28);
  });

  // ── writeValue / display ──────────────────────────────────────────────

  it('renders a pre-set Date in the configured format', () => {
    host.date.setValue(new Date(2026, 7, 24));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.main .gm-datepicker__value')
        .textContent,
    ).toContain('24/08/2026');
  });

  it('shows the placeholder while empty', () => {
    expect(
      fixture.nativeElement.querySelector('.main .gm-datepicker__placeholder')
        .textContent,
    ).toContain('Select date');
  });

  it('formats with the requested tokens', () => {
    const d = new Date(2026, 7, 9);
    expect(gmFormatDate(d, 'dd/MM/yyyy')).toBe('09/08/2026');
    expect(gmFormatDate(d, 'yyyy-MM-dd')).toBe('2026-08-09');
    expect(gmFormatDate(d, 'dd.MM.yy')).toBe('09.08.26');
  });

  // ── open / close ──────────────────────────────────────────────────────

  it('opens a dialog-role calendar wired to the trigger', () => {
    open();
    expect(panel()).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(panel()!.id);
    expect(panel()!.getAttribute('role')).toBe('dialog');
  });

  it('uses real buttons for days, never clickable divs', () => {
    open();
    expect(days().length).toBe(42);
    expect(days().every((d) => d.tagName === 'BUTTON')).toBeTrue();
    expect(panel()!.querySelector('table[role="grid"]')).toBeTruthy();
  });

  it('closes on Escape and on outside click', () => {
    open();
    press('Escape');
    expect(panel()).toBeNull();

    open();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('marks the control touched when the calendar closes', () => {
    expect(host.date.touched).toBeFalse();
    open();
    press('Escape');
    expect(host.date.touched).toBeTrue();
  });

  // ── selection / clear ─────────────────────────────────────────────────

  it('selects a day, closes, and reports the Date', () => {
    open();
    dayByText('12').click();
    fixture.detectChanges();
    expect(host.date.value!.getDate()).toBe(12);
    expect(panel()).toBeNull();
  });

  it('clears to null without reopening the calendar', () => {
    host.date.setValue(new Date(2026, 7, 24));
    fixture.detectChanges();
    const clear = fixture.nativeElement.querySelector(
      '.main .gm-datepicker__clear',
    ) as HTMLButtonElement;
    expect(clear.tagName).toBe('BUTTON');
    clear.click();
    fixture.detectChanges();
    expect(host.date.value).toBeNull();
    expect(panel()).toBeNull();
  });

  it('offers no clear action while empty', () => {
    expect(
      fixture.nativeElement.querySelector('.main .gm-datepicker__clear'),
    ).toBeNull();
  });

  it('picks today from the button bar', () => {
    open();
    const today = panel()!.querySelectorAll('gm-button button')[0] as HTMLButtonElement;
    today.click();
    fixture.detectChanges();
    expect(host.date.value!.getDate()).toBe(new Date().getDate());
  });

  // ── min / max ─────────────────────────────────────────────────────────

  it('disables days outside the range and blocks selecting them', () => {
    host.bounded.setValue(new Date(2026, 7, 15));
    fixture.detectChanges();
    open('.bounded');

    expect(dayByText('9').disabled).toBeTrue();
    expect(dayByText('21').disabled).toBeTrue();
    expect(dayByText('10').disabled).toBeFalse();
    expect(dayByText('20').disabled).toBeFalse();

    dayByText('9').click();
    fixture.detectChanges();
    expect(host.bounded.value!.getDate()).toBe(15);
  });

  it('clamps keyboard movement to the allowed range', () => {
    host.bounded.setValue(new Date(2026, 7, 10));
    fixture.detectChanges();
    open('.bounded');

    // Already on the minimum; going back must not escape the range.
    press('ArrowLeft');
    press('ArrowLeft');
    press('Enter');
    expect(host.bounded.value!.getDate()).toBe(10);
  });

  it('disables month navigation that would leave the range entirely', () => {
    open('.bounded');
    const [prev, next] = Array.from(
      panel()!.querySelectorAll('.gm-datepicker__nav'),
    ) as HTMLButtonElement[];
    expect(prev.disabled).toBeTrue();
    expect(next.disabled).toBeTrue();
  });

  // ── navigation / keyboard ─────────────────────────────────────────────

  it('moves a month with the nav buttons', () => {
    host.date.setValue(new Date(2026, 7, 15));
    fixture.detectChanges();
    open();
    const before = monthLabel();

    (panel()!.querySelectorAll('.gm-datepicker__nav')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(monthLabel()).not.toBe(before);

    (panel()!.querySelectorAll('.gm-datepicker__nav')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(monthLabel()).toBe(before);
  });

  it('navigates days with arrows and selects with Enter', () => {
    host.date.setValue(new Date(2026, 7, 15));
    fixture.detectChanges();
    open();

    press('ArrowRight');
    press('Enter');
    expect(host.date.value!.getDate()).toBe(16);
  });

  it('moves a week with ArrowUp/ArrowDown', () => {
    host.date.setValue(new Date(2026, 7, 15));
    fixture.detectChanges();
    open();
    press('ArrowDown');
    press('Enter');
    expect(host.date.value!.getDate()).toBe(22);
  });

  it('pages months with PageUp/PageDown', () => {
    host.date.setValue(new Date(2026, 7, 15));
    fixture.detectChanges();
    open();
    press('PageDown');
    press('Enter');
    expect(host.date.value!.getMonth()).toBe(8);
  });

  it('keeps only the focused day in the tab order', () => {
    host.date.setValue(new Date(2026, 7, 15));
    fixture.detectChanges();
    open();
    const focusable = days().filter((d) => d.getAttribute('tabindex') === '0');
    expect(focusable.length).toBe(1);
    expect(focusable[0].textContent?.trim()).toBe('15');
  });

  // ── disabled ──────────────────────────────────────────────────────────

  it('setDisabledState disables the trigger and blocks opening', () => {
    host.date.disable();
    fixture.detectChanges();
    expect(trigger().disabled).toBeTrue();
    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeNull();

    host.date.enable();
    fixture.detectChanges();
    expect(trigger().disabled).toBeFalse();
  });

  it('flags the error state once a required control is touched', () => {
    const hostEl = fixture.nativeElement.querySelector('gm-datepicker.main');
    host.date.markAsTouched();
    fixture.detectChanges();
    expect(hostEl.classList).toContain('gm-datepicker-host--invalid');
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
  });
});
