import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { GmDatepickerComponent } from './datepicker.component';
import type { GmDateRange } from './datepicker.types';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmDatepickerComponent],
  template: `
    <gm-datepicker
      class="datetime"
      [formControl]="appointment"
      [showTime]="true"
      [clearable]="true"
    />
    <gm-datepicker
      class="datetime12"
      [formControl]="meeting"
      [showTime]="true"
      [hourFormat]="12"
    />
    <gm-datepicker class="timeonly" [formControl]="startTime" [timeOnly]="true" />
    <gm-datepicker
      class="range"
      [formControl]="period"
      selectionMode="range"
      [clearable]="true"
    />
    <gm-datepicker
      class="boundedRange"
      [formControl]="boundedPeriod"
      selectionMode="range"
      [minDate]="min"
      [maxDate]="max"
    />
    <gm-datepicker
      class="lockedTime"
      [formControl]="locked"
      [timeOnly]="true"
      [readonly]="true"
    />
  `,
})
class HostComponent {
  readonly appointment = new FormControl<Date | null>(null);
  readonly meeting = new FormControl<Date | null>(null);
  readonly startTime = new FormControl<Date | null>(null);
  readonly period = new FormControl<GmDateRange | null>(null);
  readonly boundedPeriod = new FormControl<GmDateRange | null>(null);
  readonly locked = new FormControl<Date | null>(new Date(2026, 7, 12, 9, 30));
  // Local-midnight dates throughout — never parsed from a string.
  readonly min = new Date(2026, 7, 10);
  readonly max = new Date(2026, 7, 20);
}

