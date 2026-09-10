import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GmInputComponent } from './input.component';
import { GmTextareaComponent } from '../textarea/textarea.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmInputComponent, GmTextareaComponent],
  template: `
    <gm-input [formControl]="name" label="Name" [error]="errorText" />
    <gm-textarea [formControl]="notes" label="Notes" [rows]="4" />
  `,
})
class HostComponent {
  readonly name = new FormControl('', Validators.required);
  readonly notes = new FormControl('');
  errorText = '';
}

describe('gm-input / gm-textarea reactive forms integration', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const input = () =>
    fixture.nativeElement.querySelector('gm-input input') as HTMLInputElement;
  const textarea = () =>
    fixture.nativeElement.querySelector(
      'gm-textarea textarea',
    ) as HTMLTextAreaElement;

  const type = (element: HTMLInputElement | HTMLTextAreaElement, v: string) => {
    element.value = v;
    element.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] })
      .compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a label wired to a generated id', () => {
    const label = fixture.nativeElement.querySelector(
      'gm-input label',
    ) as HTMLLabelElement;
    expect(input().id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input().id);
  });

  it('gives each instance a distinct id', () => {
    expect(input().id).not.toBe(textarea().id);
  });

  it('writeValue pushes a control value into the DOM', () => {
    host.name.setValue('Ada');
    fixture.detectChanges();
    expect(input().value).toBe('Ada');
  });

  it('registerOnChange propagates typing back to the control', () => {
    type(input(), 'Grace');
    expect(host.name.value).toBe('Grace');
    expect(host.name.dirty).toBeTrue();
  });

  it('registerOnTouched marks the control touched on blur', () => {
    expect(host.name.touched).toBeFalse();
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(host.name.touched).toBeTrue();
  });

  it('setDisabledState disables the native element', () => {
    expect(input().disabled).toBeFalse();
    host.name.disable();
    fixture.detectChanges();
    expect(input().disabled).toBeTrue();

    host.name.enable();
    fixture.detectChanges();
    expect(input().disabled).toBeFalse();
  });

  it('flags the error state once an invalid control is touched', () => {
    const hostEl = fixture.nativeElement.querySelector('gm-input');
    expect(hostEl.classList).not.toContain('gm-field-host--invalid');

    host.name.markAsTouched();
    fixture.detectChanges();

    expect(hostEl.classList).toContain('gm-field-host--invalid');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('links an explicit error message through aria-describedby', () => {
    host.errorText = 'Name is required';
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector(
      'gm-input .gm-field__error',
    ) as HTMLElement;
    expect(error.textContent?.trim()).toBe('Name is required');
    expect(input().getAttribute('aria-describedby')).toBe(error.id);
  });

  it('tracks the filled state', () => {
    const hostEl = fixture.nativeElement.querySelector('gm-input');
    expect(hostEl.classList).not.toContain('gm-field-host--filled');
    type(input(), 'x');
    expect(hostEl.classList).toContain('gm-field-host--filled');
  });

  it('binds the textarea through the same accessor', () => {
    expect(textarea().rows).toBe(4);
    type(textarea(), 'some notes');
    expect(host.notes.value).toBe('some notes');

    host.notes.setValue('written back');
    fixture.detectChanges();
    expect(textarea().value).toBe('written back');
  });
});

@Component({
  standalone: true,
  imports: [GmInputComponent],
  template: `
    <gm-input label="Search" [iconStart]="iconStart" [iconEnd]="iconEnd" />
  `,
})
class IconHostComponent {
  iconStart?: string;
  iconEnd?: string;
}

describe('gm-input icon slots', () => {
  let fixture: ComponentFixture<IconHostComponent>;
  let host: IconHostComponent;

  const wrapper = () =>
    fixture.nativeElement.querySelector('.gm-input') as HTMLElement;
  const icon = (side: 'start' | 'end') =>
    fixture.nativeElement.querySelector(
      `.gm-input__icon--${side}`,
    ) as HTMLElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IconHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders no icon and no padding class by default', () => {
    expect(icon('start')).toBeNull();
    expect(icon('end')).toBeNull();
    expect(wrapper().classList).not.toContain('gm-input--icon-start');
    expect(wrapper().classList).not.toContain('gm-input--icon-end');
  });

  it('renders a leading icon and flags the control for padding', () => {
    host.iconStart = 'pi pi-search';
    fixture.detectChanges();

    expect(icon('start')!.classList).toContain('pi-search');
    expect(wrapper().classList).toContain('gm-input--icon-start');
  });

  it('renders a trailing icon independently', () => {
    host.iconEnd = 'pi pi-times';
    fixture.detectChanges();

    expect(icon('end')!.classList).toContain('pi-times');
    expect(icon('start')).toBeNull();
    expect(wrapper().classList).toContain('gm-input--icon-end');
  });

  it('hides icons from screen readers, since they are decoration', () => {
    host.iconStart = 'pi pi-search';
    fixture.detectChanges();

    expect(icon('start')!.getAttribute('aria-hidden')).toBe('true');
  });
});
