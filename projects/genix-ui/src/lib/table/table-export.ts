import type { GmTableColumn } from './table.types';

/** Options for `GmTableComponent.exportCsv`. */
export interface GmTableExportOptions {
  /** Base name; `.csv` is appended. Defaults to `export`. */
  fileName?: string;
  /** Export only the selected rows instead of everything rendered. */
  selectionOnly?: boolean;
}

/**
 * Renders one value the way a spreadsheet expects.
 *
 * Dates become a local `yyyy-MM-dd`, never `toISOString()`, which would shift
 * the day backwards for anyone east of UTC.
 */
export function gmCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Quotes a field only when it needs it: a separator, a quote or a line break.
 * Internal quotes are doubled, per RFC 4180.
 */
export function gmCsvEscape(value: string, separator: string): string {
  const needsQuotes =
    value.includes(separator) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Builds the whole document: a header line, then one line per row. */
export function gmBuildCsv<T>(
  rows: readonly T[],
  columns: readonly GmTableColumn<T>[],
  separator = ',',
): string {
  const lines = [
    columns
      .map((column) => gmCsvEscape(column.header ?? '', separator))
      .join(separator),
  ];

  for (const row of rows) {
    lines.push(
      columns
        .map((column) => {
          const raw = (row as Record<string, unknown>)[column.field as string];
          return gmCsvEscape(gmCsvValue(raw), separator);
        })
        .join(separator),
    );
  }

  return lines.join('\r\n');
}
