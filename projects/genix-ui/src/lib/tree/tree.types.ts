/**
 * A node shaped like PrimeNG's `TreeNode`, so an existing `TreeNode[]` binds to
 * `gm-tree` with no key configuration at all.
 *
 * Nothing requires this interface: `nodes` is typed `unknown[]` and read
 * through `optionLabel` / `optionChildren` / `nodeKey`, so any interface array
 * assigns. The flag properties (`leaf`, `expanded`, `selectable`, `loading`,
 * the icons, `type`, `styleClass`) are always read by these names.
 */
export interface GmTreeNode<T = any> {
  /** Stable identity. Keeps selection and expansion across a new `nodes` array. */
  key?: string;
  label?: string;
  data?: T;
  /** Icon class shown before the label, e.g. `'pi pi-folder'`. */
  icon?: string;
  /** Icon class used instead of `icon` while expanded. */
  expandedIcon?: string;
  /** Icon class used instead of `icon` while collapsed. */
  collapsedIcon?: string;
  children?: GmTreeNode<T>[];
  /**
   * `false` marks a node with children that have not been loaded yet: it
   * renders a toggler, and expanding it emits `nodeExpand` for the app to fill in.
   */
  leaf?: boolean;
  /** Initial expansion. The tree tracks later expansion itself. */
  expanded?: boolean;
  /** `false`: the node cannot be selected or checked, and the checkbox cascade passes over it. */
  selectable?: boolean;
  /** Shows a spinner in place of the toggler, e.g. while children load. */
  loading?: boolean;
  /** Picks a `gmTreeNode` template declared for this type. */
  type?: string;
  /** Extra class(es) on the node's row. */
  styleClass?: string;
}

/**
 * What clicking a row does, and what the control value holds.
 *
 * - `none`: browsing only; no value.
 * - `single`: one node, highlighted. The value is that node (or its `optionValue`).
 * - `multiple`: several highlighted nodes, no cascade. The value is an array.
 * - `checkbox`: a checkbox per row, cascading to children and parents. The
 *   value is an array of every fully checked node.
 */
export type GmTreeSelectionMode = 'none' | 'single' | 'multiple' | 'checkbox';

/** Derived checkbox state of one node, in `checkbox` mode. */
export type GmTreeCheckState = 'checked' | 'partial' | 'unchecked';

/**
 * `lenient`: a matching node keeps its whole subtree. `strict`: only matching
 * nodes and the paths leading to them are kept. PrimeNG's two modes.
 */
export type GmTreeFilterMode = 'lenient' | 'strict';

/**
 * How the tree-level `loading` flag renders: `mask` covers the rows with a
 * translucent layer and a spinner; `icon` replaces the rows with a spinner.
 */
export type GmTreeLoadingMode = 'mask' | 'icon';

/** Payload of the node-level outputs. */
export interface GmTreeNodeEvent {
  /** The node as it appears in `nodes`. `any` so handlers can read its fields. */
  node: any;
  originalEvent: Event;
}

/** Payload of `filterChange` — the shape of PrimeNG's `onFilter`. */
export interface GmTreeFilterEvent {
  /** The term as typed. */
  filter: string;
  /**
   * The filtered tree: copies of the kept nodes whose children hold only the
   * kept children. `nodes` itself is never modified.
   */
  filteredValue: unknown[];
}

/**
 * What a `gmTreeNode` template receives.
 *
 * `$implicit` is `any` rather than `unknown` on purpose: nothing at the
 * template's declaration site tells the compiler what `[nodes]` holds, so
 * `unknown` would make `{{ node.label }}` an error in every real usage.
 */
export interface GmTreeNodeContext {
  $implicit: any;
  /** 1 for a root node. */
  level: number;
  expanded: boolean;
  /** Selected in `single` / `multiple` mode, fully checked in `checkbox` mode. */
  selected: boolean;
  /** Fully checked, in `checkbox` mode. */
  checked: boolean;
  /** Partly checked, in `checkbox` mode. */
  partial: boolean;
}

/** What a `gmTreeIcon` template receives. */
export interface GmTreeIconContext {
  $implicit: any;
  expanded: boolean;
  selected: boolean;
}

/** What a `gmTreeToggler` template receives. */
export interface GmTreeTogglerContext {
  /** Whether the node is expanded. */
  $implicit: boolean;
  node: any;
}

/** What a `gmTreeCheckbox` template receives. */
export interface GmTreeCheckboxContext {
  /** Whether the node is fully checked. */
  $implicit: boolean;
  partial: boolean;
  /** The node is not selectable, or the whole tree is disabled / read-only. */
  disabled: boolean;
  node: any;
}

/** What a `gmTreeEmpty` template receives. */
export interface GmTreeEmptyContext {
  /** `true` when a filter term emptied the tree, `false` when `nodes` is empty. */
  $implicit: boolean;
}
