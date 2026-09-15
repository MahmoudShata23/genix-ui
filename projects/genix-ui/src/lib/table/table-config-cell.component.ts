import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

import { GmTooltipDirective } from '../tooltip/tooltip.directive';
import {
  GmCellType,
  GmFilterType,
  GmStatusTone,
} from './table-config.types';
import type { GmTableConfigColumn } from './table-config.types';

/** What a `GmCellType.SLA_STATUS` value resolves to. */
type SlaState = 'breached' | 'warning' | 'ok';

/**
 * Renders one cell of a config-driven column: the `cellType` renderers
 * (avatar, status dot, SLA dot, bulleted list), links, and the plain value
 * formatted from the column's `filterType`.
 *
 * It reads the row and nothing else — no row state, no events beyond the
 * column's own `linkPath` — so the same column config renders identically
 * wherever the grid is mounted.
 */
@Component({
  selector: 'gm-table-config-cell',
  standalone: true,
  imports: [DatePipe, GmTooltipDirective],
  templateUrl: './table-config-cell.component.html',
  styleUrl: './table-config-cell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-table-config-cell' },
})
export class GmTableConfigCellComponent<T> {
  readonly column = input.required<GmTableConfigColumn<T>>();

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
