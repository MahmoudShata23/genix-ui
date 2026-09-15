import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  booleanAttribute,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GmButtonComponent } from '../button/button.component';
import { gmOverlayPanel } from '../core/overlay-panel';
import { gmUniqueId } from '../core/unique-id';
import { GmSelectComponent } from '../select/select.component';
import { GmTableFilterCellComponent } from './table-filter-cell.component';
import {
  GM_DEFAULT_FILTER_OPERATOR,
  GM_FILTER_MATCH_MODES,
  GM_TABLE_FILTER_LABELS,
} from './table-filter.types';
import type {
  GmFilterMatchLogic,
  GmFilterOperator,
  GmTableFilterConstraint,
  GmTableFilterLabels,
  GmTableFilterMenuEvent,
  GmTableFilterType,
} from './table-filter.types';
import type { GmTableColumn } from './table.types';

/**
 * A column's filter menu: the funnel button in the header, and the panel it
 * opens — match logic, one row per rule, Add Rule, and a Clear/Apply footer.
 *
 * Rules are edited against a *draft* and only reach the table on Apply, so a
 * half-typed rule never triggers a request. The draft is re-seeded from the
 * live filters every time the panel opens, which is what lets both Clear and
 * an outside-click dismissal leave the applied state alone.
 *
 * It holds no filter state of its own: `constraints` and `logic` come in,
 * `apply` and `clear` go out. `gm-table` owns the filters.
 */
@Component({
  selector: 'gm-table-filter-menu',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    GmButtonComponent,
    GmSelectComponent,
    GmTableFilterCellComponent,
  ],
  templateUrl: './table-filter-menu.component.html',
  styleUrl: './table-filter-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-table-filter-menu-host' },
})
export class GmTableFilterMenuComponent<T> {
  readonly column = input.required<GmTableColumn<T>>();

  /** The rules currently applied to this column, in menu order. */
  readonly constraints = input<readonly GmTableFilterConstraint[]>([]);

  readonly logic = input<GmFilterMatchLogic>('and');

  readonly labels = input<GmTableFilterLabels>(GM_TABLE_FILTER_LABELS);

  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Replaces the rule editor with the consumer's own control, for a filter the
   * built-in types cannot express. Supplied by `gm-table` from a
   * `gmTableFilter` template; the panel chrome around it stays.
   */
  readonly contentTemplate = input<TemplateRef<unknown> | null>(null);

  readonly apply = output<GmTableFilterMenuEvent>();

  /** The field whose filters should be dropped. */
  readonly clear = output<string>();

  readonly panelId = gmUniqueId('gm-table-filter-menu');

  private readonly overlayPanel = gmOverlayPanel();
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  private trigger: HTMLElement | null = null;

  private readonly opened = signal(false);
  protected readonly isOpen = computed(() => this.opened());

  /** Rules being edited. Replaced wholesale, never mutated in place. */
  protected readonly draft = signal<readonly GmTableFilterConstraint[]>([]);
  protected readonly draftLogic = signal<GmFilterMatchLogic>('and');

  protected readonly field = computed(() => this.column().field ?? '');

  protected readonly type = computed<GmTableFilterType>(
    () => this.column().filterType ?? 'text',
  );

  /** A filtered column's funnel is tinted, so the state reads without opening it. */
  protected readonly active = computed(() => this.constraints().length > 0);

  private readonly matchModes = computed(
    () => this.column().filterMatchModes ?? GM_FILTER_MATCH_MODES[this.type()],
  );

  /** Discrete pickers map to one comparison, so they offer no dropdown. */
  protected readonly showMatchModes = computed(
    () => this.matchModes().length > 0,
  );

  protected readonly maxRules = computed(() =>
    Math.max(1, this.column().filterMaxConstraints ?? 2),
  );

  /**
   * Shown whenever more than one rule is *possible*, not only once a second
   * one exists — otherwise the control would appear under the user's cursor
   * the moment they press Add Rule and shift the whole panel down.
   */
  protected readonly showLogic = computed(
    () => this.showMatchModes() && this.maxRules() > 1,
  );

  protected readonly canAddRule = computed(
    () => this.showMatchModes() && this.draft().length < this.maxRules(),
  );

  protected readonly canRemoveRule = computed(() => this.draft().length > 1);

  protected readonly modeOptions = computed(() =>
    this.matchModes().map((mode) => ({
      label: mode.label ?? this.labels()[mode.labelKey ?? mode.operator],
      value: mode.operator,
    })),
  );

  protected readonly logicOptions = computed(() => [
    { label: this.labels().matchAll, value: 'and' as GmFilterMatchLogic },
    { label: this.labels().matchAny, value: 'or' as GmFilterMatchLogic },
  ]);

