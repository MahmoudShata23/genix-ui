import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  numberAttribute,
  output,
  signal,
} from '@angular/core';

import { GmFormFieldBase } from '../core/form-field-base';
import { gmOptionLabel, gmOptionValue, gmReadOption } from '../core/option-reader';
import type { GmSize } from '../core/types';
import { gmUniqueId } from '../core/unique-id';
import { GmSpinnerComponent } from '../spinner/spinner.component';
import {
  GmTreeCheckboxDirective,
  GmTreeEmptyDirective,
  GmTreeFooterDirective,
  GmTreeHeaderDirective,
  GmTreeIconDirective,
  GmTreeNodeDirective,
  GmTreeTogglerDirective,
} from './tree-templates.directive';
import type {
  GmTreeCheckState,
  GmTreeFilterEvent,
  GmTreeFilterMode,
  GmTreeIconContext,
  GmTreeLoadingMode,
  GmTreeNodeContext,
  GmTreeNodeEvent,
  GmTreeSelectionMode,
} from './tree.types';

/** One node of `nodes`, indexed once per `nodes` change. */
interface TreeEntry {
  readonly node: unknown;
  /** `nodeKey` when the node has one, otherwise the node itself. */
  readonly key: unknown;
  readonly parent: TreeEntry | null;
  /** 1 for a root node — the value `aria-level` takes. */
  readonly level: number;
  children: TreeEntry[];
}

/** A node as the current filter shows it: the same entry, fewer children. */
interface TreeView {
  readonly entry: TreeEntry;
  readonly children: readonly TreeView[];
}

/** One rendered row — the visible, expanded part of the view, flattened. */
interface TreeRow {
  readonly entry: TreeEntry;
  readonly expanded: boolean;
  readonly hasChildren: boolean;
  readonly posInSet: number;
  readonly setSize: number;
  /** Whether a later sibling follows — its guide line continues below. */
  readonly hasNextSibling: boolean;
  /**
   * Guide lines passing through this row, one per ancestor column (column 1
   * sits under the root's leading slot). `true` where an ancestor has a later
   * sibling, so its line runs on past this row.
   */
  readonly guides: readonly boolean[];
  /** The row's siblings in the current view, for `*` (expand siblings). */
  readonly siblings: readonly TreeView[];
}

interface LabelPart {
  readonly text: string;
  readonly match: boolean;
}

/** `activeKey` before any row has been navigated to. */
const NO_ROW = Symbol('gm-tree-no-row');

/** How long type-ahead keeps adding to its search string. */
const TYPE_AHEAD_MS = 500;

/**
 * Hierarchical list — PrimeNG's `p-tree`, without the PrimeNG dependency.
 *
 * ```html
 * <!-- Browse and pick one node -->
 * <gm-tree [nodes]="questions" selectionMode="single" [formControl]="current"
 *          [filter]="true" [showLines]="true" [collapsible]="false" />
 *
 * <!-- Cascading checkboxes -->
 * <gm-tree formControlName="permissions" [nodes]="permissionTree"
 *          selectionMode="checkbox" label="Permissions" />
 * ```
 *
 * **Value** (per `selectionMode`). `none` has none. `single` holds the node —
 * or its `optionValue` with that input set. `multiple` holds an array of them.
 * `checkbox` holds, like PrimeNG, every *fully* checked node, parents and
 * leaves alike; a partly checked parent is not in the value and renders mixed.
 * That partial state is derived, never written back onto the nodes (PrimeNG's
 * `partialSelected`), so `nodes` is not mutated. Values the tree cannot place —
 * say, children of a node not loaded yet — are kept as they are.
 *
 * **Lazy loading.** Expanding a node with `leaf: false` and no children emits
 * `nodeExpand`; the app fetches and assigns a new `nodes` array. The tree
 * itself never fetches. Give nodes a `key` so selection and expansion survive
 * the new array.
 *
 * Rows render as one flat list of `treeitem`s carrying `aria-level` /
 * `aria-posinset` / `aria-setsize`, which is what lets the same markup be
 * virtualised; focus stays on the tree and moves by `aria-activedescendant`.
 */
