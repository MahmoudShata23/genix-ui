import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTabsComponent } from './tabs.component';
import { GmTabComponent } from './tab.component';
import { GmTabLabelDirective } from './tab-label.directive';
import { GmAccordionComponent } from '../accordion/accordion.component';
import { GmAccordionPanelComponent } from '../accordion/accordion-panel.component';
import {
  GmAccordionContentComponent,
  GmAccordionHeaderComponent,
} from '../accordion/accordion-parts';
import { GmTooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  standalone: true,
  imports: [
    GmTabsComponent,
    GmTabComponent,
    GmTabLabelDirective,
    GmAccordionComponent,
    GmAccordionPanelComponent,
    GmAccordionHeaderComponent,
    GmAccordionContentComponent,
    GmTooltipDirective,
  ],
  template: `
    <gm-tabs [value]="tab()" (valueChange)="tab.set($event)">
      <gm-tab value="a" label="Alpha"><p class="a-body">A</p></gm-tab>
      <gm-tab value="b">
        <ng-template gmTabLabel><span class="rich">Beta</span></ng-template>
        <p class="b-body">B</p>
      </gm-tab>
      <gm-tab value="c" label="Gamma" [disabled]="true">C</gm-tab>
    </gm-tabs>

    <gm-accordion [value]="panel()" (valueChange)="panel.set($event)">
      <gm-accordion-panel value="one">
        <gm-accordion-header>One</gm-accordion-header>
        <gm-accordion-content><input class="kept" /></gm-accordion-content>
      </gm-accordion-panel>
      <gm-accordion-panel value="two" [disabled]="true">
        <gm-accordion-header>Two</gm-accordion-header>
        <gm-accordion-content>Two body</gm-accordion-content>
      </gm-accordion-panel>
    </gm-accordion>

    <button gmTooltip="Edit me" tooltipPosition="bottom">Edit</button>
    <button gmTooltip="Nope" [tooltipDisabled]="true">Off</button>
  `,
})
class HostComponent {
  readonly tab = signal<string | number | null>('a');
  readonly panel = signal<string | number | (string | number)[] | null>(null);
}

describe('gm-tabs / gm-accordion / gmTooltip', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const tabButtons = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('[role="tab"]'),
    ) as HTMLButtonElement[];
  const triggers = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-accordion__trigger'),
    ) as HTMLButtonElement[];
  const q = (sel: string) => fixture.nativeElement.querySelector(sel);
  const overlays = () =>
    document.querySelectorAll('.cdk-overlay-container .gm-tooltip');

  const key = (name: string) => {
    q('[role="tablist"]').dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true }),
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

  // ── tabs ──────────────────────────────────────────────────────────────

  it('wires tablist/tab/tabpanel roles and aria to matching ids', () => {
    const tab = tabButtons()[0];
    const panel = q('gm-tab');
    expect(q('[role="tablist"]')).toBeTruthy();
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(tab.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(panel.getAttribute('role')).toBe('tabpanel');
  });

  it('renders only the active panel, like the PrimeNG tabs it replaces', () => {
    expect(q('.a-body')).toBeTruthy();
    expect(q('.b-body')).toBeNull();

    host.tab.set('b');
    fixture.detectChanges();
    expect(q('.a-body')).toBeNull();
    expect(q('.b-body')).toBeTruthy();
  });

  it('renders a rich label template when given', () => {
    expect(q('.rich').textContent.trim()).toBe('Beta');
  });

  it('moves selection with arrows and wraps past the ends', () => {
    key('ArrowRight');
    expect(host.tab()).toBe('b');
    // 'c' is disabled, so Right from 'b' wraps to 'a'.
    key('ArrowRight');
    expect(host.tab()).toBe('a');
    key('ArrowLeft');
    expect(host.tab()).toBe('b');
  });

  it('jumps to the ends with Home and End', () => {
    key('End');
    expect(host.tab()).toBe('b');
    key('Home');
    expect(host.tab()).toBe('a');
  });

  it('keeps only the active tab in the tab order', () => {
    expect(tabButtons()[0].getAttribute('tabindex')).toBe('0');
    expect(tabButtons()[1].getAttribute('tabindex')).toBe('-1');
  });

  it('ignores clicks on a disabled tab', () => {
    expect(tabButtons()[2].disabled).toBeTrue();
    tabButtons()[2].click();
    fixture.detectChanges();
    expect(host.tab()).toBe('a');
  });

  // ── accordion ─────────────────────────────────────────────────────────

  it('uses a real button with aria-expanded/aria-controls', () => {
    const trigger = triggers()[0];
    const region = q('.gm-accordion__content');
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(region.id);
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.id);
  });

  it('expands and collapses on click', () => {
    triggers()[0].click();
    fixture.detectChanges();
    expect(host.panel()).toBe('one');
    expect(triggers()[0].getAttribute('aria-expanded')).toBe('true');
    expect(q('.gm-accordion__content').hidden).toBeFalse();

    triggers()[0].click();
    fixture.detectChanges();
    expect(host.panel()).toBeNull();
    expect(q('.gm-accordion__content').hidden).toBeTrue();
  });

  it('keeps collapsed content mounted so inner form state survives', () => {
    triggers()[0].click();
    fixture.detectChanges();
    const input = q('.kept') as HTMLInputElement;
    input.value = 'typed';

    triggers()[0].click();
    fixture.detectChanges();
    // Same element, still holding its value — content is hidden, not destroyed.
    expect(q('.kept')).toBe(input);
    expect((q('.kept') as HTMLInputElement).value).toBe('typed');
  });

  it('ignores a disabled panel', () => {
    expect(triggers()[1].disabled).toBeTrue();
    triggers()[1].click();
    fixture.detectChanges();
    expect(host.panel()).toBeNull();
  });

  it('closes the open panel when another opens in single mode', () => {
    host.panel.set('two');
    fixture.detectChanges();
    triggers()[0].click();
    fixture.detectChanges();
    expect(host.panel()).toBe('one');
  });

  // ── tooltip ───────────────────────────────────────────────────────────

  it('opens on hover and closes on mouse leave', () => {
    const button = fixture.nativeElement.querySelectorAll('button[gmTooltip]')[0];
    button.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(overlays().length).toBe(1);
    expect(overlays()[0].textContent?.trim()).toBe('Edit me');
    expect(overlays()[0].getAttribute('role')).toBe('tooltip');

    button.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(overlays().length).toBe(0);
  });

  it('opens on focus (bubbling, so nested targets work) and closes on Escape', () => {
    const button = fixture.nativeElement.querySelectorAll('button[gmTooltip]')[0];
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    expect(overlays().length).toBe(1);
    // Points assistive tech at the bubble only while it is on screen.
    expect(button.getAttribute('aria-describedby')).toBe(overlays()[0].id);

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(overlays().length).toBe(0);
    expect(button.getAttribute('aria-describedby')).toBeNull();
  });

  it('renders no overlay at all when disabled', () => {
    const off = fixture.nativeElement.querySelectorAll('button[gmTooltip]')[1];
    off.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(overlays().length).toBe(0);
  });
});
