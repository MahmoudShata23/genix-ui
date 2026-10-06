import {
  Directive,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { GmFormFieldBase } from './form-field-base';
import { gmOptionLabel, gmOptionValue, gmReadOption } from './option-reader';
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

  /**
   * Switches `options` from a flat list to a list of groups, each rendered as
   * a non-interactive header row followed by its own options. Set together
   * with `optionGroupChildren`; omit both for the (default) flat list.
   *
   * ```html
   * <gm-select [options]="groups" optionGroupLabel="label"
   *            optionGroupChildren="items" optionLabel="name" optionValue="id" />
   * ```
   */
  readonly optionGroupLabel = input<string>();

  /** Property holding a group's child options array. See `optionGroupLabel`. */
  readonly optionGroupChildren = input<string>();

  readonly placeholder = input<string>();

  /** Explicit placeholder; otherwise the translated `Select {label}`. */
  protected readonly placeholderText = computed(
    () => this.placeholder() ?? this.fieldPlaceholder('select'),
  );

  readonly filter = input(false, { transform: booleanAttribute });

  readonly filterPlaceholder = input<string>();

  protected readonly filterPlaceholderText = computed(
    () => this.filterPlaceholder() ?? this.labels().search,
  );

  /** Property to match while filtering. Defaults to `optionLabel`. */
  readonly filterBy = input<string>();

  readonly clearable = input(false, { transform: booleanAttribute });

  readonly loading = input(false, { transform: booleanAttribute });

  readonly emptyMessage = input<string>();

  readonly emptyFilterMessage = input<string>();

  /** What the panel says when there is nothing to list. */
  protected readonly emptyText = computed(() =>
    this.filterText()
      ? (this.emptyFilterMessage() ?? this.labels().noResults)
      : (this.emptyMessage() ?? this.labels().noOptions),
  );

  /**
   * Renders only the rows in view, for lists long enough that a row per
   * option is the bottleneck. Fixed row height — see `virtualItemSize`.
   */
  readonly virtualScroll = input(false, { transform: booleanAttribute });

  /**
   * Row height in pixels while virtualising. Every row is pinned to it,
   * since fixed-size virtualisation is what computes the scroll offsets.
   */
  readonly virtualItemSize = input(40, { transform: numberAttribute });

  /** Any CSS length. Matches the non-virtual list's cap by default. */
  readonly virtualScrollHeight = input<string>('16rem');

  protected readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The shared overlay engine — same one `gm-datepicker` uses. */
  protected readonly overlayPanel = gmOverlayPanel();

  protected readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  /**
   * The trigger button, not the host. The host also wraps the label and the
   * error/hint line below the trigger, so anchoring to it would let the
   * panel's position drift whenever that line's content changes (e.g. an
   * error appearing) instead of always opening directly under the trigger.
   */
  protected readonly triggerRef =
    viewChild.required<ElementRef<HTMLElement>>('trigger');

  protected readonly open = signal(false);
  protected readonly filterText = signal('');

  /**
   * The filter term, on every keystroke. Exists so a consumer can run a
   * server-side search rather than filter the `options` it already holds.
   *
   * Deliberately not emitted when closing clears the term: a consumer fetching
   * on this event would otherwise re-fetch the unfiltered list every time the
   * panel closed.
   */
  readonly filterChange = output<string>();

  /** Panel opened (`true`) or closed (`false`). */
  readonly openChange = output<boolean>();

  /** Index into `visibleOptions`, for keyboard highlight + activedescendant. */
  protected readonly activeIndex = signal(-1);

  readonly listboxId = gmUniqueId('gm-listbox');

  /** Interaction is blocked while read-only or still loading its options. */
  protected readonly locked = computed(
    () => this.isDisabled() || this.readOnly() || this.loading(),
  );

  /** Whether `options` holds groups (`optionGroupLabel`/`optionGroupChildren`
   * both set) rather than a flat option list. */
  protected readonly isGrouped = computed(
    () => this.optionGroupLabel() !== undefined && this.optionGroupChildren() !== undefined,
  );

  /**
   * `options` flattened to real, selectable options — identical to `options()`
   * itself when ungrouped. Every selection/keyboard code path reads options
   * through here (never through `options()` directly) so grouping only ever
   * changes what the panel renders, not what can be the control's value.
   */
  protected readonly flatOptions = computed(() => {
    if (!this.isGrouped()) {
      return this.options();
    }
    const childrenKey = this.optionGroupChildren();
    return this.options().flatMap(
      (group) => (this.read(group, childrenKey) as GmDropdownOption[] | undefined) ?? [],
    );
  });

  protected readonly visibleOptions = computed(() => {
    const term = this.filterText().trim().toLowerCase();
    if (!this.filter() || !term) {
      // Returns the flattened array untouched — filtering never mutates it.
      return this.flatOptions();
    }
    const key = this.filterBy() ?? this.optionLabel();
    return this.flatOptions().filter((option) =>
      String(this.read(option, key) ?? '')
        .toLowerCase()
        .includes(term),
    );
  });

  /**
   * Render-only group boundaries over `visibleOptions()`: for each group that
   * still has at least one visible option after filtering, the group's label
   * and the starting index (into `visibleOptions()`) of its first option.
   * Empty when ungrouped — the panel template falls back to its existing
   * flat `<li>` loop in that case, unchanged from before grouping existed.
   */
  protected readonly visibleGroupBoundaries = computed(() => {
    if (!this.isGrouped()) {
      return [];
    }
    const labelKey = this.optionGroupLabel();
    const childrenKey = this.optionGroupChildren();
    const visible = this.visibleOptions();

    const boundaries: { label: string; startIndex: number }[] = [];
    let cursor = 0;
    for (const group of this.options()) {
      const groupChildren =
        (this.read(group, childrenKey) as GmDropdownOption[] | undefined) ?? [];
      const visibleCount = groupChildren.filter((child) => visible.includes(child)).length;
      if (visibleCount > 0) {
        boundaries.push({ label: gmOptionLabel(group, labelKey), startIndex: cursor });
      }
      cursor += visibleCount;
    }
    return boundaries;
  });

  protected readonly activeOptionId = computed(() => {
    const index = this.activeIndex();
    return index < 0 ? null : this.optionId(index);
  });

  /** The group header label to render immediately before `visibleOptions()[index]`,
   * or `null` when that option does not start a new group (including the
   * entire ungrouped case, where `visibleGroupBoundaries()` is always empty). */
  protected groupHeaderAt(index: number): string | null {
    return this.visibleGroupBoundaries().find((b) => b.startIndex === index)?.label ?? null;
  }

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
    return gmOptionLabel(option, this.optionLabel());
  }

  /** Form value for an option, honouring `optionValue`. */
  protected valueForOption(option: GmDropdownOption): unknown {
    return gmOptionValue(option, this.optionValue());
  }

  /** Reads `key` off an object option; a primitive option is its own value. */
  protected read(option: GmDropdownOption, key: string | undefined): unknown {
    return gmReadOption(option, key);
  }

  // ── Open / close ────────────────────────────────────────────────────────

  protected toggle(): void {
    this.open() ? this.close() : this.show();
  }

  protected show(): void {
    if (this.locked() || this.open()) {
      return;
    }

    const triggerWidth = this.triggerRef().nativeElement.offsetWidth;

    this.overlayPanel.open(this.panel(), () => this.close(), {
      // Pinned to the trigger's width on both sides: `maxWidth` stops a long
      // option label from widening the panel past it (the label wraps
      // instead), and `minWidth` stops the panel from shrink-wrapping
      // narrower than the trigger when every option is short.
      minWidth: triggerWidth,
      maxWidth: triggerWidth,
      origin: this.triggerRef().nativeElement,
    });

    this.open.set(true);
    this.openChange.emit(true);

    // Start on the current selection so arrows continue from it; with nothing
    // selected, opening highlights the first option (what ArrowDown-to-open is
    // expected to do).
    const selected = this.visibleOptions().findIndex((option) =>
      this.isSelected(option),
    );
    this.activeIndex.set(
      selected >= 0 ? selected : this.visibleOptions().length ? 0 : -1,
    );

    this.focusOnOpen();
  }

  /**
   * Focus follows the open: into the search box when the panel has one, else
   * onto the trigger (a mouse click does not focus a button in every browser,
   * and the arrow keys are handled from there). The search box only exists once
   * the panel has rendered, so the lookup retries for a few frames.
   */
  private focusOnOpen(): void {
    if (!this.filter()) {
      this.focusTrigger();
      return;
    }
    let attempts = 5;
    const tryFocus = () => {
      const input = this.overlayPanel.panelElement?.querySelector<HTMLElement>(
        '.gm-dropdown__filter-input',
      );
      if (input) {
        input.focus();
      } else if (--attempts > 0 && this.open()) {
        requestAnimationFrame(tryFocus);
      }
    };
    requestAnimationFrame(tryFocus);
  }

  protected close(): void {
    // A redundant close stays quiet — `close()` also runs on outside clicks
    // and when the control locks, which can land while already closed.
    const wasOpen = this.open();
    this.overlayPanel.close();
    this.open.set(false);
    if (wasOpen) {
      this.openChange.emit(false);
    }
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
    this.filterChange.emit(this.filterText());
    // The previous highlight may no longer be in the filtered list.
    this.activeIndex.set(this.visibleOptions().length ? 0 : -1);
    // A new term shortens the list, so the old scroll offset is meaningless.
    const viewport = this.viewportElement();
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }

  // ── Keyboard ────────────────────────────────────────────────────────────

  /**
   * Handles the key, then brings the highlight back into view. The reveal
   * has to happen here rather than per-case: an option scrolled out of a
   * virtualised list is not rendered at all, and `aria-activedescendant`
   * must point at a row that exists.
   */
  protected onKeydown(event: KeyboardEvent): void {
    this.handleKeydown(event);
    if (this.virtualScroll() && this.open()) {
      this.revealActiveOption();
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
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

  /**
   * Scrolls the smallest amount that puts the active row fully in view, so
   * arrowing down one row moves the list by one row rather than jumping the
   * active option to the top.
   */
  private revealActiveOption(): void {
    const viewport = this.viewportElement();
    const index = this.activeIndex();
    if (!viewport || index < 0) {
      return;
    }

    const itemSize = this.virtualItemSize();
    const offset = viewport.scrollTop;
    const height = viewport.clientHeight;
    const top = index * itemSize;

    if (top < offset) {
      viewport.scrollTop = top;
    } else if (top + itemSize > offset + height) {
      viewport.scrollTop = top + itemSize - height;
    }
  }

  /**
   * The scroll container, found through the overlay rather than a view
   * query: the panel is an embedded view the portal created, which a view
   * query does not reach into. Setting `scrollTop` is what the CDK viewport
   * does internally, and its own scroll listener picks the change up.
   */
  private viewportElement(): HTMLElement | null {
    return (
      this.overlayPanel.panelElement?.querySelector<HTMLElement>(
        '.gm-dropdown__viewport',
      ) ?? null
    );
  }

  private move(delta: number, count: number): void {
    if (!count) {
      return;
    }
    this.activeIndex.set((this.activeIndex() + delta + count) % count);
  }
}
