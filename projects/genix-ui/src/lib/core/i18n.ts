import {
  InjectionToken,
  Provider,
  Signal,
  computed,
  inject,
} from '@angular/core';

/**
 * Every piece of text the form components render themselves — placeholders,
 * accessible names, empty states. Labels the *application* supplies (`label`,
 * `hint`, `error`, option text) are not here: those arrive already translated.
 *
 * `{0}` marks where a value goes (the field's label, a count, a file name).
 */
export interface GmLabels {
  /** Placeholder of a text field with a `label`: `Enter {0}`. */
  enter: string;
  /** Placeholder of a text field with no label. */
  enterText: string;
  /** Placeholder of a dropdown / date field with a `label`: `Select {0}`. */
  select: string;
  /** Placeholder of a dropdown / date field with no label. */
  selectText: string;
  /** Placeholder of the search box inside a dropdown panel. */
  search: string;

  noOptions: string;
  noResults: string;

  clearSelection: string;
  clearDate: string;
  clearSearch: string;
  filterOptions: string;

  loading: string;
  loadingOptions: string;
  searching: string;

  /** `{0}` = number selected. */
  itemsSelected: string;
  selectAll: string;
  /** `{0}` = the item's name. */
  remove: string;
  /** `{0}` = number of chips hidden behind the "+N" badge. */
  moreSelected: string;

  today: string;
  clear: string;
  previousMonth: string;
  nextMonth: string;
  month: string;
  year: string;
  time: string;
  hour: string;
  minute: string;
  amPm: string;

  chooseFiles: string;
}

export const GM_DEFAULT_LABELS: GmLabels = {
  enter: 'Enter {0}',
  enterText: 'Enter text',
  select: 'Select {0}',
  selectText: 'Select',
  search: 'Search',

  noOptions: 'No options available',
  noResults: 'No results found',

  clearSelection: 'Clear selection',
  clearDate: 'Clear date',
  clearSearch: 'Clear search',
  filterOptions: 'Filter options',

  loading: 'Loading',
  loadingOptions: 'Loading options',
  searching: 'Searching',

  itemsSelected: '{0} items selected',
  selectAll: 'Select all',
  remove: 'Remove {0}',
  moreSelected: '{0} more selected',

  today: 'Today',
  clear: 'Clear',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  month: 'Month',
  year: 'Year',
  time: 'Time',
  hour: 'Hour',
  minute: 'Minute',
  amPm: 'AM or PM',

  chooseFiles: 'Choose files',
};

/**
 * Source of the application's labels. A *function*, so it can read a signal
 * (the current language) and every component re-renders when it changes.
 */
export const GM_LABELS = new InjectionToken<() => Partial<GmLabels>>(
  'GM_LABELS',
);

/**
 * Translates every built-in form text in one place:
 *
 * ```ts
 * provideGmLabels(() => ({
 *   enter: t('form.enter'),            // "أدخل {0}"
 *   clearSelection: t('form.clear'),
 * }))
 * ```
 *
 * Anything left out keeps its English default.
 */
export function provideGmLabels(
  labels: Partial<GmLabels> | (() => Partial<GmLabels>),
): Provider {
  return {
    provide: GM_LABELS,
    useValue: typeof labels === 'function' ? labels : () => labels,
  };
}

/** The merged labels. Call from a field initialiser (needs an injection context). */
export function injectGmLabels(): Signal<GmLabels> {
  const source = inject(GM_LABELS, { optional: true });
  return computed(() => ({ ...GM_DEFAULT_LABELS, ...(source?.() ?? {}) }));
}

/** Fills `{0}`, `{1}`, … in a label. */
export function gmFormat(template: string, ...values: unknown[]): string {
  return template.replace(/\{(\d+)\}/g, (match, index) =>
    String(values[Number(index)] ?? match),
  );
}
