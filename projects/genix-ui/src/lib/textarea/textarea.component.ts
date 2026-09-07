import {
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
} from '@angular/core';

import { GmFormFieldBase } from '../core/form-field-base';
import { gmUniqueId } from '../core/unique-id';

/** How the user may resize the control. Maps to the CSS `resize` property. */
export type GmTextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

/**
 * Multi-line text field over a native `<textarea>`.
 *
 * ```html
 * <gm-textarea formControlName="description" label="Description" [rows]="4" />
 * ```
 */
@Component({
  selector: 'gm-textarea',
  standalone: true,
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-field-host',
    '[class.gm-field-host--invalid]': 'hasError()',
    '[class.gm-field-host--filled]': 'isFilled()',
  },
})
export class GmTextareaComponent extends GmFormFieldBase<string> {
  readonly rows = input(3, { transform: numberAttribute });

  readonly resize = input<GmTextareaResize>('vertical');

  readonly placeholder = input<string>();

  readonly maxLength = input(undefined, { transform: numberAttribute });

  readonly minLength = input(undefined, { transform: numberAttribute });

  protected override generateId(): string {
    return gmUniqueId('gm-textarea');
  }

  protected handleInput(event: Event): void {
    this.commit((event.target as HTMLTextAreaElement).value);
  }
}
