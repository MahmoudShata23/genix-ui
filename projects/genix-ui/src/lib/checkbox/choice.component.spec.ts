import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { GmCheckboxComponent } from './checkbox.component';
import { GmRadioComponent } from '../radio/radio.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmCheckboxComponent, GmRadioComponent],
  template: `
    <gm-checkbox [formControl]="active" label="Active" [error]="errorText" />
    <gm-checkbox [formControl]="terms" label="Terms" [readonly]="true" />
    <gm-radio [formControl]="status" name="status" label="On" value="on" />
    <gm-radio [formControl]="status" name="status" label="Off" value="off" />
  `,
})
class HostComponent {
  readonly active = new FormControl(false, Validators.requiredTrue);
  readonly terms = new FormControl(false);
  readonly status = new FormControl<string | null>(null);
  errorText = '';
}

describe('gm-checkbox / gm-radio reactive forms integration', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const boxes = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('gm-checkbox input'),
    ) as HTMLInputElement[];
  const radios = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('gm-radio input'),
    ) as HTMLInputElement[];

  const click = (element: HTMLInputElement) => {
    element.click();
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

  // ── checkbox ──────────────────────────────────────────────────────────

  it('renders a native checkbox with a generated id', () => {
    expect(boxes()[0].type).toBe('checkbox');
    expect(boxes()[0].id).toBeTruthy();
    expect(boxes()[0].id).not.toBe(boxes()[1].id);
  });

  it('wraps the input in its label so the text is a hit target', () => {
    const label = fixture.nativeElement.querySelector(
      'gm-checkbox label',
    ) as HTMLLabelElement;
    expect(label.contains(boxes()[0])).toBeTrue();
  });

  it('writeValue reflects the control value into the DOM', () => {
    expect(boxes()[0].checked).toBeFalse();
    host.active.setValue(true);
    fixture.detectChanges();
    expect(boxes()[0].checked).toBeTrue();
  });

  it('toggling propagates a boolean and marks the control touched', () => {
    click(boxes()[0]);
    expect(host.active.value).toBeTrue();
    expect(host.active.touched).toBeTrue();

    click(boxes()[0]);
    expect(host.active.value).toBeFalse();
  });

  it('setDisabledState disables the native element', () => {
    host.active.disable();
    fixture.detectChanges();
    expect(boxes()[0].disabled).toBeTrue();

    host.active.enable();
    fixture.detectChanges();
    expect(boxes()[0].disabled).toBeFalse();
  });

  it('readonly blocks the value change but keeps the visual state', () => {
    click(boxes()[1]);
    expect(host.terms.value).toBeFalse();
    expect(boxes()[1].checked).toBeFalse();
    expect(boxes()[1].getAttribute('aria-readonly')).toBe('true');
  });

  it('flags the error state and links the message', () => {
    const hostEl = fixture.nativeElement.querySelector('gm-checkbox');
    host.errorText = 'You must accept';
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector(
      'gm-checkbox .gm-choice__error',
    ) as HTMLElement;
    expect(hostEl.classList).toContain('gm-choice-host--invalid');
    expect(error.textContent?.trim()).toBe('You must accept');
    expect(boxes()[0].getAttribute('aria-describedby')).toBe(error.id);
    expect(boxes()[0].getAttribute('aria-invalid')).toBe('true');
  });

  it('exposes indeterminate independently of checked', () => {
    // Not bound in the host template, so it must default to false.
    expect(boxes()[0].indeterminate).toBeFalse();
  });

  // ── radio group ───────────────────────────────────────────────────────

  it('renders native radios sharing one name', () => {
    expect(radios().length).toBe(2);
    expect(radios()[0].type).toBe('radio');
    expect(radios().every((r) => r.name === 'status')).toBeTrue();
  });

  it('selects only the option matching the control value', () => {
    host.status.setValue('off');
    fixture.detectChanges();
    expect(radios()[0].checked).toBeFalse();
    expect(radios()[1].checked).toBeTrue();
  });

  it('picking an option writes that option value to the shared control', () => {
    click(radios()[0]);
    expect(host.status.value).toBe('on');
    expect(host.status.touched).toBeTrue();

    click(radios()[1]);
    expect(host.status.value).toBe('off');
  });

  it('keeps both instances in step when the control changes', () => {
    click(radios()[0]);
    expect(radios()[0].checked).toBeTrue();
    expect(radios()[1].checked).toBeFalse();

    host.status.setValue('off');
    fixture.detectChanges();
    expect(radios()[0].checked).toBeFalse();
    expect(radios()[1].checked).toBeTrue();
  });

  it('disables every option in the group at once', () => {
    host.status.disable();
    fixture.detectChanges();
    expect(radios().every((r) => r.disabled)).toBeTrue();
  });
});

@Component({
  standalone: true,
  imports: [FormsModule, GmRadioComponent, GmCheckboxComponent],
  template: `
    @for (opt of options; track opt) {
      <gm-radio name="view" [value]="opt" [label]="'View ' + opt"
                [(ngModel)]="picked" (valueChange)="emitted = picked" />
    }
    <gm-checkbox label="Flag" [(ngModel)]="flag" />
  `,
})
class NgModelHostComponent {
  readonly options = [0, 2];
  picked = 0;
  flag = false;
  emitted: number | null = null;
}

// The migrated radio group in `manage-providers` is template-driven, so the
// ngModel path needs the same coverage as the reactive one.
describe('gm-radio / gm-checkbox with ngModel', () => {
  let fixture: ComponentFixture<NgModelHostComponent>;
  let host: NgModelHostComponent;

  const radios = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('gm-radio input'),
    ) as HTMLInputElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgModelHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(NgModelHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('checks the option matching the bound model', () => {
    expect(radios()[0].checked).toBeTrue();
    expect(radios()[1].checked).toBeFalse();
  });

  it('writes the picked option back through ngModel', async () => {
    radios()[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.picked).toBe(2);
  });

  it('updates the model before valueChange fires, as the migration assumes', () => {
    radios()[1].click();
    fixture.detectChanges();
    expect(host.emitted).toBe(2);
  });

  it('binds a checkbox through ngModel', async () => {
    const box = fixture.nativeElement.querySelector(
      'gm-checkbox input',
    ) as HTMLInputElement;
    box.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.flag).toBeTrue();
  });
});
