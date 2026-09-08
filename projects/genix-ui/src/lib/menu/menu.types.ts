/**
 * One entry in a `gm-menu`.
 *
 * Deliberately flat: no nested `items`, no routing, no `url`. A submenu is a
 * different interaction pattern with its own keyboard model, and nothing in the
 * package needs one yet.
 */
export interface GmMenuItem {
  /** Visible text. Omitted for a separator. */
  label?: string;

  /** Icon CSS class, e.g. `"pi pi-pencil"` — the package's icon strategy. */
  icon?: string;

  /** Renders the entry unusable and skips it during keyboard navigation. */
  disabled?: boolean;

  /** A horizontal rule instead of an entry. Everything else is ignored. */
  separator?: boolean;

  /** Run when the entry is activated. Receives the item itself. */
  command?: (item: GmMenuItem) => void;
}
