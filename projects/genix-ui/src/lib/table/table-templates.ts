import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * Marks a template as the cell renderer for one column.
 *
 * ```html
 * <ng-template gmTableCell="actions" let-row let-column="column">
 *   <gm-button icon="pi pi-pencil" (onClick)="edit(row)" />
 * </ng-template>
 * ```
 *
 * Deliberately one directive keyed by field, rather than PrimeNG's
 * `pTemplate` string-slot system.
 */
@Directive({
  selector: '[gmTableCell]',
  standalone: true,
})
export class GmTableCellDirective {
  /**
   * Field of the column this template renders. Omit it to make the template the
   * default for every column that has no template of its own — which is how a
   * generic, config-driven cell renderer is wired up with one template.
   */
  readonly field = input<string | undefined>(undefined, { alias: 'gmTableCell' });

  readonly template = inject(TemplateRef);
}

/** Marks a template as the empty-state content, replacing `emptyMessage`. */
@Directive({
  selector: '[gmTableEmpty]',
  standalone: true,
})
export class GmTableEmptyDirective {
  readonly template = inject(TemplateRef);
}

/**
 * Marks a template as the filter control for one column, for filters the
 * built-in types cannot express.
 *
 * ```html
 * <ng-template gmTableFilter="status" let-value let-apply="apply">
 *   <my-control [value]="value" (changed)="apply($event)" />
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[gmTableFilter]',
  standalone: true,
})
export class GmTableFilterDirective {
  /** Field of the column this filter belongs to. */
  readonly field = input.required<string>({ alias: 'gmTableFilter' });

  readonly template = inject(TemplateRef);
}

/**
 * Replaces the generated header row with the consumer's own markup.
 *
 * Because the template owns the `<tr>`/`<th>` elements outright, grouped
 * headers, `rowspan` and `colspan` all come from native table semantics rather
 * than from a header-layout API:
 *
 * ```html
 * <ng-template gmTableHeader>
 *   <tr>
 *     <th rowspan="2">Name</th>
 *     <th colspan="2">Contact</th>
 *   </tr>
 *   <tr>
 *     <th>Email</th>
 *     <th>Phone</th>
 *   </tr>
 * </ng-template>
 * ```
 *
 * The generated filter row still renders below it, so filtering keeps working;
 * for sorting, call the table's `sortBy(field)` and read `sortDirectionOf(field)`.
 */
@Directive({
  selector: '[gmTableHeader]',
  standalone: true,
})
export class GmTableHeaderDirective {
  readonly template = inject(TemplateRef);
}