  /** Context for a `gmTableFilter` template: the value, plus the two verbs. */
  protected readonly templateContext = computed(() => {
    const value = this.draft()[0]?.value ?? null;
    return {
      $implicit: value,
      value,
      column: this.column(),
      apply: (next: unknown, operator?: GmFilterOperator) =>
        this.applyValue(next, operator),
      clear: () => this.onClear(),
    };
  });

  // ── Panel ───────────────────────────────────────────────────────────────

  protected toggle(event: MouseEvent): void {
    this.opened() ? this.hide() : this.show(event.currentTarget as HTMLElement);
  }

  private show(trigger: HTMLElement): void {
    if (this.disabled()) {
      return;
    }
    this.seedDraft();
    this.trigger = trigger;
    this.overlayPanel.open(
      this.panel(),
      (event) => {
        if (!this.isInNestedOverlay(event)) {
          this.hide();
        }
      },
      { origin: trigger },
    );
    this.opened.set(true);
    this.focusPanel();
  }

  protected hide(): void {
    if (!this.opened()) {
      return;
    }
    this.overlayPanel.close();
    this.opened.set(false);
    // Focus returns to the funnel, so a keyboard user stays in the header.
    this.trigger?.focus();
    this.trigger = null;
  }

  /**
   * The panel hosts `gm-select`s, which render their *own* overlays as siblings
   * of this one. The CDK reports a click on a select's option as outside this
   * panel, so without this guard picking a match mode would close the menu.
   *
   * Anything still inside the overlay container after the CDK has excluded this
   * panel is by definition another overlay — i.e. one of those nested controls.
   */
  private isInNestedOverlay(event: MouseEvent): boolean {
    const target = event.target;
    return (
      target instanceof Element && !!target.closest('.cdk-overlay-container')
    );
  }

  private focusPanel(): void {
    requestAnimationFrame(() => {
      this.overlayPanel.panelElement
        ?.querySelector<HTMLElement>('.gm-filter-menu')
        ?.focus();
    });
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  }

  // ── Draft editing ───────────────────────────────────────────────────────

  /** An unfiltered column opens on one blank rule, so there is always a row. */
  private seedDraft(): void {
    const applied = this.constraints();
    this.draft.set(
      applied.length > 0
        ? applied.map((rule) => ({ ...rule }))
        : [this.blankRule()],
    );
    this.draftLogic.set(this.logic());
  }

  private blankRule(): GmTableFilterConstraint {
    return { operator: this.defaultOperator(), value: null };
  }

  /** Explicit config wins, else the first match mode, else the type's default. */
  private defaultOperator(): GmFilterOperator {
    return (
      this.column().filterOperator ??
      this.matchModes()[0]?.operator ??
      GM_DEFAULT_FILTER_OPERATOR[this.type()]
    );
  }

  protected setLogic(value: unknown): void {
    this.draftLogic.set(value === 'or' ? 'or' : 'and');
  }

  protected setOperator(index: number, value: unknown): void {
    this.patchRule(index, { operator: value as GmFilterOperator });
  }

  protected setValue(index: number, value: unknown): void {
    this.patchRule(index, { value });
  }

  private patchRule(
    index: number,
    patch: Partial<GmTableFilterConstraint>,
  ): void {
    this.draft.update((rules) =>
      rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  }

  protected addRule(): void {
    if (!this.canAddRule()) {
      return;
    }
    this.draft.update((rules) => [...rules, this.blankRule()]);
  }

  protected removeRule(index: number): void {
    if (!this.canRemoveRule()) {
      return;
    }
    this.draft.update((rules) => rules.filter((_, i) => i !== index));
  }

  // ── Commit ──────────────────────────────────────────────────────────────

  protected onApply(): void {
    this.apply.emit({
      field: this.field(),
      logic: this.draftLogic(),
      constraints: this.draft()
        .filter((rule) => !isEmptyValue(rule.value))
        .map((rule) => ({ ...rule })),
    });
    this.hide();
  }

  /**
   * Drops the column's filters outright rather than only emptying the inputs —
   * a Clear the user then has to follow with Apply would be a trap.
   */
  protected onClear(): void {
    this.draft.set([this.blankRule()]);
    this.draftLogic.set('and');
    this.clear.emit(this.field());
    this.hide();
  }

  /** Used by a `gmTableFilter` template to apply its own single value. */
  private applyValue(value: unknown, operator?: GmFilterOperator): void {
    this.apply.emit({
      field: this.field(),
      logic: 'and',
      constraints: isEmptyValue(value)
        ? []
        : [{ operator: operator ?? this.defaultOperator(), value }],
    });
    this.hide();
  }
}

/** A rule with no value is not a filter — it is a row the user left blank. */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  return Array.isArray(value) && value.length === 0;
}
