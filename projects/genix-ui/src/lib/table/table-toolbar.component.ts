import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  booleanAttribute,
  computed,
  input,
  inject,
  model,
  numberAttribute,
  output,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, debounce, distinctUntilChanged, tap, timer } from "rxjs";

import { GmButtonComponent } from "../button/button.component";
import { GmInputComponent } from "../input/input.component";
import { GmMultiselectComponent } from "../multiselect/multiselect.component";
import { GmTooltipDirective } from "../tooltip/tooltip.directive";
import type { GmSize } from "../core/types";
import {
  GM_ADD_ACTION_KEY,
  type GmTableAction,
  type GmTableActionEvent,
  type GmTableToolbarAlign,
} from "./table-action.types";
import type { GmTableColumn } from "./table.types";

/**
 * The bar above a `gm-table`: config-driven action buttons on one edge, and on
 * the other a column chooser plus a slot for any further view controls.
 *
 * ```html
 * <gm-table-toolbar
 *   [actions]="toolbarActions"
 *   [selection]="selected()"
 *   [columns]="columns"
 *   [(visibleFields)]="visibleFields"
 *   showColumnChooser
 *   (actionClick)="onAction($event)"
 * >
 *   <gm-button gmTableToolbarEnd icon="pi pi-filter-slash" … />
 * </gm-table-toolbar>
 * ```
 *
 * Deliberately a sibling of `gm-table` rather than part of it. The table owns
 * rows; a toolbar owns business actions, and folding the two together is what
 * makes a grid component impossible to reuse. It takes `selection` as a plain
 * input, so it pairs with `[(selection)]` on the table and needs no shared
 * service.
 *
 * An action with `scope: 'selection'` appears only once rows are ticked, which
 * is how a bulk Delete is wired up — see `GmTableAction`.
 *
 * With `showSearch`, the aside also holds a search box. It debounces and
 * de-duplicates the term itself and reports it on `searchChange`, so the
 * receiving end must not debounce again:
 *
 * ```html
 * <gm-table-toolbar showSearch (searchChange)="grid.setGlobalSearch($event, { debounce: false })" />
 * <gm-table #grid ... />
 * ```
 */
@Component({
  selector: "gm-table-toolbar",
  standalone: true,
  imports: [
    FormsModule,
    GmButtonComponent,
    GmInputComponent,
    GmMultiselectComponent,
    GmTooltipDirective,
  ],
  templateUrl: "./table-toolbar.component.html",
  styleUrl: "./table-toolbar.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "gm-table-toolbar-host" },
})
export class GmTableToolbarComponent<T> {
  // Optional: the toolbar must instantiate without a router, so a consumer
  // rendering a table outside a routed context is not forced to provide one.
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  readonly actions = input<readonly GmTableAction<T>[]>([]);

  /** The table's current selection. Feed `[(selection)]`'s signal straight in. */
  readonly selection = input<readonly T[]>([]);

  /** Size applied to every action that does not override it. */
  readonly size = input<GmSize>("small");

  /** Disables every action and the chooser — for a toolbar over a loading table. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Which edge the actions sit on. `auto` (the default) moves them to the end
   * edge only when nothing else is there, so turning `showColumnChooser` off
   * does not leave the bar lopsided.
   */
  readonly actionsAlign = input<GmTableToolbarAlign>("auto");

  /**
   * Fires for every action, whether or not it carries a `command`, so a
   * consumer can switch on `action.key` in one handler instead of closing over
   * a callback per entry.
   */
  readonly actionClick = output<GmTableActionEvent<T>>();

  // ── Column chooser ──────────────────────────────────────────────────────

  /**
   * Columns offered in the chooser. Pass the same array the table gets: a
   * column with no `field`, or with `toggleable: false`, is skipped.
   */
  readonly columns = input<readonly GmTableColumn<T>[]>([]);

  /**
   * Fields currently shown, two-way. Authoritative — seed it with every field
   * that should start visible, and filter the table's own `columns` by it.
   */
  readonly visibleFields = model<string[]>([]);

  readonly showColumnChooser = input(false, { transform: booleanAttribute });

  /**
   * Floor on the chooser, so the user cannot hide the whole grid. An attempt to
   * go below it is reverted and reported on `columnChooserRejected`.
   */
  readonly minVisibleColumns = input(1, { transform: numberAttribute });

  readonly columnChooserLabel = input<string>("Columns");

  // ── Global search ───────────────────────────────────────────────────────

  /**
   * Shows the search box. Opt-in: the term is only a report — nothing in the
   * toolbar acts on it — so a bar that showed the box by default would put a
   * dead control on every existing table until its host wired the output up.
   */
  readonly showSearch = input(false, { transform: booleanAttribute });

  readonly searchPlaceholder = input<string>("Search");

  /**
   * The box carries no visible label, so it needs an accessible name of its
   * own — the leading icon is decoration and is hidden from screen readers.
   */
  readonly searchAriaLabel = input<string>("Search");

