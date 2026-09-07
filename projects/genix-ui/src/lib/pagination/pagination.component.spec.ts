import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmPaginationComponent } from './pagination.component';
import type { GmPageChangeEvent } from './pagination.types';

@Component({
  standalone: true,
  imports: [GmPaginationComponent],
  template: `
    <gm-pagination
      [page]="page()"
      [pageSize]="pageSize()"
      [totalItems]="total()"
      [pageSizeOptions]="options()"
      [showCurrentPageReport]="true"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} records"
      (pageChange)="onPage($event)"
      (pageSizeChange)="sizeEvents.push($event)"
    />
  `,
})
class HostComponent {
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(134);
  readonly options = signal<readonly number[]>([5, 10, 20, 50]);

  readonly events: GmPageChangeEvent[] = [];
  readonly sizeEvents: number[] = [];

  onPage(event: GmPageChangeEvent) {
    this.events.push(event);
    // Behave like a real consumer: adopt the emitted state.
    this.page.set(event.page);
    this.pageSize.set(event.pageSize);
  }
}

describe('gm-pagination', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const q = (sel: string) => fixture.nativeElement.querySelector(sel);
  const byLabel = (label: string) =>
    fixture.nativeElement.querySelector(
      `[aria-label="${label}"]`,
    ) as HTMLButtonElement;
  const pages = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.gm-pagination__page'),
    ) as HTMLButtonElement[];
  const slotText = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll(
        '.gm-pagination__page, .gm-pagination__gap',
      ),
    ).map((el) => (el as HTMLElement).textContent!.trim());
  const last = () => host.events[host.events.length - 1];

  const set = (patch: { page?: number; size?: number; total?: number }) => {
    if (patch.page !== undefined) host.page.set(patch.page);
    if (patch.size !== undefined) host.pageSize.set(patch.size);
    if (patch.total !== undefined) host.total.set(patch.total);
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

  // ── a11y ──────────────────────────────────────────────────────────────

  it('is a labelled nav built from real buttons', () => {
    const nav = q('nav');
    expect(nav.getAttribute('aria-label')).toBe('Pagination');
    expect(pages().every((b) => b.tagName === 'BUTTON')).toBeTrue();
    expect(byLabel('First page').tagName).toBe('BUTTON');
  });

  it('exposes the current page with aria-current and named page buttons', () => {
    const current = pages().find((b) => b.getAttribute('aria-current') === 'page')!;
    expect(current.textContent!.trim()).toBe('1');
    expect(
      pages().filter((b) => b.getAttribute('aria-current') === 'page').length,
    ).toBe(1);
    expect(byLabel('Page 3')).toBeTruthy();
  });

  it('disables backward navigation on the first page', () => {
    expect(byLabel('First page').disabled).toBeTrue();
    expect(byLabel('Previous page').disabled).toBeTrue();
    expect(byLabel('Next page').disabled).toBeFalse();
    expect(byLabel('Last page').disabled).toBeFalse();
  });

  // ── navigation ────────────────────────────────────────────────────────

  it('steps next and previous', () => {
    byLabel('Next page').click();
    fixture.detectChanges();
    expect(last().page).toBe(2);

    byLabel('Previous page').click();
    fixture.detectChanges();
    expect(last().page).toBe(1);
  });

  it('jumps to first and last', () => {
    byLabel('Last page').click();
    fixture.detectChanges();
    // 134 items / 10 per page = 14 pages.
    expect(last().page).toBe(14);
    expect(byLabel('Next page').disabled).toBeTrue();

    byLabel('First page').click();
    fixture.detectChanges();
    expect(last().page).toBe(1);
  });

  it('selects a page directly', () => {
    byLabel('Page 3').click();
    fixture.detectChanges();
    expect(last().page).toBe(3);
  });

  it('does not emit when the current page is re-clicked', () => {
    const before = host.events.length;
    byLabel('Page 1').click();
    fixture.detectChanges();
    expect(host.events.length).toBe(before);
  });

  // ── first offset ──────────────────────────────────────────────────────

  it('computes a 0-based first offset', () => {
    byLabel('Page 3').click();
    fixture.detectChanges();
    expect(last()).toEqual({ page: 3, pageSize: 10, first: 20 });
  });

  it('never emits a negative offset or an out-of-range page', () => {
    set({ total: 25 });
    byLabel('Last page').click();
    fixture.detectChanges();
    expect(last().page).toBe(3);
    expect(last().first).toBe(20);

    byLabel('First page').click();
    fixture.detectChanges();
    expect(last().first).toBe(0);
    expect(host.events.every((e) => e.first >= 0 && e.page >= 1)).toBeTrue();
  });

  // ── page size ─────────────────────────────────────────────────────────

  it('changes page size, clamps the page, and emits both events', () => {
    set({ page: 14 }); // last page at size 10
    q('gm-select .gm-dropdown__trigger').click();
    fixture.detectChanges();
    const option = Array.from(
      document.querySelectorAll('.cdk-overlay-container [role="option"]'),
    ).find((o) => o.textContent?.trim() === '50') as HTMLElement;
    option.click();
    fixture.detectChanges();

    expect(host.sizeEvents).toEqual([50]);
    // 134 / 50 = 3 pages, so page 14 cannot survive.
    expect(last().pageSize).toBe(50);
    expect(last().page).toBe(3);
    expect(last().first).toBe(100);
  });

  it('keeps the first visible record roughly in view when the size shrinks', () => {
    set({ page: 3, size: 20 }); // first = 40
    q('gm-select .gm-dropdown__trigger').click();
    fixture.detectChanges();
    const option = Array.from(
      document.querySelectorAll('.cdk-overlay-container [role="option"]'),
    ).find((o) => o.textContent?.trim() === '5') as HTMLElement;
    option.click();
    fixture.detectChanges();

    // Record 40 at 5-per-page sits on page 9, not back at page 1.
    expect(last().pageSize).toBe(5);
    expect(last().page).toBe(9);
    expect(last().first).toBe(40);
  });

  it('hides the size selector when no options are given', () => {
    host.options.set([]);
    fixture.detectChanges();
    expect(q('gm-select')).toBeNull();
  });

  // ── edge cases ────────────────────────────────────────────────────────

  it('handles zero records: page 1, no pages, offset 0, nav disabled', () => {
    set({ total: 0 });
    expect(pages().length).toBe(0);
    expect(byLabel('First page').disabled).toBeTrue();
    expect(byLabel('Next page').disabled).toBeTrue();
    expect(q('.gm-pagination__report').textContent).toContain(
      'Showing 0 to 0 of 0 records',
    );
  });

  it('handles fewer records than one page', () => {
    set({ total: 4 });
    expect(pages().length).toBe(1);
    expect(byLabel('Next page').disabled).toBeTrue();
    expect(q('.gm-pagination__report').textContent).toContain(
      'Showing 1 to 4 of 4 records',
    );
  });

  it('clamps a page left dangling past the end after a deletion', () => {
    set({ page: 14, total: 134 });
    // Records deleted: only 12 remain, so 2 pages.
    set({ total: 12 });
    const current = pages().find((b) => b.getAttribute('aria-current') === 'page')!;
    expect(current.textContent!.trim()).toBe('2');
    expect(q('.gm-pagination__report').textContent).toContain(
      'Showing 11 to 12 of 12 records',
    );
  });

  // ── report / window ───────────────────────────────────────────────────

  it('substitutes the report tokens', () => {
    set({ page: 3 });
    expect(q('.gm-pagination__report').textContent).toContain(
      'Showing 21 to 30 of 134 records',
    );
  });

  it('windows large page counts instead of rendering every page', () => {
    set({ total: 1000, size: 10, page: 10 }); // 100 pages
    expect(pages().length).toBeLessThanOrEqual(7);
    expect(slotText()).toEqual(['1', '…', '8', '9', '10', '11', '12', '…', '100']);
  });

  it('anchors the window at the start and end without stray gaps', () => {
    set({ total: 1000, size: 10, page: 1 });
    expect(slotText()).toEqual(['1', '2', '3', '4', '5', '…', '100']);

    set({ page: 100 });
    expect(slotText()).toEqual(['1', '…', '96', '97', '98', '99', '100']);
  });

  it('lists every page when they fit in the window', () => {
    set({ total: 45, size: 10 }); // 5 pages, window of 5
    expect(slotText()).toEqual(['1', '2', '3', '4', '5']);
  });
});
