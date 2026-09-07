import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmCardComponent } from './card.component';
import { GmBadgeComponent } from '../badge/badge.component';
import { GmChipComponent } from '../chip/chip.component';
import { GmSpinnerComponent } from '../spinner/spinner.component';

@Component({
  standalone: true,
  imports: [
    GmCardComponent,
    GmBadgeComponent,
    GmChipComponent,
    GmSpinnerComponent,
  ],
  template: `
    <gm-card header="Authorization" subheader="Details">
      <p class="body">Content</p>
    </gm-card>
    <gm-card [interactive]="true" (click)="clicks = clicks + 1">Clickable</gm-card>

    <gm-badge value="12" severity="warning" [rounded]="true" ariaLabel="12 pending" />
    <gm-chip label="Active" severity="success" />
    <gm-chip class="tinted" [style.--gm-chip-bg]="'rgb(1, 2, 3)'">Custom</gm-chip>
    <gm-spinner ariaLabel="Loading data" size="large" />
  `,
})
class HostComponent {
  clicks = 0;
}

describe('gm-card / gm-badge / gm-chip / gm-spinner', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const q = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── card ──────────────────────────────────────────────────────────────

  it('renders header and subheader, and projects content', () => {
    expect(q('gm-card .gm-card__title').textContent?.trim()).toBe(
      'Authorization',
    );
    expect(q('gm-card .gm-card__subtitle').textContent?.trim()).toBe('Details');
    expect(q('gm-card .body').textContent?.trim()).toBe('Content');
  });

  it('omits the header block entirely when neither is set', () => {
    const plain = fixture.nativeElement.querySelectorAll('gm-card')[1];
    expect(plain.querySelector('.gm-card__header')).toBeNull();
  });

  it('keeps a non-interactive card out of the tab order', () => {
    const cards = fixture.nativeElement.querySelectorAll('gm-card');
    // Neither card should be focusable: the interactive one is styled as
    // clickable but must not fake button semantics.
    expect(cards[0].getAttribute('tabindex')).toBeNull();
    expect(cards[1].getAttribute('tabindex')).toBeNull();
  });

  it('marks an interactive card and lets clicks through', () => {
    const card = fixture.nativeElement.querySelectorAll('gm-card')[1];
    expect(card.classList).toContain('gm-card-host--interactive');
    card.click();
    expect(host.clicks).toBe(1);
  });

  // ── badge ─────────────────────────────────────────────────────────────

  it('renders the badge value, severity and accessible name', () => {
    const badge = q('gm-badge .gm-badge');
    expect(badge.textContent?.trim()).toBe('12');
    expect(badge.classList).toContain('gm-badge--warning');
    expect(badge.classList).toContain('gm-badge--rounded');
    expect(badge.getAttribute('aria-label')).toBe('12 pending');
  });

  // ── chip ──────────────────────────────────────────────────────────────

  it('puts the severity on the host so the tint cascades in', () => {
    const chip = fixture.nativeElement.querySelector('gm-chip');
    expect(chip.classList).toContain('gm-chip-host--success');
    expect(q('gm-chip .gm-chip__label').textContent?.trim()).toBe('Active');
  });

  it('honours an inline --gm-chip-bg override, the documented tint hook', () => {
    // This is the mechanism `genix-shared-chip` relies on for its per-chip
    // bgColor, so it needs to be pinned rather than assumed.
    const inner = q('gm-chip.tinted .gm-chip');
    expect(getComputedStyle(inner).backgroundColor).toBe('rgb(1, 2, 3)');
  });

  // ── spinner ───────────────────────────────────────────────────────────

  it('exposes loading semantics on the spinner host', () => {
    const spinner = fixture.nativeElement.querySelector('gm-spinner');
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.getAttribute('aria-label')).toBe('Loading data');
    expect(spinner.classList).toContain('gm-spinner-host--large');
    // The decorative ring must not be announced separately.
    expect(q('gm-spinner .gm-spinner').getAttribute('aria-hidden')).toBe('true');
  });
});