@Component({
  selector: 'gm-tree',
  standalone: true,
  imports: [
    GmSpinnerComponent,
    NgTemplateOutlet,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
  ],
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-tree-host',
    '[class.gm-tree-host--invalid]': 'hasError()',
    '[class.gm-tree-host--disabled]': 'isDisabled()',
    '[class.gm-tree-host--readonly]': 'readOnly()',
    '[class.gm-tree-host--selectable]': "selectionMode() !== 'none'",
    '[class.gm-tree-host--small]': "size() === 'small'",
    '[class.gm-tree-host--large]': "size() === 'large'",
  },
})
export class GmTreeComponent extends GmFormFieldBase<unknown> {
  readonly nodes = input<readonly unknown[]>([]);

  /** Property holding a node's display text. */
  readonly optionLabel = input<string>('label');

  /** Property holding a node's child array. */
  readonly optionChildren = input<string>('children');

  /**
   * Property identifying a node. Nodes without it are identified by object
   * identity, which does not survive a new `nodes` array.
   */
  readonly nodeKey = input<string>('key');

  /** Property holding a node's form value. Omit to store the nodes themselves. */
  readonly optionValue = input<string>();

  // ── Selection ───────────────────────────────────────────────────────────

  readonly selectionMode = input<GmTreeSelectionMode>('none');

  /**
   * `multiple` mode: a plain click replaces the selection and Ctrl/⌘-click
   * adds to it, as in a file manager. Off, every click toggles. Keyboard
   * Space/Enter always toggles.
   */
  readonly metaKeySelection = input(false, { transform: booleanAttribute });

  /** `checkbox` mode: checking a node also checks its selectable descendants. */
  readonly propagateSelectionDown = input(true, { transform: booleanAttribute });

  /** `checkbox` mode: a node whose selectable children are all checked counts as checked. */
  readonly propagateSelectionUp = input(true, { transform: booleanAttribute });

  // ── Presentation ────────────────────────────────────────────────────────

  /**
   * Off, every node is always expanded and no toggler is drawn — for trees
   * that are read as a whole, like a question/answer outline.
   */
  readonly collapsible = input(true, { transform: booleanAttribute });

  /** Draws guide lines connecting each node to its parent. */
  readonly showLines = input(false, { transform: booleanAttribute });

  readonly size = input<GmSize>('medium');

  // ── Search ──────────────────────────────────────────────────────────────

  readonly filter = input(false, { transform: booleanAttribute });

  /** Comma-separated properties to match. Defaults to `optionLabel`. */
  readonly filterBy = input<string>();

  readonly filterMode = input<GmTreeFilterMode>('lenient');

  readonly filterPlaceholder = input<string>('Search');

  /** Locale for case-insensitive matching, e.g. `'tr'`. The runtime's by default. */
  readonly filterLocale = input<string>();

  readonly emptyMessage = input<string>('No items available');

  readonly emptyFilterMessage = input<string>('No results found');

  // ── Loading ─────────────────────────────────────────────────────────────

  /** Tree-level busy state; blocks selection until cleared. */
  readonly loading = input(false, { transform: booleanAttribute });

  readonly loadingMode = input<GmTreeLoadingMode>('mask');

  // ── Scrolling ───────────────────────────────────────────────────────────

  /**
   * Any CSS length. Caps the rows' height and scrolls beyond it; the
   * virtualised list needs a fixed height, so it defaults to `16rem` there.
   */
  readonly scrollHeight = input<string>();

  /**
   * Renders only the rows in view, for trees large enough that a row per
   * visible node is the bottleneck. Fixed row height — see `virtualItemSize`.
   */
  readonly virtualScroll = input(false, { transform: booleanAttribute });

  /** Row height in pixels while virtualising. Every row is pinned to it. */
  readonly virtualItemSize = input(34, { transform: numberAttribute });

  // ── Outputs ─────────────────────────────────────────────────────────────

  readonly nodeSelect = output<GmTreeNodeEvent>();

  readonly nodeUnselect = output<GmTreeNodeEvent>();

  /**
   * A node opened. For a lazy node (`leaf: false`, no children) this is the
   * cue to load its children.
   */
  readonly nodeExpand = output<GmTreeNodeEvent>();

  readonly nodeCollapse = output<GmTreeNodeEvent>();

  /** The search term, on every keystroke. Not emitted by `resetFilter()`. */
  readonly filterChange = output<GmTreeFilterEvent>();

  // ── Templates ───────────────────────────────────────────────────────────

  private readonly nodeTemplates = contentChildren(GmTreeNodeDirective);

  protected readonly headerTemplate = contentChild(GmTreeHeaderDirective);

