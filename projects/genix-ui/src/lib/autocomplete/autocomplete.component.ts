import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { GmFormFieldBase } from '../core/form-field-base';
import { gmOptionLabel, gmOptionValue } from '../core/option-reader';
import { gmOverlayPanel } from '../core/overlay-panel';
import { gmUniqueId } from '../core/unique-id';
import { GmSelectOptionDirective } from '../select/select-option.directive';
import { GmSpinnerComponent } from '../spinner/spinner.component';

/** A suggestion. Primitive or object, addressed like a select's option. */
export type GmAutocompleteSuggestion = unknown;

/**
 * Text field with a suggestion list.
 *
 * ```html
 * <gm-autocomplete formControlName="user" [suggestions]="users"
 *                  optionLabel="name" (search)="searchUsers($event)" />
 * ```
 *
 * It never fetches anything. Typing emits `search` with the current term; the
 * application answers by updating `suggestions`. That keeps debouncing,
 * cancellation and error handling in the application, where the HTTP client
 * lives.
 *
 * The control value is the *selected* suggestion's value — typing alone does
 * not change it, and leaving the field without picking anything puts the typed
 * text back to the selection's label, so the box and the value never disagree.
 *
 * Rows can be re-rendered with the package's option template directive, the
 * same `gmSelectOption` `gm-select` uses. Overlay, positioning and
 * outside-click handling come from the shared `GmOverlayPanel`.
 */
@Component({
  selector: 'gm-autocomplete',
  standalone: true,
  imports: [NgTemplateOutlet, GmSpinnerComponent],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-field-host gm-autocomplete-host',
    '[class.gm-field-host--invalid]': 'hasError()',
    '[class.gm-field-host--filled]': 'isFilled()',
  },
})
export class GmAutocompleteComponent extends GmFormFieldBase<unknown> {
  readonly suggestions = input<readonly GmAutocompleteSuggestion[]>([]);

  /** Property holding a suggestion's display text. Omit for primitives. */
  readonly optionLabel = input<string>();

  /** Property holding a suggestion's form value. Omit to store the object. */
  readonly optionValue = input<string>();

  readonly placeholder = input<string>();

  /** Shows a spinner in place of the dropdown affordance. */
  readonly loading = input(false, { transform: booleanAttribute });

  /** Shows an inline clear button once something is selected. */
  readonly clearable = input(false, { transform: booleanAttribute });

  /** Characters required before `search` fires. */
  readonly minLength = input(1, { transform: numberAttribute });

  readonly emptyMessage = input<string>('No results found');

  /** The current term. The application answers by updating `suggestions`. */
  readonly search = output<string>();

  /** The chosen suggestion object, for callers that need more than the value. */
  readonly optionSelect = output<GmAutocompleteSuggestion>();

  protected readonly optionTemplate = contentChild(GmSelectOptionDirective);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayPanel = gmOverlayPanel();
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  protected readonly open = signal(false);

  /** What is in the box. Not the control value — see the class docs. */
  protected readonly query = signal('');

  /** Index into `suggestions`, for the keyboard highlight and activedescendant. */
  protected readonly activeIndex = signal(-1);

  /** The suggestion the value came from, kept so the box can be restored. */
  private readonly selectedOption = signal<GmAutocompleteSuggestion | null>(null);

  readonly listboxId = gmUniqueId('gm-autocomplete-list');

  protected readonly locked = computed(
    () => this.isDisabled() || this.readOnly(),
  );

  protected readonly hasValue = computed(
    () => this.value() !== null && this.value() !== undefined,
  );

  protected readonly activeOptionId = computed(() => {
    const index = this.activeIndex();
    return index < 0 ? null : this.optionId(index);
  });

  constructor() {
    super();
    // A control is commonly patched with a value before the suggestions that
    // explain it have arrived, so the label is resolved again when they do —
    // unless the user is mid-search, whose typing must not be overwritten.
    effect(() => {
      const suggestions = this.suggestions();
      const value = untracked(this.value);
      if (
        this.open() ||
        untracked(this.selectedOption) !== null ||
        value === null ||
        value === undefined
      ) {
        return;
      }
      const match = suggestions.find(
        (suggestion) => this.valueForOption(suggestion) === value,
      );
      if (match !== undefined) {
        this.selectedOption.set(match);
        this.query.set(this.labelOf(match));
      }
    });

    // Losing the ability to interact must also close an open list.
    effect(() => {
      if (this.locked() && this.open()) {
        this.close();
      }
    });
  }

