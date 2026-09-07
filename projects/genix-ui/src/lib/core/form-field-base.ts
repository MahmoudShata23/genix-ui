import {
  DestroyRef,
  Directive,
  OnInit,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import type { GmSize } from './types';

/** Size step shared by every text-entry control. */
export type GmFieldSize = GmSize;

/**
 * Shared behaviour for the text-entry form controls (`gm-input`,
 * `gm-textarea`): the ControlValueAccessor plumbing, the label/hint/error
 * accessibility wiring, and the visual state flags.
 *
 * The value lives in exactly one place — the `value` signal — written either by
 * `writeValue` (from the bound control) or by the native `input` event. Nothing
 * mirrors it.
 *
 * The accessor is registered by assigning `ngControl.valueAccessor` rather than
 * providing `NG_VALUE_ACCESSOR`, which is what lets the component read its own
 * `NgControl` for validity state without a circular dependency. This is the
 * pattern the app's existing `shared/components/form-fields` wrappers use.
 */
@Directive()
export abstract class GmFormFieldBase<T>
  implements ControlValueAccessor, OnInit
{
  /** Visible label. Rendered as a real `<label for>`. */
  readonly label = input<string>();

  /** Helper text below the control. Hidden while an error is showing. */
  readonly hint = input<string>();

  /** Explicit error message. Its presence also puts the control in error state. */
  readonly error = input<string>();

  /** Renders the required marker and sets `aria-required`. */
  readonly required = input(false, { transform: booleanAttribute });

  readonly readOnly = input(false, {
    alias: 'readonly',
    transform: booleanAttribute,
  });

  /** Template-level disable. Combined with the state set by Reactive Forms. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Explicit element id. Generated per instance when omitted. */
  readonly inputId = input<string>();

  readonly name = input<string>();

  /** Accessible name. Only needed when there is no `label`. */
  readonly ariaLabel = input<string>();

  /** Emitted on every keystroke, for use without a form control. */
  readonly valueChange = output<T | null>();

  protected readonly ngControl = inject(NgControl, {
    self: true,
    optional: true,
  });

  /* protected so subclasses reuse this instead of injecting a second one. */
  protected readonly destroyRef = inject(DestroyRef);

  /** Single source of truth for the control's value. */
  protected readonly value = signal<T | null>(null);

  /** Disabled state pushed in by Reactive Forms via `setDisabledState`. */
  private readonly formDisabled = signal(false);

  /**
   * Bumped whenever the bound control reports a status or touched change, so
   * the derived `controlInvalid` recomputes under `OnPush`. `AbstractControl`
   * exposes no signal, so its `events` stream is the notification channel.
   */
  private readonly controlRevision = signal(0);

  private readonly autoId = this.generateId();

  protected abstract generateId(): string;

  protected readonly controlId = computed(() => this.inputId() ?? this.autoId);

  private readonly hintId = computed(() => `${this.controlId()}-hint`);

  private readonly errorId = computed(() => `${this.controlId()}-error`);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.formDisabled(),
  );

  /** A bound control counts as invalid only once the user has touched it. */
  private readonly controlInvalid = computed(() => {
    this.controlRevision();
    const control = this.ngControl?.control;
    return !!control && control.invalid && control.touched;
  });

  /** Drives the error styling; an explicit `error` forces it on. */
  protected readonly hasError = computed(
    () => !!this.error() || this.controlInvalid(),
  );

  /**
   * Message text to render. Only ever the explicit `error` input — mapping a
   * control's `ValidationErrors` to human text needs the app's i18n layer, so
   * that stays in the application.
   */
  protected readonly errorText = computed(() => this.error() || null);

  protected readonly showHint = computed(
    () => !!this.hint() && !this.errorText(),
  );

  /** Distinguishes an empty control from one holding a value. */
  protected readonly isFilled = computed(() => {
    const current = this.value();
    return current !== null && current !== undefined && `${current}` !== '';
  });

  /** Points the control at whichever of hint/error is actually rendered. */
  protected readonly describedBy = computed(() => {
    const ids = [
      ...(this.errorText() ? [this.errorId()] : []),
      ...(this.showHint() ? [this.hintId()] : []),
    ];
    return ids.length ? ids.join(' ') : null;
  });

  protected readonly hintElementId = this.hintId;
  protected readonly errorElementId = this.errorId;

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Registering here (rather than through NG_VALUE_ACCESSOR) keeps `ngControl`
    // injectable in this same component.
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    // `ngControl.control` is only linked once the form directive has run, so
    // the subscription cannot be set up in the constructor.
    this.ngControl?.control?.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.controlRevision.update((n) => n + 1));
  }

  // ── ControlValueAccessor ────────────────────────────────────────────────

  writeValue(value: T | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  // ── Native event handlers ───────────────────────────────────────────────

  protected commit(next: T | null): void {
    this.value.set(next);
    this.onChange(next);
    this.valueChange.emit(next);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
