import {
  Directive,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { GmFormFieldBase } from './form-field-base';
import { gmOverlayPanel } from './overlay-panel';
import { gmUniqueId } from './unique-id';

/**
 * An option is either a primitive or an object addressed through
 * `optionLabel` / `optionValue`. Typed as `unknown` so any interface array
 * assigns without needing an index signature.
 */
export type GmDropdownOption = unknown;

/**
 * Shared machinery for the option-list controls (`gm-select`,
 * `gm-multiselect`): the CDK overlay lifecycle, option label/value reading,
 * filtering, and the roving keyboard highlight.
 *
 * Subclasses supply only what actually differs between single and multiple
 * selection — `isSelected` and `commitActive` — plus a `#panel` template.
 */
@Directive()
export abstract class GmDropdownBase<T> extends GmFormFieldBase<T> {
  readonly options = input<readonly GmDropdownOption[]>([]);

  /** Property holding an option's display text. Omit for primitive options. */
  readonly optionLabel = input<string>();

  /** Property holding an option's form value. Omit to store the whole option. */
  readonly optionValue = input<string>();

  readonly placeholder = input<string>('');

  readonly filter = input(false, { transform: booleanAttribute });

  readonly filterPlaceholder = input<string>('');

  /** Property to match while filtering. Defaults to `optionLabel`. */
  readonly filterBy = input<string>();

  readonly clearable = input(false, { transform: booleanAttribute });

  readonly loading = input(false, { transform: booleanAttribute });

  readonly emptyMessage = input<string>('No options available');

  readonly emptyFilterMessage = input<string>('No results found');

  protected readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The shared overlay engine — same one `gm-datepicker` uses. */
  private readonly overlayPanel = gmOverlayPanel();

  protected readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  protected readonly open = signal(false);
  protected readonly filterText = signal('');

  /** Index into `visibleOptions`, for keyboard highlight + activedescendant. */
  protected readonly activeIndex = signal(-1);

  readonly listboxId = gmUniqueId('gm-listbox');

  /** Interaction is blocked while read-only or still loading its options. */
  protected readonly locked = computed(
    () => this.isDisabled() || this.readOnly() || this.loading(),
  );

  protected readonly visibleOptions = computed(() => {
    const term = this.filterText().trim().toLowerCase();
    if (!this.filter() || !term) {
      // Returns the input array untouched — filtering never mutates it.
      return this.options();
    }
    const key = this.filterBy() ?? this.optionLabel();
    return this.options().filter((option) =>
      String(this.read(option, key) ?? '')
        .toLowerCase()
        .includes(term),
    );
  });

  protected readonly activeOptionId = computed(() => {
    const index = this.activeIndex();
    return index < 0 ? null : this.optionId(index);
  });

  constructor() {
    super();
    // Losing the ability to interact must also close an open panel.
    effect(() => {
      if (this.locked() && this.open()) {
        this.close();
      }
    });
  }

  /** Whether an option is part of the current value. */
  protected abstract isSelected(option: GmDropdownOption): boolean;

  /** Applies the highlighted option — select, or toggle, per subclass. */
  protected abstract commitActive(option: GmDropdownOption): void;

  // ── Option reading ──────────────────────────────────────────────────────

  protected optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  /** Display text for an option, honouring `optionLabel`. */
  protected labelOf(option: GmDropdownOption): string {
    return String(this.read(option, this.optionLabel()) ?? '');
  }

  /** Form value for an option, honouring `optionValue`. */
  protected valueForOption(option: GmDropdownOption): unknown {
    const key = this.optionValue();
    return key ? this.read(option, key) : option;
  }

  /** Reads `key` off an object option; a primitive option is its own value. */
  protected read(
    option: GmDropdownOption,
    key: string | undefined,
  ): unknown {
    if (!key || option === null || typeof option !== 'object') {
      return option;
    }
    return (option as Record<string, unknown>)[key];
  }

  // ── Open / close ────────────────────────────────────────────────────────

  protected toggle(): void {
    this.open() ? this.close() : this.show();
  }

  protected show(): void {
    if (this.locked() || this.open()) {
      return;
    }

    this.overlayPanel.open(this.panel(), () => this.close(), {
      // Panel matches the trigger unless its own content is wider.
      minWidth: this.hostRef.nativeElement.offsetWidth,
    });

    this.open.set(true);

    // Start on the current selection so arrows continue from it; with nothing
    // selected, opening highlights the first option (what ArrowDown-to-open is
    // expected to do).
    const selected = this.visibleOptions().findIndex((option) =>
      this.isSelected(option),
    );
    this.activeIndex.set(
      selected >= 0 ? selected : this.visibleOptions().length ? 0 : -1,
    );
  }

  protected close(): void {
    this.overlayPanel.close();
    this.open.set(false);
    this.filterText.set('');
    this.activeIndex.set(-1);
    // Closing ends the interaction, which is when the control becomes touched.
    this.handleBlur();
  }

  protected focusTrigger(): void {
    this.hostRef.nativeElement
      .querySelector<HTMLElement>('.gm-dropdown__trigger')
      ?.focus();
  }

  // ── Filtering ───────────────────────────────────────────────────────────

  protected onFilterInput(event: Event): void {
    this.filterText.set((event.target as HTMLInputElement).value);
    // The previous highlight may no longer be in the filtered list.
    this.activeIndex.set(this.visibleOptions().length ? 0 : -1);
  }

  // ── Keyboard ────────────────────────────────────────────────────────────

  protected onKeydown(event: KeyboardEvent): void {
    if (this.locked()) {
      return;
    }

    const isOpen = this.open();
    const count = this.visibleOptions().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        isOpen ? this.move(1, count) : this.show();
        return;

      case 'ArrowUp':
        event.preventDefault();
        isOpen ? this.move(-1, count) : this.show();
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

      case 'Enter':
      case ' ':
        // While filtering, Space is text input rather than a command.
        if (event.key === ' ' && isOpen && this.filter()) {
          return;
        }
        event.preventDefault();
        if (!isOpen) {
          this.show();
          return;
        }
        {
          const active = this.visibleOptions()[this.activeIndex()];
          if (active !== undefined) {
            this.commitActive(active);
          }
        }
        return;

      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          this.close();
          this.focusTrigger();
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
}
