import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { GmDatepickerComponent } from './datepicker.component';
import { gmFormatDate, gmParseDate } from './date-utils';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmDatepickerComponent],
  template: `
    <gm-datepicker class="iso" [formControl]="iso" valueFormat="iso" />
    <gm-datepicker class="utc" [formControl]="utc" valueFormat="utc" />
    <gm-datepicker class="ts" [formControl]="ts" valueFormat="timestamp" />
    <gm-datepicker class="unix" [formControl]="unix" valueFormat="unix" />
    <gm-datepicker class="pattern" [formControl]="pattern" valueFormat="dd/MM/yyyy" dateFormat="MMM dd, yyyy" />
  `,
})
class HostComponent {
  readonly iso = new FormControl<unknown>(null);
  readonly utc = new FormControl<unknown>(null);
  readonly ts = new FormControl<unknown>(null);
  readonly unix = new FormControl<unknown>(null);
  readonly pattern = new FormControl<unknown>(null);
}

describe('gm-datepicker valueFormat and month/year jump', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const open = (sel: string) => {
    (fixture.nativeElement.querySelector(`${sel} .gm-datepicker__trigger`) as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  const selects = () =>
    Array.from(
      document.querySelectorAll('.cdk-overlay-container .gm-datepicker__jump-select'),
    ) as HTMLSelectElement[];
  const dayByText = (text: string) =>
    (
      Array.from(
        document.querySelectorAll('.cdk-overlay-container .gm-datepicker__day'),
      ) as HTMLButtonElement[]
    ).find((d) => d.textContent?.trim() === text && !d.classList.contains('gm-datepicker__day--outside'))!;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('jumps straight to a month and year, then selects a day', () => {
    host.iso.setValue('2026-08-15');
    fixture.detectChanges();
    open('.iso');

    const [month, year] = selects();
    year.value = '2031';
    year.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    month.value = '2';
    month.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    dayByText('10').click();
    fixture.detectChanges();
    expect(host.iso.value).toBe('2031-03-10');
  });

  it('emits iso, utc, timestamp, unix and pattern values', () => {
    const picked = new Date(2026, 7, 24);
    // Seed August 2026 so the calendar opens on the month being picked.
    const emit = (sel: string, control: FormControl<unknown>) => {
      control.setValue('2026-08-01');
      fixture.detectChanges();
      open(sel);
      dayByText('24').click();
      fixture.detectChanges();
      return control.value;
    };

    expect(emit('.iso', host.iso)).toBe('2026-08-24');
    expect(emit('.utc', host.utc)).toBe(picked.toISOString());
    expect(emit('.ts', host.ts)).toBe(picked.getTime());
    expect(emit('.unix', host.unix)).toBe(Math.floor(picked.getTime() / 1000));
    expect(emit('.pattern', host.pattern)).toBe('24/08/2026');
  });

  it('reads each format back without shifting the day', () => {
    const local = new Date(2026, 7, 24);
    host.utc.setValue(local.toISOString());
    host.ts.setValue(local.getTime());
    host.unix.setValue(Math.floor(local.getTime() / 1000));
    host.pattern.setValue('24/08/2026');
    fixture.detectChanges();

    const text = (sel: string) =>
      fixture.nativeElement.querySelector(`${sel} .gm-datepicker__value`).textContent.trim();
    expect(text('.utc')).toBe('24/08/2026');
    expect(text('.ts')).toBe('24/08/2026');
    expect(text('.unix')).toBe('24/08/2026');
    expect(text('.pattern')).toBe('Aug 24, 2026');
  });

  it('formats and parses patterns', () => {
    const date = new Date(2026, 7, 4, 9, 5);
    expect(gmFormatDate(date, 'yyyy-MM-dd HH:mm')).toBe('2026-08-04 09:05');
    expect(gmFormatDate(date, 'MMMM yy')).toContain('26');
    expect(gmParseDate('04/08/2026', 'dd/MM/yyyy')?.getTime()).toBe(new Date(2026, 7, 4).getTime());
    expect(gmParseDate('31/02/2026', 'dd/MM/yyyy')).toBeNull();
  });
});