describe('gm-datepicker time and range', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const trigger = (sel: string) =>
    fixture.nativeElement.querySelector(
      `${sel} .gm-datepicker__trigger`,
    ) as HTMLButtonElement;
  const panel = () =>
    document.querySelector('.cdk-overlay-container .gm-datepicker__panel');
  const valueText = (sel: string) =>
    (
      fixture.nativeElement.querySelector(
        `${sel} .gm-datepicker__value`,
      ) as HTMLElement | null
    )?.textContent?.trim() ?? null;
  const days = () =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '.cdk-overlay-container .gm-datepicker__day',
      ),
    );
  const dayByText = (text: string) =>
    days().find(
      (day) =>
        day.textContent?.trim() === text &&
        !day.classList.contains('gm-datepicker__day--outside'),
    )!;
  const timeSelects = () =>
    Array.from(
      document.querySelectorAll<HTMLSelectElement>(
        '.cdk-overlay-container .gm-datepicker__time-select',
      ),
    );

  function open(sel: string): void {
    trigger(sel).click();
    fixture.detectChanges();
  }

  function pick(select: HTMLSelectElement, value: string): void {
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function press(key: string): void {
    (panel()!.querySelector('.gm-datepicker__grid') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
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

  // ── Date + time ───────────────────────────────────────────────────────────

  it('renders a pre-set date and time on the trigger', () => {
    host.appointment.setValue(new Date(2026, 7, 12, 14, 5));
    fixture.detectChanges();

    expect(valueText('.datetime')).toBe('12/08/2026 14:05');
  });

  it('shows hour and minute controls alongside the calendar', () => {
    open('.datetime');

    expect(panel()!.querySelector('.gm-datepicker__grid')).not.toBeNull();
    const [hour, minute] = timeSelects();
    expect(hour.getAttribute('aria-label')).toBe('Hour');
    expect(minute.getAttribute('aria-label')).toBe('Minute');
    // 24-hour mode has no meridiem control.
    expect(timeSelects().length).toBe(2);
    expect(hour.options.length).toBe(24);
    expect(minute.options.length).toBe(60);
  });

  it('keeps the panel open after picking a day, so the time can be set', () => {
    host.appointment.setValue(new Date(2026, 7, 12, 0, 0));
    fixture.detectChanges();
    open('.datetime');

    dayByText('15').click();
    fixture.detectChanges();

    expect(panel()).not.toBeNull();
    expect(host.appointment.value).toEqual(new Date(2026, 7, 15, 0, 0));
  });

  it('preserves the date when the time changes', () => {
    host.appointment.setValue(new Date(2026, 7, 12, 8, 0));
    fixture.detectChanges();
    open('.datetime');

    const [hour, minute] = timeSelects();
    pick(hour, '17');
    pick(minute, '45');

    expect(host.appointment.value).toEqual(new Date(2026, 7, 12, 17, 45));
  });

  it('preserves the time when the date changes', () => {
    host.appointment.setValue(new Date(2026, 7, 12, 17, 45));
    fixture.detectChanges();
    open('.datetime');

    dayByText('20').click();
    fixture.detectChanges();

    expect(host.appointment.value).toEqual(new Date(2026, 7, 20, 17, 45));
  });

  it('coerces a yyyy-MM-ddTHH:mm string without shifting the day or hour', () => {
    host.appointment.setValue('2026-08-12T14:05' as unknown as Date);
    fixture.detectChanges();

    // The rendered value is what the coerced internal Date produced; a UTC
    // parse would have moved the day west of UTC.
    expect(valueText('.datetime')).toBe('12/08/2026 14:05');

    // And the day it commits from is the coerced one, not a shifted one.
    open('.datetime');
    pick(timeSelects()[1], '30');
    expect(host.appointment.value).toEqual(new Date(2026, 7, 12, 14, 30));
  });

  it('clears a date-and-time value to null', () => {
    host.appointment.setValue(new Date(2026, 7, 12, 14, 5));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.datetime .gm-datepicker__clear',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(host.appointment.value).toBeNull();
  });

  // ── 12-hour mode ──────────────────────────────────────────────────────────

  it('offers 1–12 plus a meridiem control in 12-hour mode', () => {
    host.meeting.setValue(new Date(2026, 7, 12, 14, 30));
    fixture.detectChanges();
    open('.datetime12');

    const selects = timeSelects();
    expect(selects.length).toBe(3);
    expect(selects[0].options.length).toBe(12);
    expect(selects[2].getAttribute('aria-label')).toBe('AM or PM');
    // 14:30 reads as 02:30 PM.
    expect(selects[0].value).toBe('2');
    expect(selects[2].value).toBe('PM');
    expect(valueText('.datetime12')).toBe('12/08/2026 02:30 PM');
  });

  it('converts a 12-hour pick back to a 24-hour value', () => {
    host.meeting.setValue(new Date(2026, 7, 12, 14, 30));
    fixture.detectChanges();
    open('.datetime12');

    // 9 PM.
    pick(timeSelects()[0], '9');
    expect((host.meeting.value as Date).getHours()).toBe(21);

    // Same hour, switched to AM.
    pick(timeSelects()[2], 'AM');
    expect((host.meeting.value as Date).getHours()).toBe(9);

    // Midnight is 12 AM, not hour 12.
    pick(timeSelects()[0], '12');
    expect((host.meeting.value as Date).getHours()).toBe(0);
  });

  // ── Time only ─────────────────────────────────────────────────────────────

  it('shows no calendar when timeOnly is set', () => {
    open('.timeonly');

    expect(panel()!.querySelector('.gm-datepicker__grid')).toBeNull();
    expect(panel()!.querySelector('.gm-datepicker__header')).toBeNull();
    expect(timeSelects().length).toBe(2);
    expect(panel()!.getAttribute('aria-label')).toBe('Time');
  });

  it('produces a Date from the first time interaction', () => {
    open('.timeonly');

    pick(timeSelects()[0], '9');
    pick(timeSelects()[1], '15');

    const value = host.startTime.value as Date;
    const today = new Date();
    expect(value instanceof Date).toBeTrue();
    expect(value.getHours()).toBe(9);
    expect(value.getMinutes()).toBe(15);
    // The date part is today, built from local parts.
    expect(value.getDate()).toBe(today.getDate());
    expect(value.getMonth()).toBe(today.getMonth());
  });

  it('displays a time-only value as the time alone', () => {
    host.startTime.setValue(new Date(2026, 7, 12, 7, 5));
    fixture.detectChanges();

    expect(valueText('.timeonly')).toBe('07:05');
  });

  it('accepts a bare HH:mm string', () => {
    host.startTime.setValue('08:45' as unknown as Date);
    fixture.detectChanges();

    expect(valueText('.timeonly')).toBe('08:45');

    // The coerced value is a real Date, so the next edit builds on it.
    open('.timeonly');
    pick(timeSelects()[0], '9');
    const value = host.startTime.value as Date;
    expect(value.getHours()).toBe(9);
    expect(value.getMinutes()).toBe(45);
  });

  it('disables the time controls while read-only', () => {
    // Read-only blocks opening, so the panel never renders — the value still
    // shows on the trigger.
    trigger('.lockedTime').click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(valueText('.lockedTime')).toBe('09:30');
  });

  // ── Range ─────────────────────────────────────────────────────────────────

  it('takes a start on the first click and an end on the second', () => {
    open('.range');

    dayByText('10').click();
    fixture.detectChanges();
    expect(host.period.value).toEqual([
      jasmine.any(Date),
      null,
    ] as unknown as GmDateRange);
    expect((host.period.value as GmDateRange)[0]!.getDate()).toBe(10);
    // Still open: the range is not finished.
    expect(panel()).not.toBeNull();

    dayByText('14').click();
    fixture.detectChanges();

    const [start, end] = host.period.value as GmDateRange;
    expect(start!.getDate()).toBe(10);
    expect(end!.getDate()).toBe(14);
    // Completing the range closes the calendar.
    expect(panel()).toBeNull();
  });

  it('swaps the ends when the second click is earlier', () => {
    open('.range');

    dayByText('14').click();
    fixture.detectChanges();
    dayByText('10').click();
    fixture.detectChanges();

    const [start, end] = host.period.value as GmDateRange;
    expect(start!.getDate()).toBe(10);
    expect(end!.getDate()).toBe(14);
    expect(start!.getTime()).toBeLessThan(end!.getTime());
  });

  it('starts a fresh range after one is complete', () => {
    open('.range');
    dayByText('10').click();
    fixture.detectChanges();
    dayByText('14').click();
    fixture.detectChanges();

    open('.range');
    dayByText('20').click();
    fixture.detectChanges();

    const [start, end] = host.period.value as GmDateRange;
    expect(start!.getDate()).toBe(20);
    expect(end).toBeNull();
  });

  it('highlights the start, the span and the end', () => {
    open('.range');
    dayByText('10').click();
    fixture.detectChanges();
    dayByText('13').click();
    fixture.detectChanges();

    // Reopen to inspect the committed range.
    open('.range');

    expect(dayByText('10').classList).toContain(
      'gm-datepicker__day--range-start',
    );
    expect(dayByText('13').classList).toContain('gm-datepicker__day--range-end');
    expect(dayByText('11').classList).toContain('gm-datepicker__day--in-range');
    expect(dayByText('12').classList).toContain('gm-datepicker__day--in-range');
    // The endpoints are announced as selected; the span is not.
    expect(dayByText('10').getAttribute('aria-selected')).toBe('true');
    expect(dayByText('13').getAttribute('aria-selected')).toBe('true');
    expect(dayByText('11').getAttribute('aria-selected')).toBe('false');
  });

  it('previews the span while the end is still being chosen', () => {
    open('.range');
    dayByText('10').click();
    fixture.detectChanges();

    dayByText('12').dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();

    expect(dayByText('11').classList).toContain('gm-datepicker__day--in-range');
    expect(dayByText('12').classList).toContain('gm-datepicker__day--range-end');
    // A preview is not a selection.
    expect(dayByText('12').getAttribute('aria-selected')).toBe('false');
  });

  it('renders a pre-set range on the trigger', () => {
    host.period.setValue([new Date(2026, 7, 10), new Date(2026, 7, 14)]);
    fixture.detectChanges();

    expect(valueText('.range')).toBe('10/08/2026 – 14/08/2026');
  });

  it('shows only the start while a range is half-built', () => {
    host.period.setValue([new Date(2026, 7, 10), null]);
    fixture.detectChanges();

    expect(valueText('.range')).toBe('10/08/2026');
  });

  it('reads a null control value as an empty range', () => {
    expect(valueText('.range')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.range .gm-datepicker__placeholder'),
    ).not.toBeNull();
  });

  it('clears a range back to an empty tuple', () => {
    host.period.setValue([new Date(2026, 7, 10), new Date(2026, 7, 14)]);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.range .gm-datepicker__clear',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(host.period.value).toEqual([null, null]);
    expect(
      fixture.nativeElement.querySelector('.range .gm-datepicker__placeholder'),
    ).not.toBeNull();
  });

  it('stores range endpoints at local midnight, not UTC', () => {
    open('.range');
    dayByText('10').click();
    fixture.detectChanges();
    dayByText('14').click();
    fixture.detectChanges();

    for (const end of host.period.value as GmDateRange) {
      expect(end!.getHours()).toBe(0);
      expect(end!.getMinutes()).toBe(0);
    }
  });

  // ── Range + min/max ───────────────────────────────────────────────────────

  it('cannot use a disabled day as a range endpoint', () => {
    open('.boundedRange');

    // 9 August is before minDate.
    const outside = dayByText('9');
    expect(outside.disabled).toBeTrue();
    outside.click();
    fixture.detectChanges();
    expect(host.boundedPeriod.value).toBeNull();

    // 21 August is past maxDate.
    expect(dayByText('21').disabled).toBeTrue();
  });

  it('keeps a range inside min/max', () => {
    open('.boundedRange');

    dayByText('10').click();
    fixture.detectChanges();
    dayByText('20').click();
    fixture.detectChanges();

    const [start, end] = host.boundedPeriod.value as GmDateRange;
    expect(start!.getTime()).toBeGreaterThanOrEqual(host.min.getTime());
    expect(end!.getTime()).toBeLessThanOrEqual(host.max.getTime());
  });

  // ── Keyboard ──────────────────────────────────────────────────────────────

  it('builds a range from the keyboard', () => {
    open('.range');

    press('Enter');
    const [start] = host.period.value as GmDateRange;
    expect(start).not.toBeNull();
    expect(panel()).not.toBeNull();

    press('ArrowRight');
    press('ArrowRight');
    press('Enter');

    const [from, to] = host.period.value as GmDateRange;
    expect(to!.getTime() - from!.getTime()).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it('closes a time-only panel on Escape', () => {
    open('.timeonly');
    expect(panel()).not.toBeNull();

    (panel() as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('setDisabledState blocks a range picker', () => {
    host.period.disable();
    fixture.detectChanges();

    expect(trigger('.range').disabled).toBeTrue();
    trigger('.range').click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });
});

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmDatepickerComponent],
  template: `
    <gm-datepicker
      class="halfHour"
      [formControl]="slot"
      [timeOnly]="true"
      [stepMinute]="30"
    />
    <gm-datepicker
      class="everyThirdHour"
      [formControl]="shift"
      [timeOnly]="true"
      [stepHour]="3"
    />
    <gm-datepicker
      class="zeroStep"
      [formControl]="anyTime"
      [timeOnly]="true"
      [stepMinute]="0"
    />
  `,
})
class StepHostComponent {
  readonly slot = new FormControl<Date | null>(null);
  readonly shift = new FormControl<Date | null>(null);
  readonly anyTime = new FormControl<Date | null>(null);
}

describe('gm-datepicker time steps', () => {
  let fixture: ComponentFixture<StepHostComponent>;

  const open = (cls: string) => {
    (
      fixture.nativeElement.querySelector(
        `${cls} .gm-datepicker__trigger`,
      ) as HTMLElement
    ).click();
    fixture.detectChanges();
  };
  const timeSelects = () =>
    Array.from(
      document.querySelectorAll<HTMLSelectElement>(
        '.cdk-overlay-container .gm-datepicker__time-select',
      ),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(StepHostComponent);
    fixture.detectChanges();
  });

  it('offers only the stepped minutes', () => {
    open('.halfHour');
    const [, minute] = timeSelects();

    expect(minute.options.length).toBe(2);
    expect(Array.from(minute.options).map((o) => o.value)).toEqual(['0', '30']);
  });

  it('steps the hour list too', () => {
    open('.everyThirdHour');
    const [hour] = timeSelects();

    expect(Array.from(hour.options).map((o) => o.value)).toEqual([
      '0',
      '3',
      '6',
      '9',
      '12',
      '15',
      '18',
      '21',
    ]);
  });

  // A step below 1 would make an empty or endless list; fall back to every value.
  it('treats a step below 1 as no step', () => {
    open('.zeroStep');
    const [, minute] = timeSelects();

    expect(minute.options.length).toBe(60);
  });
});
