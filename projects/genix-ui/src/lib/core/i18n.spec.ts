import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { GmInputComponent } from '../input/input.component';
import { GmMultiselectComponent } from '../multiselect/multiselect.component';
import { GmSelectComponent } from '../select/select.component';
import { gmFormat, provideGmLabels } from './i18n';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmInputComponent, GmSelectComponent],
  template: `
    <gm-input class="named" label="Name" [formControl]="text" />
    <gm-input class="bare" [formControl]="text" />
    <gm-input class="explicit" label="Name" placeholder="Custom" [formControl]="text" />
    <gm-select class="pick" label="Country" [options]="[]" [formControl]="text" />
  `,
})
class HostComponent {
  readonly text = new FormControl<string | null>(null);
}

describe('form labels (i18n)', () => {
  describe('defaults', () => {
    it('builds "Enter <label>" and falls back without a label', () => {
      TestBed.configureTestingModule({ imports: [HostComponent] });
      const root = TestBed.createComponent(HostComponent);
      root.detectChanges();
      const el = root.nativeElement as HTMLElement;
      const get = (c: string) =>
        el.querySelector(`.${c} input`)!.getAttribute('placeholder');
      expect(get('named')).toBe('Enter Name');
      expect(get('bare')).toBe('Enter text');
      expect(get('explicit')).toBe('Custom');
      expect(el.querySelector('.pick .gm-dropdown__placeholder')!.textContent).toContain(
        'Select Country',
      );
    });
  });

  it('uses the application translations', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideGmLabels({ enter: 'أدخل {0}', select: 'اختر {0}' })],
    });
    const root = TestBed.createComponent(HostComponent);
    root.detectChanges();
    const el = root.nativeElement as HTMLElement;
    expect(el.querySelector('.named input')!.getAttribute('placeholder')).toBe('أدخل Name');
    expect(el.querySelector('.pick .gm-dropdown__placeholder')!.textContent).toContain(
      'اختر Country',
    );
  });

  it('fills {0} placeholders', () => {
    expect(gmFormat('{0} of {1}', 2, 5)).toBe('2 of 5');
    expect(gmFormat('none')).toBe('none');
  });
});

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmMultiselectComponent],
  template: `
    <gm-multiselect
      display="chip"
      [options]="options"
      [maxSelectedLabels]="2"
      [formControl]="control"
    />
  `,
})
class ChipHostComponent {
  readonly options = ['a', 'b', 'c', 'd', 'e'];
  readonly control = new FormControl<string[]>(['a', 'b', 'c', 'd']);
}

describe('gm-multiselect chip display', () => {
  it('draws only maxSelectedLabels chips plus a +N badge', () => {
    TestBed.configureTestingModule({ imports: [ChipHostComponent] });
    const fixture = TestBed.createComponent(ChipHostComponent);
    fixture.detectChanges();
    const chips = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('gm-chip'),
    ).map((c) => c.textContent!.trim());
    expect(chips.length).toBe(3);
    expect(chips[2]).toContain('+2');
  });
});
