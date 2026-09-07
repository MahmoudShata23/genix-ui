import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  numberAttribute,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GmSelectComponent } from '../select/select.component';
import { gmUniqueId } from '../core/unique-id';
import type { GmPageChangeEvent, GmPageSlot } from './pagination.types';

/**
 * Page navigation. Emits state only — it never fetches anything, so
 * server-side paging stays in the feature's service.
 *
 * ```html
 * <gm-pagination [page]="page" [pageSize]="size" [totalItems]="total"
 *                [pageSizeOptions]="[10, 20, 50]"
 *                (pageChange)="load($event)" />
 * ```
 *
 * `page` is 1-based throughout the public API. The 0-based record offset is
 * derived once, in `emit`, and exposed as `first` on the event — offset maths
 * appears nowhere else.
 */
@Component({
  selector: 'gm-pagination',
  standalone: true,
  imports: [FormsModule, GmSelectComponent],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-pagination-host' },
})
export class GmPaginationComponent {
  /** 1-based. Clamped for display, so an out-of-range value is harmless. */
  readonly page = input(1, { transform: numberAttribute });

  readonly pageSize = input(10, { transform: numberAttribute });

  readonly totalItems = input(0, { transform: numberAttribute });

  /** Empty (the default) hides the page-size selector. */
  readonly pageSizeOptions = input<readonly number[]>([]);

  readonly disabled = input(false, { transform: booleanAttribute });

  /** How many numbered pages to show at once, excluding first/last and gaps. */
  readonly maxPageLinks = input(5, { transform: numberAttribute });

  readonly showCurrentPageReport = input(false, {
    transform: booleanAttribute,
  });

  /**
   * Report text. Only `{first}`, `{last}` and `{totalRecords}` are substituted
   * — the three tokens the app's translated string uses. Deliberately not
   * PrimeNG's full templating syntax.
   */
  readonly currentPageReportTemplate = input<string>(
    'Showing {first} to {last} of {totalRecords}',
  );

  readonly ariaLabel = input<string>('Pagination');

  readonly pageSizeLabel = input<string>('Items per page');

  /** Fires for page *and* page-size changes; the event carries both. */
  readonly pageChange = output<GmPageChangeEvent>();

  /** Supplementary — `pageChange` already reports the new size. */
  readonly pageSizeChange = output<number>();

  readonly pageSizeId = gmUniqueId('gm-pagination-size');

  protected readonly totalPages = computed(() => {
    const size = Math.max(1, this.pageSize());
    return Math.ceil(Math.max(0, this.totalItems()) / size);
  });

  /**
   * The page actually shown. With no records this is 1 while `totalPages` is 0,
   * and a `page` left dangling past the end (records deleted) snaps back to the
   * last real page.
   */
  protected readonly currentPage = computed(() =>
    Math.min(Math.max(1, this.page()), Math.max(1, this.totalPages())),
  );

  /** 0-based offset of the first record shown. */
  protected readonly first = computed(() =>
    this.totalItems() === 0
      ? 0
      : (this.currentPage() - 1) * Math.max(1, this.pageSize()),
  );

  /** 1-based index of the last record shown, for the report. */
  protected readonly last = computed(() =>
    Math.min(this.first() + Math.max(1, this.pageSize()), this.totalItems()),
  );

  protected readonly isFirstPage = computed(() => this.currentPage() <= 1);

  protected readonly isLastPage = computed(
    () => this.currentPage() >= this.totalPages(),
  );

  /** Nothing is navigable with a single page or no records. */
  protected readonly navDisabled = computed(
    () => this.disabled() || this.totalPages() <= 1,
  );

  protected readonly report = computed(() =>
    this.currentPageReportTemplate()
      // The report reads 1-based, so the offset is shifted for display.
      .replace('{first}', String(this.totalItems() === 0 ? 0 : this.first() + 1))
      .replace('{last}', String(this.last()))
      .replace('{totalRecords}', String(this.totalItems())),
  );

  /**
   * The visible page window: always the first and last page, the pages around
   * the current one, and a gap marker where pages are skipped.
   */
  protected readonly slots = computed<GmPageSlot[]>(() => {
    const total = this.totalPages();
    const window = Math.max(1, this.maxPageLinks());

    if (total <= window) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const half = Math.floor(window / 2);
    const start = Math.min(
      Math.max(1, this.currentPage() - half),
      total - window + 1,
    );
    const pages: GmPageSlot[] = Array.from(
      { length: window },
      (_, i) => start + i,
    );

    // Only add the boundary page when it is not already in the window, and only
    // add a gap marker when at least one page is actually hidden.
    if (start > 1) {
      pages.unshift('ellipsis');
      if (start > 2) {
        pages.unshift(1);
      } else {
        pages[0] = 1;
      }
    }
    const end = start + window - 1;
    if (end < total) {
      pages.push('ellipsis');
      if (end < total - 1) {
        pages.push(total);
      } else {
        pages[pages.length - 1] = total;
      }
    }

    return pages;
  });

  protected goTo(page: number): void {
    if (this.disabled()) {
      return;
    }
    const target = Math.min(Math.max(1, page), Math.max(1, this.totalPages()));
    if (target === this.currentPage()) {
      return;
    }
    this.emit(target, this.pageSize());
  }

  protected onPageSizeChange(next: unknown): void {
    const size = Number(next);
    if (!Number.isFinite(size) || size <= 0 || size === this.pageSize()) {
      return;
    }

    // Keep the first visible record roughly in view rather than jumping home,
    // then clamp: a bigger page size means fewer pages exist.
    const pages = Math.ceil(Math.max(0, this.totalItems()) / size);
    const target = Math.min(
      Math.max(1, Math.floor(this.first() / size) + 1),
      Math.max(1, pages),
    );

    this.pageSizeChange.emit(size);
    this.emit(target, size);
  }

  /** The single place a `first` offset is computed. */
  private emit(page: number, pageSize: number): void {
    this.pageChange.emit({
      page,
      pageSize,
      first: (page - 1) * pageSize,
    });
  }
}
