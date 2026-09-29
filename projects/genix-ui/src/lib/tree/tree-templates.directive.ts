import { Directive, TemplateRef, inject, input } from '@angular/core';

import type {
  GmTreeCheckboxContext,
  GmTreeEmptyContext,
  GmTreeIconContext,
  GmTreeNodeContext,
  GmTreeTogglerContext,
} from './tree.types';

/**
 * Marks a template as the renderer for a node's content in `gm-tree`,
 * for rows richer than `optionLabel` can express.
 *
 * ```html
 * <gm-tree [nodes]="files">
 *   <ng-template gmTreeNode let-node let-level="level">
 *     <strong>{{ node.label }}</strong>
 *   </ng-template>
 *   <ng-template gmTreeNode="folder" let-node>
 *     <em>{{ node.label }}</em> ({{ node.children?.length ?? 0 }})
 *   </ng-template>
 * </gm-tree>
 * ```
 *
 * A value targets nodes whose `type` equals it, like PrimeNG's per-type
 * `pTemplate`; a template without one is the fallback for every other node.
 *
 * Presentation only. The toggler, the checkbox and the row's ARIA state stay
 * with the component, so a custom template cannot change what is selected.
 */
@Directive({
  selector: '[gmTreeNode]',
  standalone: true,
})
export class GmTreeNodeDirective {
  readonly template = inject<TemplateRef<GmTreeNodeContext>>(TemplateRef);

  /** Node `type` this template renders. Empty for the default template. */
  readonly type = input<string | undefined>(undefined, { alias: 'gmTreeNode' });

  /** Types `let-node` / `let-level` / … in the template. */
  static ngTemplateContextGuard(
    _directive: GmTreeNodeDirective,
    context: unknown,
  ): context is GmTreeNodeContext {
    return true;
  }
}

/**
 * Replaces the node icon — for icon fonts that need text content rather than
 * a class (Material Icons ligatures), inline SVG, or an icon chosen from data.
 *
 * ```html
 * <ng-template gmTreeIcon let-node>
 *   <span class="material-icons">{{ node.data.kind === 'question' ? 'question_mark' : 'check' }}</span>
 * </ng-template>
 * ```
 *
 * Without it, a node's `icon` / `expandedIcon` / `collapsedIcon` class is used.
 */
@Directive({
  selector: '[gmTreeIcon]',
  standalone: true,
})
export class GmTreeIconDirective {
  readonly template = inject<TemplateRef<GmTreeIconContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: GmTreeIconDirective,
    context: unknown,
  ): context is GmTreeIconContext {
    return true;
  }
}

/** Content above the filter box and the rows. */
@Directive({
  selector: '[gmTreeHeader]',
  standalone: true,
})
export class GmTreeHeaderDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Content below the rows. */
@Directive({
  selector: '[gmTreeFooter]',
  standalone: true,
})
export class GmTreeFooterDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Replaces the empty message. `let-filtered` tells an empty `nodes` apart
 * from a filter that matched nothing.
 */
@Directive({
  selector: '[gmTreeEmpty]',
  standalone: true,
})
export class GmTreeEmptyDirective {
  readonly template = inject<TemplateRef<GmTreeEmptyContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: GmTreeEmptyDirective,
    context: unknown,
  ): context is GmTreeEmptyContext {
    return true;
  }
}

/**
 * Replaces the expand/collapse chevron. `let-expanded` is the node's state;
 * the click target and the keyboard handling stay with the component.
 */
@Directive({
  selector: '[gmTreeToggler]',
  standalone: true,
})
export class GmTreeTogglerDirective {
  readonly template = inject<TemplateRef<GmTreeTogglerContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: GmTreeTogglerDirective,
    context: unknown,
  ): context is GmTreeTogglerContext {
    return true;
  }
}

/**
 * Replaces the drawn checkbox. Presentational: the row carries `aria-checked`
 * and handles the click, so the template must not add a focusable control.
 */
@Directive({
  selector: '[gmTreeCheckbox]',
  standalone: true,
})
export class GmTreeCheckboxDirective {
  readonly template = inject<TemplateRef<GmTreeCheckboxContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: GmTreeCheckboxDirective,
    context: unknown,
  ): context is GmTreeCheckboxContext {
    return true;
  }
}
