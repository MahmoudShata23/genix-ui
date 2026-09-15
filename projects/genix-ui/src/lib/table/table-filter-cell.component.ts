import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  from,
  isObservable,
  of,
  switchMap,
} from 'rxjs';
import type { Observable } from 'rxjs';

import { GmDatepickerComponent } from '../datepicker/datepicker.component';
import { GmInputComponent } from '../input/input.component';
import { GmMultiselectComponent } from '../multiselect/multiselect.component';
import { GmSelectComponent } from '../select/select.component';
import type { GmTableFilterOption, GmTableFilterType } from './table-filter.types';

/** Below this, a search would match too much to be worth a round trip. */
const MIN_SEARCH_LENGTH = 3;

/**
 * Renders the control for one column's filter and reports its value. It owns no
 * filter state and knows nothing about operators — `gm-table` holds both.
 *
 * Every control is an existing library component; nothing is re-implemented
 * here.
 */
@Component({
  selector: 'gm-table-filter-cell',
  standalone: true,
  imports: [
    FormsModule,
    GmInputComponent,
    GmSelectComponent,
    GmMultiselectComponent,
    GmDatepickerComponent,
  ],
  templateUrl: './table-filter-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-table-filter-cell' },
})
export class GmTableFilterCellComponent {
  readonly type = input<GmTableFilterType>('text');

  readonly value = input<unknown>(null);

  readonly options = input<readonly GmTableFilterOption[]>([]);

  /**
   * Fetches the options for a term instead of taking them all up front. When
   * set, the select filters through this rather than locally.
   */
  readonly search = input<
    | ((
        term: string,
      ) =>
        | Promise<readonly GmTableFilterOption[]>
        | Observable<readonly GmTableFilterOption[]>)
    | undefined
  >(undefined);

  readonly placeholder = input<string>('');

  readonly ariaLabel = input<string>('');

  /** Shown in the search select while a lookup is in flight. */
  readonly searchingMessage = input<string>('Searching…');

  /** Shown in the search select once a lookup came back with nothing. */
  readonly noResultsMessage = input<string>('No results found');

  readonly disabled = input(false);

  /** Raw control value; `gm-table` decides what it means. */
  readonly valueChange = output<unknown>();

  private readonly destroyRef = inject(DestroyRef);

  /** Yes/No for a boolean column, so it reuses the select rather than a toggle. */
  protected readonly booleanOptions: readonly GmTableFilterOption[] = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  // ── Searchable select ───────────────────────────────────────────────────

  private readonly term$ = new Subject<string>();

  private readonly searched = signal<readonly GmTableFilterOption[]>([]);

  private readonly lastTerm = signal('');

  protected readonly searching = signal(false);

  /**
   * Field the select matches its own box against while `search` is set.
   *
   * It is stamped with the term the options were fetched *for*, so the local
   * filter always passes them: the server decides what matches — on a code, a
   * description, anything — and a second, label-only pass here would hide
   * results it returned deliberately.
   */
  protected readonly searchMatchField = 'gmSearchMatch';

  /**
   * The list the select shows. Under `search`, the fetched options — falling
   * back to the static ones until a term is long enough to query, so the
   * dropdown is not empty the moment it opens.
   */
  protected readonly selectOptions = computed<readonly GmTableFilterOption[]>(
    () => {
      if (!this.search()) {
        return this.options();
      }
      const fetched = this.searched();
      const options = fetched.length > 0 ? fetched : this.options();
      const term = this.lastTerm();
      return options.map((option) => ({
        ...option,
        [this.searchMatchField]: term,
      }));
    },
  );

  constructor() {
    this.term$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const search = this.search();
          const trimmed = term.trim();
          if (!search || trimmed.length < MIN_SEARCH_LENGTH) {
            this.searching.set(false);
            return of([] as readonly GmTableFilterOption[]);
          }
          this.searching.set(true);
          const result = search(trimmed);
          const result$ = isObservable(result) ? result : from(result);
          return result$.pipe(finalize(() => this.searching.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (options) => this.searched.set(options ?? []),
        // A failed lookup empties the list rather than leaving the previous
        // term's options showing under the new one.
        error: () => this.searched.set([]),
      });
  }

  protected onSearch(term: string): void {
    this.lastTerm.set(term ?? '');
    this.term$.next(term ?? '');
  }

  protected asText(value: unknown): string | number | null {
    return value === null || value === undefined
      ? null
      : (value as string | number);
  }

  protected asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  protected asDate(value: unknown): Date | null {
    return value instanceof Date ? value : null;
  }

  /** An empty string means "no filter", not "filter for empty". */
  protected emit(value: unknown): void {
    this.valueChange.emit(value === '' ? null : value);
  }
}
