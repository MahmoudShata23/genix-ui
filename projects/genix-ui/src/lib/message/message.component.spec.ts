import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmMessageComponent } from './message.component';
import type { GmSeverity } from '../core/types';

@Component({
  standalone: true,
  imports: [GmMessageComponent],
  template: `
    <gm-message [severity]="severity" [icon]="icon" [text]="text" />
    <gm-message severity="success">projected <b>content</b></gm-message>
  `,
})
class HostComponent {
  severity: GmSeverity = 'info';
  icon?: string;
  text?: string;
}

describe('gm-message', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const first = () =>
    fixture.nativeElement.querySelector('.gm-message') as HTMLElement;
  const projected = () =>
    fixture.nativeElement.querySelectorAll('.gm-message')[1] as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('defaults to the info severity', () => {
    expect(first().classList).toContain('gm-message--info');
  });

  it('renders the text input', () => {
    host.text = 'This record is in use';
    fixture.detectChanges();

    expect(first().textContent?.trim()).toBe('This record is in use');
  });

  it('renders projected content when no text is given', () => {
    expect(projected().textContent).toContain('projected');
    expect(projected().querySelector('b')?.textContent).toBe('content');
  });

  it('renders an icon, hidden from screen readers', () => {
    host.icon = 'pi pi-info-circle';
    fixture.detectChanges();

    const icon = first().querySelector('.gm-message__icon') as HTMLElement;
    expect(icon.classList).toContain('pi-info-circle');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('announces warnings and errors assertively, info politely', () => {
    expect(first().getAttribute('role')).toBe('status');

    host.severity = 'warning';
    fixture.detectChanges();
    expect(first().getAttribute('role')).toBe('alert');

    host.severity = 'danger';
    fixture.detectChanges();
    expect(first().getAttribute('role')).toBe('alert');
  });

  it('tints by severity', () => {
    host.severity = 'danger';
    fixture.detectChanges();

    expect(first().classList).toContain('gm-message--danger');
    expect(first().classList).not.toContain('gm-message--info');
  });
});