  protected readonly footerTemplate = contentChild(GmTreeFooterDirective);

  protected readonly emptyTemplate = contentChild(GmTreeEmptyDirective);

  protected readonly togglerTemplate = contentChild(GmTreeTogglerDirective);

  protected readonly checkboxTemplate = contentChild(GmTreeCheckboxDirective);

  protected readonly iconTemplate = contentChild(GmTreeIconDirective);

  // ── State ───────────────────────────────────────────────────────────────

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly filterText = signal('');

  /**
   * Expansion the user chose, by node key. A node absent here falls back to
   * its own `expanded` flag, so a new `nodes` array can still seed new nodes.
   */
  private readonly expansion = signal<ReadonlyMap<unknown, boolean>>(new Map());

  /**
   * Nodes collapsed while a search term is active. Searching opens every
   * matching path; this lets the user close one again without disturbing
   * `expansion`, and it resets whenever the term changes.
   */
  private readonly filterCollapsed = signal<ReadonlySet<unknown>>(new Set());

  private readonly activeKey = signal<unknown>(NO_ROW);

  protected readonly focused = signal(false);

  private typeAhead = '';
  private typeAheadTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly labelId = computed(() => `${this.controlId()}-label`);

  protected readonly isCheckbox = computed(
    () => this.selectionMode() === 'checkbox',
  );

  /** `aria-multiselectable` — set only where more than one node can be chosen. */
  protected readonly multiselectable = computed(() => {
    const mode = this.selectionMode();
    return mode === 'multiple' || mode === 'checkbox' ? 'true' : null;
  });

  /** Selecting is blocked while disabled, read-only or loading; browsing is not. */
  protected readonly selectLocked = computed(
    () => this.isDisabled() || this.readOnly() || this.loading(),
  );

  private readonly index = computed(() => {
    const childrenKey = this.optionChildren();
    const valueKey = this.optionValue();
    const byKey = new Map<unknown, TreeEntry>();
    const byValue = new Map<unknown, TreeEntry>();
    /** Every entry, depth-first — the order the value is written in. */
    const order: TreeEntry[] = [];

    const build = (
      nodes: readonly unknown[],
      parent: TreeEntry | null,
      level: number,
    ): TreeEntry[] =>
      nodes.map((node) => {
        const entry: TreeEntry = {
          node,
          key: this.keyOf(node),
          parent,
          level,
          children: [],
        };
        byKey.set(entry.key, entry);
        byValue.set(gmOptionValue(node, valueKey), entry);
        order.push(entry);
        const children = nodeProp(node, childrenKey);
        entry.children = Array.isArray(children)
          ? build(children, entry, level + 1)
          : [];
        return entry;
      });

    const roots = build(this.nodes(), null, 1);
    return { roots, byKey, byValue, order };
  });

  /**
   * The value as a plain array, whatever the mode. A reset control hands over
   * `null`; `single` holds one value rather than a list.
   */
  protected readonly selectedValues = computed<readonly unknown[]>(() => {
    const current = this.value();
    if (current === null || current === undefined) {
      return [];
    }
    if (this.selectionMode() === 'single') {
      return [current];
    }
    return Array.isArray(current) ? current : [current];
  });

  /** Keys the value names directly. */
  private readonly valueKeys = computed(() => {
    const keys = new Set<unknown>();
    for (const item of this.selectedValues()) {
      const entry = this.entryForValue(item);
      if (entry) {
        keys.add(entry.key);
      }
    }
    return keys;
  });

  /**
   * Checkbox state of every node, derived from the value (`checkbox` mode).
   *
   * With both propagation directions on, a checked parent also shows its
   * descendants as checked — so a value naming only a parent (or a parent
   * whose children load later) renders the way the user would expect, and the
   * next toggle writes the full PrimeNG-style value. With either direction
   * off, that inference would make an unchecked child impossible to display,
   * so only the value itself counts.
   */
  protected readonly states = computed(() => {
    const states = new Map<unknown, GmTreeCheckState>();
    if (!this.isCheckbox()) {
      return states;
    }
    const keys = this.valueKeys();
    const down = this.propagateSelectionDown();
    const up = this.propagateSelectionUp();

    const walk = (entry: TreeEntry, inherited: boolean): GmTreeCheckState => {
      const selectable = this.isSelectable(entry);
      const self = keys.has(entry.key) || (inherited && selectable);
      const childStates = entry.children.map((child) =>
        walk(child, down && up && self),
      );

      let state: GmTreeCheckState = 'unchecked';
      if (self) {
        state = 'checked';
      } else if (up && childStates.length) {
        const eligible = childStates.filter((_, i) =>
          this.isSelectable(entry.children[i]),
        );
        if (
          selectable &&
          eligible.length &&
          eligible.every((child) => child === 'checked')
        ) {
          state = 'checked';
        } else if (childStates.some((child) => child !== 'unchecked')) {
          state = 'partial';
        }
      }
      states.set(entry.key, state);
      return state;
    };

    for (const root of this.index().roots) {
      walk(root, false);
    }
    return states;
  });

