import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { GmButtonComponent } from '../button/button.component';
import { gmUniqueId } from '../core/unique-id';
import type { GmFileRejection } from './file-upload.types';

/** `maxFileSize` is optional, so an unset input must stay `undefined`. */
function optionalSize(value: number | string | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const size = Number(value);
  return Number.isFinite(size) ? size : undefined;
}

/** Binary-ish sizes, the way file managers show them. */
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  // No decimals for bytes, one everywhere else: "512 B", "4.9 MB".
  return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`;
}

/**
 * File picker over a native `<input type="file">`, with an optional drop zone.
 *
 * ```html
 * <gm-file-upload
 *   [multiple]="true"
 *   accept=".pdf,.jpg,.png"
 *   [maxFileSize]="5000000"
 *   (filesSelected)="onFilesSelected($event)"
 * />
 * ```
 *
 * It selects files and never sends them: no request, no progress, no retry.
 * `filesSelected` carries native `File` objects, and the consuming app hands
 * them to its own service. That keeps auth, endpoints and error handling where
 * they belong and leaves this component free of any HTTP concern.
 *
 * The event always carries the *whole* current selection — after a pick, a
 * removal, or `clear()` — so a caller can assign it straight to its own field
 * instead of reconciling deltas.
 */
@Component({
  selector: 'gm-file-upload',
  standalone: true,
  imports: [GmButtonComponent],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-file-upload' },
})
export class GmFileUploadComponent {
  readonly multiple = input(false, { transform: booleanAttribute });

  /** Passed straight to the native input: `".pdf,.jpg"`, `"image/*"`. */
  readonly accept = input<string>();

  /** Largest accepted file, in bytes. Unset means no limit. */
  readonly maxFileSize = input(undefined, { transform: optionalSize });

  readonly disabled = input(false, { transform: booleanAttribute });

  /** Visible caption above the zone. */
  readonly label = input<string>();

  readonly chooseLabel = input('Choose files');

  readonly hint = input<string>();

  /** Drop zone. Turn it off for a plain button. */
  readonly dragAndDrop = input(true, { transform: booleanAttribute });

  /** The list of picked files. Off when the page renders its own. */
  readonly showFiles = input(true, { transform: booleanAttribute });

  readonly ariaLabel = input<string>();

  /** The complete selection after every change. */
  readonly filesSelected = output<File[]>();

  /** The one file a caller (or the user) took out. */
  readonly fileRemoved = output<File>();

  /** Files turned away by `accept` or `maxFileSize`. */
  readonly rejected = output<GmFileRejection[]>();

  private readonly fileInput =
    viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  private readonly selected = signal<readonly File[]>([]);

  /** Current selection, for a template that wants to read it off a ref. */
  readonly files = this.selected.asReadonly();

  protected readonly errors = signal<readonly GmFileRejection[]>([]);

  protected readonly dragging = signal(false);

  protected readonly inputId = gmUniqueId('gm-file-upload');

  protected readonly labelId = `${this.inputId}-label`;

  /** Opens the file dialog. The input itself is hidden from the tab order. */
  protected browse(): void {
    if (this.disabled()) {
      return;
    }
    this.fileInput().nativeElement.click();
  }

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.ingest(input.files);
    // Lets the same file be chosen again: without this, re-picking it is not a
    // value change and fires no event.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    if (this.disabled() || !this.dragAndDrop()) {
      return;
    }
    // Without this the browser navigates to the dropped file.
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(): void {
    this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (this.disabled() || !this.dragAndDrop()) {
      return;
    }
    event.preventDefault();
    this.dragging.set(false);
    this.ingest(event.dataTransfer?.files ?? null);
  }

  /** Takes one file out of the selection. */
  remove(file: File): void {
    if (this.disabled() || !this.selected().includes(file)) {
      return;
    }
    this.selected.set(this.selected().filter((candidate) => candidate !== file));
    this.fileRemoved.emit(file);
    this.emitSelection();
  }

  /** Empties the selection and any validation messages. */
  clear(): void {
    this.errors.set([]);
    if (!this.selected().length) {
      return;
    }
    this.selected.set([]);
    this.emitSelection();
  }

  protected sizeOf(file: File): string {
    return formatSize(file.size);
  }

  /**
   * Validates, then merges. The native dialog already filters by `accept`, but
   * a drop does not — so `accept` is checked here too rather than trusting the
   * source of the files.
   */
  private ingest(incoming: FileList | null): void {
    if (!incoming?.length) {
      return;
    }

    const limit = this.maxFileSize();
    const accepted: File[] = [];
    const rejections: GmFileRejection[] = [];

    for (const file of Array.from(incoming)) {
      if (!this.matchesAccept(file)) {
        rejections.push({
          file,
          reason: 'type',
          message: `${file.name} is not an accepted file type.`,
        });
        continue;
      }
      if (limit !== undefined && file.size > limit) {
        rejections.push({
          file,
          reason: 'size',
          message: `${file.name} is larger than ${formatSize(limit)}.`,
        });
        continue;
      }
      accepted.push(file);
    }

    this.errors.set(rejections);
    if (rejections.length) {
      this.rejected.emit(rejections);
    }
    if (!accepted.length) {
      return;
    }

    // Single mode holds one file, so a new pick replaces the old one.
    this.selected.set(
      this.multiple()
        ? [...this.selected(), ...accepted]
        : [accepted[accepted.length - 1]],
    );
    this.emitSelection();
  }

  /**
   * Matches one `accept` token at a time: `.ext` against the file name,
   * `type/*` against the media type's first half, anything else exactly.
   */
  private matchesAccept(file: File): boolean {
    const accept = this.accept()?.trim();
    if (!accept) {
      return true;
    }

    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    return accept
      .split(',')
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length > 0)
      .some((token) => {
        if (token.startsWith('.')) {
          return name.endsWith(token);
        }
        if (token.endsWith('/*')) {
          return type.startsWith(token.slice(0, -1));
        }
        return type === token;
      });
  }

  private emitSelection(): void {
    this.filesSelected.emit([...this.selected()]);
  }
}
