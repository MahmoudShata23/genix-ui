import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  GmButtonComponent,
  GmDialogConfig,
  GmDialogRef,
  GmInputComponent,
} from '@mahmoudshata23/genix-ui';

/** What the opener hands in through `config.data`. */
export interface ProviderDraft {
  readonly name: string;
  readonly country: string;
}

/**
 * Content for the dialog section — written in the shape a migrated PrimeNG
 * dialog has: the ref and the config arrive by constructor injection, the
 * payload is read off `config.data`, and the result leaves through
 * `ref.close()`. Nothing here knows it is inside an overlay.
 */
@Component({
  selector: 'pg-dialog-demo',
  standalone: true,
  imports: [ReactiveFormsModule, GmButtonComponent, GmInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="pg-dialog-demo" [formGroup]="form" (ngSubmit)="save()">
      <gm-input label="Provider" formControlName="name" />
      <gm-input label="Country" formControlName="country" />

      <p class="pg-dialog-demo__note">
        Escape and the backdrop both dismiss this dialog; Tab cannot leave it.
      </p>

      <div class="pg-dialog-demo__actions">
        <gm-button
          label="Cancel"
          severity="secondary"
          variant="text"
          (onClick)="ref.close()"
        />
        <gm-button label="Save" type="submit" />
      </div>
    </form>
  `,
  styles: `
    .pg-dialog-demo {
      display: flex;
      flex-direction: column;
      gap: var(--gm-space-4);
      min-width: 18rem;
    }

    .pg-dialog-demo__note {
      margin: 0;
      font-size: var(--gm-font-size-sm);
      color: var(--gm-gray-500);
    }

    .pg-dialog-demo__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--gm-space-2);
    }
  `,
})
export class PgDialogDemoComponent {
  protected readonly form: FormGroup;

  constructor(
    public ref: GmDialogRef<string, ProviderDraft>,
    public config: GmDialogConfig<ProviderDraft>,
  ) {
    this.form = new FormGroup({
      name: new FormControl(this.config.data?.name ?? ''),
      country: new FormControl(this.config.data?.country ?? ''),
    });
  }

  protected save(): void {
    const { name, country } = this.form.value;
    this.ref.close(`${name} — ${country}`);
  }
}