  protected override generateId(): string {
    return gmUniqueId('gm-autocomplete');
  }

  /**
   * A control can be patched with a value before its suggestions have loaded,
   * so the box falls back to the value itself when no suggestion matches it —
   * better than an empty field next to a set value.
   */
  override writeValue(value: unknown): void {
    super.writeValue(value);
    const match =
      this.suggestions().find(
        (suggestion) => this.valueForOption(suggestion) === value,
      ) ?? null;
    this.selectedOption.set(match);
    this.query.set(
      match !== null
        ? this.labelOf(match)
        : value === null || value === undefined
          ? ''
          : String(value),
    );
  }

  protected labelOf(option: GmAutocompleteSuggestion): string {
    return gmOptionLabel(option, this.optionLabel());
  }

  protected valueForOption(option: GmAutocompleteSuggestion): unknown {
    return gmOptionValue(option, this.optionValue());
  }

  protected optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  protected isSelected(option: GmAutocompleteSuggestion): boolean {
    return this.valueForOption(option) === this.value();
  }

  // ── Typing ──────────────────────────────────────────────────────────────

  protected handleInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.query.set(term);
    this.activeIndex.set(-1);

    if (term.length >= this.minLength()) {
      this.show();
      this.search.emit(term);
      return;
    }
    this.close();
  }

  // ── Open / close ────────────────────────────────────────────────────────

  protected show(): void {
    if (this.locked() || this.open()) {
      return;
    }
    this.overlayPanel.open(this.panel(), () => this.close(), {
      minWidth: this.hostRef.nativeElement.offsetWidth,
    });
    this.open.set(true);
  }

  protected close(): void {
    this.overlayPanel.close();
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  /**
   * Leaving the field puts the box back in step with the value: a half-typed
   * term next to a stale selection is the one state this control must never be
   * left in.
   */
  protected handleFieldBlur(): void {
    const selected = this.selectedOption();
    this.query.set(selected === null ? '' : this.labelOf(selected));
    if (this.open()) {
      this.close();
    }
    this.handleBlur();
  }

  // ── Selection ───────────────────────────────────────────────────────────

  protected select(option: GmAutocompleteSuggestion): void {
    this.selectedOption.set(option);
    this.query.set(this.labelOf(option));
    this.commit(this.valueForOption(option));
    this.optionSelect.emit(option);
    this.close();
    this.focusInput();
  }

  protected clear(event?: Event): void {
    // Without this the click would bubble into the field and reopen the list.
    event?.stopPropagation();
    this.selectedOption.set(null);
    this.query.set('');
    this.commit(null);
    if (this.open()) {
      this.close();
    }
    this.focusInput();
  }

  // ── Keyboard ────────────────────────────────────────────────────────────

  protected onKeydown(event: KeyboardEvent): void {
    if (this.locked()) {
      return;
    }

    const count = this.suggestions().length;
    const isOpen = this.open();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          this.show();
          return;
        }
        this.move(1, count);
        return;

      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          this.move(-1, count);
        }
        return;

      case 'Home':
        if (isOpen && count) {
          event.preventDefault();
          this.activeIndex.set(0);
        }
        return;

      case 'End':
        if (isOpen && count) {
          event.preventDefault();
          this.activeIndex.set(count - 1);
        }
        return;

      case 'Enter': {
        if (!isOpen) {
          return;
        }
        const active = this.suggestions()[this.activeIndex()];
        if (active !== undefined) {
          // Only swallowed when it actually picks something, so Enter still
          // submits the surrounding form otherwise.
          event.preventDefault();
          this.select(active);
        }
        return;
      }

      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          this.close();
        }
        return;

      default:
        return;
    }
  }

  private move(delta: number, count: number): void {
    if (!count) {
      return;
    }
    this.activeIndex.set((this.activeIndex() + delta + count) % count);
  }

  private focusInput(): void {
    this.hostRef.nativeElement
      .querySelector<HTMLElement>('.gm-field__control')
      ?.focus();
  }
}