  // ── Search ──────────────────────────────────────────────────────────────

  /** The active term, normalised for matching. Empty when not filtering. */
  protected readonly term = computed(() =>
    this.filter()
      ? this.filterText().trim().toLocaleLowerCase(this.filterLocale())
      : '',
  );

  private readonly filterFields = computed(() =>
    (this.filterBy() ?? this.optionLabel())
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean),
  );

  /** The tree as the current term shows it. */
  private readonly view = computed<readonly TreeView[]>(() => {
    const term = this.term();
    const whole = (entry: TreeEntry): TreeView => ({
      entry,
      children: entry.children.map(whole),
    });
    if (!term) {
      return this.index().roots.map(whole);
    }

    const strict = this.filterMode() === 'strict';
    const prune = (entry: TreeEntry): TreeView | null => {
      const hit = this.matches(entry.node, term);
      // Lenient: a matching node brings its whole subtree along.
      if (hit && !strict) {
        return whole(entry);
      }
      const children = entry.children
        .map(prune)
        .filter((child): child is TreeView => child !== null);
      return hit || children.length ? { entry, children } : null;
    };
    return this.index()
      .roots.map(prune)
      .filter((root): root is TreeView => root !== null);
  });

  protected readonly rows = computed<readonly TreeRow[]>(() => {
    const filtering = !!this.term();
    const collapsible = this.collapsible();
    const rows: TreeRow[] = [];

    const visit = (list: readonly TreeView[], guides: readonly boolean[]): void => {
      list.forEach((view, i) => {
        // A lazy node shows its toggler until it has loaded — but not inside
        // a search, where its children cannot have matched, nor in a tree
        // that has no togglers at all.
        const hasChildren =
          view.children.length > 0 ||
          (!filtering &&
            collapsible &&
            nodeProp(view.entry.node, 'leaf') === false);
        const expanded =
          hasChildren &&
          (!collapsible || this.isExpanded(view.entry, filtering));
        const hasNextSibling = i < list.length - 1;
        rows.push({
          entry: view.entry,
          expanded,
          hasChildren,
          posInSet: i + 1,
          setSize: list.length,
          hasNextSibling,
          guides,
          siblings: list,
        });
        if (expanded) {
          // A root has no column of its own to continue, so its children
          // start the guide list empty.
          visit(
            view.children,
            view.entry.level === 1 ? [] : [...guides, hasNextSibling],
          );
        }
      });
    };

    visit(this.view(), []);
    return rows;
  });

  protected readonly activeIndex = computed(() => {
    const key = this.activeKey();
    return key === NO_ROW
      ? -1
      : this.rows().findIndex((row) => row.entry.key === key);
  });

  protected readonly activeDescendant = computed(() => {
    const index = this.activeIndex();
    return this.focused() && index >= 0 ? this.rowId(index) : null;
  });

  /** Height of the virtualised viewport, which cannot size to its content. */
  protected readonly viewportHeight = computed(
    () => this.scrollHeight() ?? '16rem',
  );

  protected readonly trackRow = (_: number, row: TreeRow): unknown => row.entry;

  constructor() {
    super();
    this.destroyRef.onDestroy(() => clearTimeout(this.typeAheadTimer));
  }

  protected override generateId(): string {
    return gmUniqueId('gm-tree');
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Expands every node that has children. Does not trigger lazy loads. */
  expandAll(): void {
    const next = new Map(this.expansion());
    for (const entry of this.index().order) {
      if (entry.children.length) {
        next.set(entry.key, true);
      }
    }
    this.expansion.set(next);
    this.filterCollapsed.set(new Set());
  }

  collapseAll(): void {
    const next = new Map<unknown, boolean>();
    for (const entry of this.index().order) {
      next.set(entry.key, false);
    }
    this.expansion.set(next);
    if (this.term()) {
      this.filterCollapsed.set(new Set(next.keys()));
    }
  }

  /** Clears the search term without emitting `filterChange`. */
  resetFilter(): void {
    this.filterText.set('');
    this.filterCollapsed.set(new Set());
  }

  // ── Reading nodes ───────────────────────────────────────────────────────

  private keyOf(node: unknown): unknown {
    return gmReadOption(node, this.nodeKey()) ?? node;
  }

  private entryForValue(item: unknown): TreeEntry | undefined {
    const index = this.index();
    return this.optionValue()
      ? index.byValue.get(item)
      : index.byKey.get(this.keyOf(item));
  }

  private valueForEntry(entry: TreeEntry): unknown {
    return gmOptionValue(entry.node, this.optionValue());
  }

  protected labelOf(entry: TreeEntry): string {
    return gmOptionLabel(entry.node, this.optionLabel());
  }

  protected isSelectable(entry: TreeEntry): boolean {
    return nodeProp(entry.node, 'selectable') !== false;
  }

  protected isLoading(entry: TreeEntry): boolean {
    return nodeProp(entry.node, 'loading') === true;
  }

  protected iconOf(row: TreeRow): string | null {
    const node = row.entry.node;
    const icon =
      (row.expanded
        ? nodeProp(node, 'expandedIcon')
        : nodeProp(node, 'collapsedIcon')) ?? nodeProp(node, 'icon');
    return typeof icon === 'string' && icon ? icon : null;
  }

  protected styleClassOf(entry: TreeEntry): string {
    const styleClass = nodeProp(entry.node, 'styleClass');
    return typeof styleClass === 'string' ? styleClass : '';
  }

  protected stateOf(entry: TreeEntry): GmTreeCheckState {
    return this.states().get(entry.key) ?? 'unchecked';
  }

  /** Selected (`single` / `multiple`) or fully checked (`checkbox`). */
  protected isSelected(entry: TreeEntry): boolean {
    switch (this.selectionMode()) {
      case 'checkbox':
        return this.stateOf(entry) === 'checked';
      case 'single':
      case 'multiple':
        return this.valueKeys().has(entry.key);
      default:
        return false;
    }
  }

  /** `aria-checked`, which only a checkbox tree carries. */
  protected ariaChecked(entry: TreeEntry): string | null {
    if (!this.isCheckbox()) {
      return null;
    }
    const state = this.stateOf(entry);
    return state === 'partial' ? 'mixed' : String(state === 'checked');
  }

  /** `aria-selected`, for the highlight-selection modes. */
  protected ariaSelected(entry: TreeEntry): string | null {
    const mode = this.selectionMode();
    return mode === 'single' || mode === 'multiple'
      ? String(this.isSelected(entry))
      : null;
  }

  protected rowId(index: number): string {
    return `${this.controlId()}-node-${index}`;
  }

  /** The `gmTreeNode` template for this node's `type`, else the untyped one. */
  protected templateFor(entry: TreeEntry): TemplateRef<GmTreeNodeContext> | null {
    const templates = this.nodeTemplates();
    if (!templates.length) {
      return null;
    }
    const type = nodeProp(entry.node, 'type');
    const typed =
      typeof type === 'string' && type
        ? templates.find((template) => template.type() === type)
        : undefined;
    const fallback = templates.find((template) => !template.type());
    return (typed ?? fallback)?.template ?? null;
  }

  protected nodeContext(row: TreeRow): GmTreeNodeContext {
    const state = this.stateOf(row.entry);
    return {
      $implicit: row.entry.node,
      level: row.entry.level,
      expanded: row.expanded,
      selected: this.isSelected(row.entry),
      checked: state === 'checked',
      partial: state === 'partial',
    };
  }

  protected iconContext(row: TreeRow): GmTreeIconContext {
    return {
      $implicit: row.entry.node,
      expanded: row.expanded,
      selected: this.isSelected(row.entry),
    };
  }

  /** The label split around each occurrence of the search term. */
  protected labelParts(entry: TreeEntry): readonly LabelPart[] {
    const label = this.labelOf(entry);
    const term = this.term();
    const lower = label.toLocaleLowerCase(this.filterLocale());
    // Some locales change a string's length when lower-casing it, which would
    // put the highlight in the wrong place — no highlight beats a wrong one.
    if (!term || lower.length !== label.length) {
      return [{ text: label, match: false }];
    }

    const parts: LabelPart[] = [];
    let from = 0;
    let at = lower.indexOf(term);
    while (at >= 0) {
      if (at > from) {
        parts.push({ text: label.slice(from, at), match: false });
      }
      parts.push({ text: label.slice(at, at + term.length), match: true });
      from = at + term.length;
      at = lower.indexOf(term, from);
    }
    if (from < label.length) {
      parts.push({ text: label.slice(from), match: false });
    }
    return parts;
  }

  private matches(node: unknown, term: string): boolean {
    const locale = this.filterLocale();
    return this.filterFields().some((field) =>
      String(gmReadOption(node, field) ?? '')
        .toLocaleLowerCase(locale)
        .includes(term),
    );
  }

  // ── Selecting ───────────────────────────────────────────────────────────

  /** Applies a click, Space or Enter on a row, per `selectionMode`. */
  protected select(entry: TreeEntry, event: Event): void {
    if (this.selectLocked() || !this.isSelectable(entry)) {
      return;
    }
    switch (this.selectionMode()) {
      case 'single':
        this.selectSingle(entry, event);
        return;
      case 'multiple':
        this.selectMultiple(entry, event);
        return;
      case 'checkbox':
        this.toggleCheck(entry, event);
        return;
      default:
        return;
    }
  }

  /**
   * Selecting the selected node again keeps it — the tree drives something
   * (an editor, a detail pane) that should not go blank on a second click.
   */
  private selectSingle(entry: TreeEntry, event: Event): void {
    if (this.valueKeys().has(entry.key)) {
      return;
    }
    this.commit(this.valueForEntry(entry));
    this.handleBlur();
    this.nodeSelect.emit({ node: entry.node, originalEvent: event });
  }

  private selectMultiple(entry: TreeEntry, event: Event): void {
    const current = this.selectedValues();
    const wasSelected = this.valueKeys().has(entry.key);
    const modifier =
      (event instanceof MouseEvent || event instanceof KeyboardEvent) &&
      (event.ctrlKey || event.metaKey);
    const additive =
      !this.metaKeySelection() || event instanceof KeyboardEvent || modifier;

    let next: unknown[];
    if (!additive) {
      next = [this.valueForEntry(entry)];
    } else if (wasSelected) {
      next = current.filter((item) => this.entryForValue(item) !== entry);
    } else {
      next = [...current, this.valueForEntry(entry)];
    }

    this.commit(next);
    this.handleBlur();
    const payload = { node: entry.node, originalEvent: event };
    if (additive && wasSelected) {
      this.nodeUnselect.emit(payload);
    } else {
      this.nodeSelect.emit(payload);
    }
  }

  /**
   * Toggles a node's checkbox. A partly checked node becomes fully checked,
   * as in PrimeNG. The new value starts from the *displayed* state, so a
   * value that named only a parent is written out in full.
   */
  private toggleCheck(entry: TreeEntry, event: Event): void {
    const states = this.states();
    const checked = new Set<unknown>();
    for (const [key, state] of states) {
      if (state === 'checked') {
        checked.add(key);
      }
    }
    const check = states.get(entry.key) !== 'checked';

    const apply = (target: TreeEntry): void => {
      if (check) {
        checked.add(target.key);
      } else {
        checked.delete(target.key);
      }
      if (this.propagateSelectionDown()) {
        for (const child of target.children) {
          if (this.isSelectable(child)) {
            apply(child);
          }
        }
      }
    };
    apply(entry);

    if (this.propagateSelectionUp()) {
      for (
        let parent = entry.parent;
        parent && this.isSelectable(parent);
        parent = parent.parent
      ) {
        const eligible = parent.children.filter((child) =>
          this.isSelectable(child),
        );
        if (eligible.length && eligible.every((child) => checked.has(child.key))) {
          checked.add(parent.key);
        } else {
          checked.delete(parent.key);
        }
      }
    }

    const next = this.index()
      .order.filter((candidate) => checked.has(candidate.key))
      .map((candidate) => this.valueForEntry(candidate));
    // Selections this tree cannot place are someone else's to change.
    for (const item of this.selectedValues()) {
      if (!this.entryForValue(item)) {
        next.push(item);
      }
    }

    this.commit(next);
    // Like a checkbox, toggling is the whole interaction.
    this.handleBlur();

    const payload = { node: entry.node, originalEvent: event };
    if (check) {
      this.nodeSelect.emit(payload);
    } else {
      this.nodeUnselect.emit(payload);
    }
  }

  // ── Expansion ───────────────────────────────────────────────────────────

  private isExpanded(entry: TreeEntry, filtering: boolean): boolean {
    if (filtering) {
      return !this.filterCollapsed().has(entry.key);
    }
    return (
      this.expansion().get(entry.key) ?? nodeProp(entry.node, 'expanded') === true
    );
  }

  private setExpanded(entry: TreeEntry, expanded: boolean, event: Event): void {
    if (this.term()) {
      const next = new Set(this.filterCollapsed());
      if (expanded) {
        next.delete(entry.key);
      } else {
        next.add(entry.key);
      }
      this.filterCollapsed.set(next);
    } else {
      this.expansion.set(new Map(this.expansion()).set(entry.key, expanded));
    }

    const payload = { node: entry.node, originalEvent: event };
    if (expanded) {
      this.nodeExpand.emit(payload);
    } else {
      this.nodeCollapse.emit(payload);
    }
  }

  protected onTogglerClick(row: TreeRow, event: MouseEvent): void {
    // The row's own click selects the node; the toggler only expands.
    event.stopPropagation();
    if (this.isDisabled() || !row.hasChildren) {
      return;
    }
    this.activeKey.set(row.entry.key);
    this.setExpanded(row.entry, !row.expanded, event);
  }

  protected onRowClick(row: TreeRow, event: MouseEvent): void {
    if (this.isDisabled()) {
      return;
    }
    this.activeKey.set(row.entry.key);
    this.select(row.entry, event);
  }

  // ── Search input ────────────────────────────────────────────────────────

  protected onFilterInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.filterText.set(text);
    this.filterCollapsed.set(new Set());
    this.filterChange.emit({
      filter: text,
      filteredValue: this.view().map((view) => this.copyOf(view)),
    });
    // A new term reshapes the rows, so the old scroll offset is meaningless.
    const scroller = this.scrollerElement();
    if (scroller) {
      scroller.scrollTop = 0;
    }
  }

  /** ArrowDown leaves the search box for the rows, as in a combobox. */
  protected onFilterKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && this.rows().length) {
      event.preventDefault();
      this.scrollerElement()?.focus();
    }
  }

  /** A kept node, copied with only its kept children. */
  private copyOf(view: TreeView): unknown {
    const node = view.entry.node;
    if (node === null || typeof node !== 'object') {
      return node;
    }
    return {
      ...node,
      [this.optionChildren()]: view.children.map((child) => this.copyOf(child)),
    };
  }

  // ── Focus ───────────────────────────────────────────────────────────────

  protected onTreeFocus(): void {
    this.focused.set(true);
    if (this.activeIndex() >= 0) {
      return;
    }
    // Arrive on the first selected (or partly checked) row, so the value is
    // where focus starts.
    const rows = this.rows();
    const firstChosen = rows.find(
      (row) =>
        this.isSelected(row.entry) || this.stateOf(row.entry) === 'partial',
    );
    const start = firstChosen ?? rows[0];
    if (start) {
      this.activeKey.set(start.entry.key);
    }
  }

  protected onTreeBlur(): void {
    this.focused.set(false);
    this.handleBlur();
  }

  // ── Keyboard ────────────────────────────────────────────────────────────

  /** Handles the key, then brings the active row into view. */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }
    this.handleKeydown(event);
    this.revealActiveRow();
  }

  private handleKeydown(event: KeyboardEvent): void {
    const rows = this.rows();
    if (!rows.length) {
      return;
    }
    const index = this.activeIndex();
    const row: TreeRow | undefined = rows[index];

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveTo(index < 0 ? 0 : Math.min(index + 1, rows.length - 1));
        return;

      case 'ArrowUp':
        event.preventDefault();
        this.moveTo(index < 0 ? 0 : Math.max(index - 1, 0));
        return;

      case 'Home':
        event.preventDefault();
        this.moveTo(0);
        return;

      case 'End':
        event.preventDefault();
        this.moveTo(rows.length - 1);
        return;

      case 'ArrowRight':
        // Logical direction: in RTL the key that opens a node is ArrowLeft.
        event.preventDefault();
        if (row) {
          this.isRtl() ? this.goOut(row, event) : this.goIn(row, index, event);
        }
        return;

      case 'ArrowLeft':
        event.preventDefault();
        if (row) {
          this.isRtl() ? this.goIn(row, index, event) : this.goOut(row, event);
        }
        return;

      case ' ':
      case 'Enter':
        event.preventDefault();
        if (row) {
          this.select(row.entry, event);
        }
        return;

      case '*':
        event.preventDefault();
        if (row && this.collapsible()) {
          for (const sibling of row.siblings) {
            const siblingRow = rows.find((r) => r.entry === sibling.entry);
            if (siblingRow?.hasChildren && !siblingRow.expanded) {
              this.setExpanded(sibling.entry, true, event);
            }
          }
        }
        return;

      default:
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          this.typeAheadTo(event.key, index);
        }
        return;
    }
  }

  /** Opens a closed node, or steps into an open one's first child. */
  private goIn(row: TreeRow, index: number, event: Event): void {
    if (!row.hasChildren) {
      return;
    }
    if (!row.expanded) {
      this.setExpanded(row.entry, true, event);
      return;
    }
    const next = this.rows()[index + 1];
    if (next && next.entry.parent === row.entry) {
      this.moveTo(index + 1);
    }
  }

  /** Closes an open node, or steps out to the parent. */
  private goOut(row: TreeRow, event: Event): void {
    if (row.expanded && this.collapsible()) {
      this.setExpanded(row.entry, false, event);
      return;
    }
    if (row.entry.parent) {
      this.activeKey.set(row.entry.parent.key);
    }
  }

  private moveTo(index: number): void {
    const row = this.rows()[index];
    if (row) {
      this.activeKey.set(row.entry.key);
    }
  }

  /**
   * Moves to the next row whose label starts with what has been typed in the
   * last half second, wrapping round. Repeating one letter cycles through the
   * rows starting with it.
   */
  private typeAheadTo(char: string, index: number): void {
    clearTimeout(this.typeAheadTimer);
    const lowered = char.toLocaleLowerCase(this.filterLocale());
    this.typeAhead =
      this.typeAhead === lowered ? lowered : this.typeAhead + lowered;
    this.typeAheadTimer = setTimeout(() => (this.typeAhead = ''), TYPE_AHEAD_MS);

    const rows = this.rows();
    // A longer search can still match the current row; a fresh letter looks past it.
    const offset = this.typeAhead.length > 1 ? 0 : 1;
    for (let step = 0; step < rows.length; step++) {
      const candidate = (index + offset + step + rows.length) % rows.length;
      const label = this.labelOf(rows[candidate].entry).toLocaleLowerCase(
        this.filterLocale(),
      );
      if (label.startsWith(this.typeAhead)) {
        this.moveTo(candidate);
        return;
      }
    }
  }

  private isRtl(): boolean {
    return getComputedStyle(this.hostRef.nativeElement).direction === 'rtl';
  }

  /**
   * Scrolls the smallest amount that puts the active row fully in view. The
   * virtualised list is computed from offsets, since a row scrolled out of it
   * is not rendered at all and `aria-activedescendant` must point at one that is.
   */
  private revealActiveRow(): void {
    const scroller = this.scrollerElement();
    const index = this.activeIndex();
    if (!scroller || index < 0) {
      return;
    }

    if (this.virtualScroll()) {
      const itemSize = this.virtualItemSize();
      const top = index * itemSize;
      if (top < scroller.scrollTop) {
        scroller.scrollTop = top;
      } else if (top + itemSize > scroller.scrollTop + scroller.clientHeight) {
        scroller.scrollTop = top + itemSize - scroller.clientHeight;
      }
      return;
    }

    scroller
      .querySelector<HTMLElement>(`#${CSS.escape(this.rowId(index))}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }

  private scrollerElement(): HTMLElement | null {
    return this.hostRef.nativeElement.querySelector<HTMLElement>('.gm-tree__tree');
  }
}

/**
 * Reads a fixed property off an object node. Unlike `gmReadOption`, a
 * primitive node yields `undefined` rather than itself — the string `'x'` is
 * a label, not a `leaf` flag.
 */
function nodeProp(node: unknown, name: string): unknown {
  return node !== null && typeof node === 'object'
    ? (node as Record<string, unknown>)[name]
    : undefined;
}
