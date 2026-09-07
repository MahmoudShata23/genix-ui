import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  GmBadgeComponent,
  GmButtonComponent,
  GmCardComponent,
  GmCheckboxComponent,
  GmChipComponent,
  GmInputComponent,
  GmSelectComponent,
  GmSpinnerComponent,
  GmTabComponent,
  GmTabsComponent,
  GmTooltipDirective,
} from '@mahmoudshata23/genix-ui';

interface Country {
  readonly name: string;
  readonly code: string;
}

/**
 * The repo's own consumer. It imports the package by its published name, which
 * `tsconfig.json` maps to `dist/genix-ui` — so everything below type-checks
 * against the generated .d.ts and renders from the FESM bundle, exactly as it
 * would after `npm install`. If a component's public API breaks, this fails to
 * build before anything is published.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    GmBadgeComponent,
    GmButtonComponent,
    GmCardComponent,
    GmCheckboxComponent,
    GmChipComponent,
    GmInputComponent,
    GmSelectComponent,
    GmSpinnerComponent,
    GmTabComponent,
    GmTabsComponent,
    GmTooltipDirective,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly activeTab = signal<string | number | null>('controls');
  protected readonly submitted = signal<string | null>(null);

  protected readonly countries: readonly Country[] = [
    { name: 'Lebanon', code: 'LB' },
    { name: 'United Arab Emirates', code: 'AE' },
    { name: 'Saudi Arabia', code: 'SA' },
    { name: 'Egypt', code: 'EG' },
    { name: 'Jordan', code: 'JO' },
  ];

  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    country: new FormControl<string | null>(null, [Validators.required]),
    acceptsTerms: new FormControl(false, { nonNullable: true }),
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    this.submitted.set(
      this.form.valid ? JSON.stringify(this.form.getRawValue(), null, 2) : null,
    );
  }
}
