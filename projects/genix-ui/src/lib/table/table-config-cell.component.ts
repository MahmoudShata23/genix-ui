import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

import { GmBadgeComponent } from '../badge/badge.component';
import { GmTooltipDirective } from '../tooltip/tooltip.directive';
import {
  GmCellType,
  GmFilterType,
  GmStatusTone,
} from './table-config.types';
import type { TableColumn } from './table-config.types';
import type { GmSeverity } from '../core/types';

/** What a `GmCellType.SLA_STATUS` value resolves to. */
type SlaState = 'breached' | 'warning' | 'ok';

/**
 * Status tones and badge severities are separate vocabularies — a tone has no
 * `primary` or `contrast`, a severity has no `neutral` — so a badge cell maps
 * between them here rather than the config carrying two colour spellings.
 */
const BADGE_SEVERITY: Readonly<Record<GmStatusTone, GmSeverity>> = {
  [GmStatusTone.SUCCESS]: 'success',
  [GmStatusTone.WARNING]: 'warning',
  [GmStatusTone.DANGER]: 'danger',
  [GmStatusTone.INFO]: 'info',
  [GmStatusTone.NEUTRAL]: 'secondary',
};

/**
 * Renders one cell of a config-driven column: the `cellType` renderers
 * (avatar, status badge, status dot, SLA dot, bulleted list), links, and the
 * plain value formatted from the column's `filterType`.
 *
 * It reads the row and nothing else — no row state, no events beyond the
 * column's own `linkPath` — so the same column config renders identically
 * wherever the grid is mounted.
 */
@Component({
  selector: 'gm-table-config-cell',
  standalone: true,
  imports: [DatePipe, GmBadgeComponent, GmTooltipDirective],
  templateUrl: './table-config-cell.component.html',
  styleUrl: './table-config-cell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-table-config-cell' },
})
export class GmTableConfigCellComponent<T> {
  readonly column = input.required<TableColumn<T>>();

  readonly row = input.required<T>();

  /** Characters of plain text shown before the rest moves into a tooltip. */
  readonly truncateAt = input(25, { transform: numberAttribute });

  protected readonly cellType = GmCellType;
  protected readonly filterType = GmFilterType;

  protected readonly value = computed<unknown>(
    () => (this.row() as Record<string, unknown>)[this.column().field],
  );

  /** Empty values render as a dash, so a row never looks like it lost a column. */
  protected readonly isEmpty = computed(() => {
    const value = this.value();
    return value === null || value === undefined || value === '';
  });

  protected readonly text = computed(() => String(this.value() ?? ''));

  protected readonly truncated = computed(() => {
    const limit = this.truncateAt();
    return limit > 0 && this.text().length > limit;
  });

  protected readonly truncatedText = computed(
    () => this.text().slice(0, this.truncateAt()).trimEnd() + '…',
  );

  protected readonly tooltip = computed(() => {
    const field = this.column().tooltipField;
    return field
      ? String((this.row() as Record<string, unknown>)[field] ?? '')
      : this.text();
  });

  protected readonly initials = computed(() => {
    const name = this.text();
    if (!name) {
      return '?';
    }
    return name
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  });

  /**
   * The dot's tone comes from the column, not from the value, so a grid can
   * colour its own statuses without this component knowing what they mean.
   */
  protected readonly statusTone = computed<GmStatusTone>(
    () => this.column().statusTone?.(this.row()) ?? GmStatusTone.NEUTRAL,
  );

  /**
   * A badge's tone: the value's own entry first, then the row-derived
   * `statusTone`, then neutral — so a column can key off either without the
   * cell needing to know which statuses exist.
   */
  protected readonly badgeSeverity = computed<GmSeverity>(() => {
    const mapped = this.column().badgeToneMap?.[this.text().toLowerCase()];
    return BADGE_SEVERITY[mapped ?? this.statusTone()];
  });

  /**
   * A badge already shows its whole value, so it only carries a tooltip when
   * the column points at a *different* field — otherwise every status cell in
   * the grid would mount an overlay to repeat the word under the cursor.
   */
  protected readonly badgeTooltip = computed(() =>
    this.column().tooltipField ? this.tooltip() : '',
  );

  /** No entry in the column's `dotColorMap` — e.g. blank, or an unknown value. */
  protected readonly dotColor = computed<GmStatusTone | null>(() => {
    if (this.isEmpty()) {
      return null;
    }
    const map = this.column().dotColorMap ?? {};
    return map[this.text().toLowerCase()] ?? null;
  });

  protected readonly slaState = computed<SlaState>(() => {
    const text = this.text();
    if (!text) {
      return 'ok';
    }
    if (text.toLowerCase().includes('breached')) {
      return 'breached';
    }
    const hours = /^(\d+)h/.exec(text);
    return hours && Number(hours[1]) <= 2 ? 'warning' : 'ok';
  });

  protected readonly slaTooltip = computed(() => {
    const text = this.text();
    if (!text) {
      return '';
    }
    if (text.toLowerCase().includes('breached')) {
      return `${text.replace(/\s*\(Breached\)/i, '').trim()} exceeded`;
    }
    return `${text.replace(/\s*remaining/i, '').trim()} remaining`;
  });

  /** A `LIST` cell over a field that is not actually an array renders nothing. */
  protected readonly listValue = computed<readonly string[]>(() => {
    const value = this.value();
    return Array.isArray(value) ? value : [];
  });

  /** `Date` and date-like strings both format; anything else is left alone. */
  protected readonly dateValue = computed<Date | string | number | null>(() => {
    const value = this.value();
    return value instanceof Date ||
      typeof value === 'string' ||
      typeof value === 'number'
      ? value
      : null;
  });

  protected onLink(event: Event): void {
    event.preventDefault();
    this.column().linkPath?.(this.row());
  }
}
