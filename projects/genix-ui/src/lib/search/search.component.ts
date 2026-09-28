import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounce, distinctUntilChanged, tap, timer } from 'rxjs';

import { GmFieldSize, GmFormFieldBase } from '../core/form-field-base';
import { gmUniqueId } from '../core/unique-id';

/**
 * Debounced text search field over a native `<input>`.
 *
 * ```html
 * <gm-search placeholder="Search users" (search)="onSearch($event)" />
 * ```
 *
 * Typing updates the bound value on every keystroke, like any other form
 * field — `search` is a second, separate output: the term settled after
 * `debounceMs` of quiet, de-duplicated, which is what a consumer fetches on.
 * Like `gm-autocomplete`, this component never fetches itself.
 */
@Component({
  selector: 'gm-search',
  standalone: true,
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-field-host gm-search-host',
    '[class.gm-field-host--invalid]': 'hasError()',
    '[class.gm-field-host--filled]': 'isFilled()',
    '[class.gm-field-host--small]': "size() === 'small'",
    '[class.gm-field-host--large]': "size() === 'large'",
  },
})
export class GmSearchComponent extends GmFormFieldBase<string> {
  readonly size = input<GmFieldSize>('medium');

  readonly placeholder = input<string>('');

  /** Icon class for the leading magnifier glyph. */
  readonly icon = input<string>('pi pi-search');

  /** Shows a button that resets the term once there is one to clear. */
  readonly clearable = input(true, { transform: booleanAttribute });

  /**
   * Quiet period after the last keystroke before `search` fires, in ms. Set
   * it to 0 to report every keystroke.
   */
  readonly debounceMs = input(400, { transform: numberAttribute });

  /**
   * True while a request this box triggered is in flight. The component
   * never fetches itself — this is the consumer's own state coming back in,
   * the same shape as `gm-autocomplete`'s `loading`.
   */
  readonly loading = input(false, { transform: booleanAttribute });

  readonly loadingLabel = input<string>('Searching');

  /**
   * The settled term: debounced and de-duplicated, so a handler can fetch on
   * it directly without a second debounce downstream.
   */
  readonly search = output<string>();

  /** Keystrokes, before debouncing. */
  private readonly keystrokes = new Subject<string>();

  /**
   * True from a keystroke until the term settles — the window in which the
   * user has typed and nothing has happened yet, on top of whatever `loading`
   * the consumer is separately reporting.
   */
  protected readonly pending = signal(false);

  protected readonly busy = computed(() => this.pending() || this.loading());

  constructor() {
    super();
    this.keystrokes
      .pipe(
        // `debounce` over `debounceTime`: the delay is an input, so it has to
        // be read per keystroke rather than fixed when the pipe is built.
        debounce(() => timer(this.debounceMs())),
        // Before distinctUntilChanged, so the spinner clears even when the
        // term turns out to be a duplicate and nothing is emitted.
        tap(() => this.pending.set(false)),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => this.search.emit(term));
  }

  protected override generateId(): string {
    return gmUniqueId('gm-search');
  }

  protected handleInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.commit(term);
    this.pending.set(true);
    this.keystrokes.next(term);
  }

  protected clear(): void {
    this.commit('');
    this.pending.set(false);
    this.keystrokes.next('');
    this.handleBlur();
  }
}