  /** Announced while a typed term is still settling. */
  readonly searchLoadingLabel = input<string>("Searching");

  /**
   * What the box holds, two-way. Seeding it emits nothing on `searchChange`,
   * so restoring a route or a saved view does not look like a keystroke.
   *
   * A `model` rather than a plain input because the box has to be clearable
   * from outside *after* the user has typed. Under a one-way input the host's
   * own signal goes stale the moment a key is pressed — it would still read
   * `''` while the field showed a word — so asking it to clear would set `''`
   * over `''`, change nothing, and leave the stale term on screen. Writing
   * every keystroke back keeps the host's copy true, which is what makes
   * `searchTerm.set('')` a real change.
   */
  readonly searchTerm = model<string>("");

  /**
   * Quiet period after the last keystroke before the term is reported, in ms.
   * Set it to 0 to report every keystroke.
   */
  readonly searchDebounce = input(400, { transform: numberAttribute });

  /**
   * A settled search term. Already debounced and de-duplicated, so a handler
   * can fetch on it directly — and, because the toolbar has done that work,
   * it must not be fed to a second debounce downstream. Pair it with
   * `gm-table`'s `setGlobalSearch(term, { debounce: false })`.
   */
  readonly searchChange = output<string>();

  /** Keystrokes, before debouncing. */
  private readonly search$ = new Subject<string>();

  /**
   * True from a keystroke until the term settles, which is what swaps the
   * field's search icon for a spinner. It is not "a request is in flight" —
   * the toolbar cannot know that — but it does cover the window in which the
   * user has typed and nothing has happened yet, which is the wait that
   * otherwise looks like a dropped keystroke.
   */
  protected readonly searchPending = signal(false);

  constructor() {
    this.search$
      .pipe(
        // `debounce` over `debounceTime`: the delay is an input, so it has to
        // be read per keystroke rather than fixed when the pipe is built.
        debounce(() => timer(this.searchDebounce())),
        // Before distinctUntilChanged, so the spinner clears even when the
        // term turns out to be a duplicate and nothing is emitted. After it,
        // typing a character and deleting it would spin forever.
        tap(() => this.searchPending.set(false)),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => this.searchChange.emit(term));
  }

  protected onSearchInput(value: string | number | null): void {
    const term = value === null ? "" : String(value);
    this.searchTerm.set(term);
    this.searchPending.set(true);
    this.search$.next(term);
  }

  /** `{0}` is replaced with the count, matching `gm-multiselect`. */
  readonly selectedColumnsLabel = input<string>("{0} items selected");

  /** The rejected change's floor, for a consumer that wants to explain it. */
  readonly columnChooserRejected = output<number>();

  protected readonly columnOptions = computed(() =>
    this.columns()
      .filter((column) => !!column.field && column.toggleable !== false)
      .map((column) => ({
        label: column.header,
        value: column.field as string,
      })),
  );

  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * The actions actually rendered: scope first, then the action's own
   * `visible` predicate, so a `selection` action can additionally depend on a
   * permission without restating the selection check.
   */
  protected readonly visibleActions = computed<readonly GmTableAction<T>[]>(
    () => {
      const rows = this.selection();
      return this.actions().filter((action) => {
        if (
          (action.scope ?? "global") === "selection" &&
          rows.length < (action.minSelection ?? 1)
        ) {
          return false;
        }
        return action.visible?.(rows) ?? true;
      });
    },
  );

  /** True while any selection-scoped action is showing — styles the bar. */
  protected readonly hasSelection = computed(() => this.selection().length > 0);

  protected isDisabled(action: GmTableAction<T>): boolean {
    return this.disabled() || (action.disabled?.(this.selection()) ?? false);
  }

  protected sizeOf(action: GmTableAction<T>): GmSize {
    return action.size ?? this.size();
  }

  /**
   * An icon-only action still needs a name; the tooltip is the natural place a
   * consumer already wrote one, so it doubles as the fallback.
   */
  protected labelFor(action: GmTableAction<T>): string | undefined {
    return action.ariaLabel ?? (action.label ? undefined : action.tooltip);
  }

  protected onAction(action: GmTableAction<T>): void {
    const rows = [...this.selection()];

    if (action.key === GM_ADD_ACTION_KEY) {
      if (action.addClicked) {
        action.addClicked();
      } else if (this.router && this.route) {
        this.router.navigate(["create"], { relativeTo: this.route });
      }
    } else {
      action.command?.(rows);
    }

    this.actionClick.emit({ action, rows });
  }

  protected onColumnsChange(value: unknown): void {
    const fields = Array.isArray(value)
      ? value.filter((field): field is string => typeof field === "string")
      : [];

    if (fields.length < this.minVisibleColumns()) {
      // Re-assert the current selection under a fresh reference, so the
      // control snaps back rather than sitting on a value we refused.
      this.visibleFields.set([...this.visibleFields()]);
      this.columnChooserRejected.emit(this.minVisibleColumns());
      return;
    }

    this.visibleFields.set(fields);
  }
}
