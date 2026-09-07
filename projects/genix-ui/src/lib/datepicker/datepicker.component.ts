import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { GmFormFieldBase } from '../core/form-field-base';
import { gmOverlayPanel } from '../core/overlay-panel';
import { gmUniqueId } from '../core/unique-id';
import { GmButtonComponent } from '../button/button.component';
import {
  gmAddDays,
  gmAddMonths,
  gmClamp,
  gmCoerceDate,
  gmFormatDate,
  gmIsOutOfRange,
  gmIsSameDay,
  gmMonthGrid,
  gmStartOfDay,
  gmToday,
} from './date-utils';

/**
 * Single-date picker: a read-only trigger plus a calendar in the shared
 * overlay.
 *
 * ```html
 * <gm-datepicker formControlName="startDate" label="Start Date"
 *                [minDate]="min" dateFormat="dd/MM/yyyy" />
 * ```
 *
 * The control value is a local-midnight `Date` (or null) — never a string, and
 * never shifted by timezone, because every date is built from explicit parts.
 * `writeValue` also accepts a `yyyy-MM-dd` string, since API payloads commonly
 * patch one in.
 *
 * Single date only: no range, time, inline mode or per-date disabling, none of
 * which the app's direct usages need.
 */
@Component({
  selector: 'gm-datepicker',
  standalone: true,
  imports: [GmButtonComponent],
  templateUrl: './datepicker.component.html',
  styleUrl: './datepicker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gm-datepicker-host',
    '[class.gm-datepicker-host--invalid]': 'hasError()',
    '[class.gm-datepicker-host--open]': 'open()',
    '[class.gm-datepicker-host--filled]': 'selected() !== null',
  },
})
export class GmDatepickerComponent extends GmFormFieldBase<Date> {
  readonly placeholder = input<string>('');

  /** Display pattern. Tokens: `dd`, `MM`, `yyyy`, `yy`. */
  readonly dateFormat = input<string>('dd/MM/yyyy');

  readonly minDate = input<Date | null>(null);

  readonly maxDate = input<Date | null>(null);

  /** Shows an inline clear button once a date is set. */
  readonly clearable = input(false, { transform: booleanAttribute });

  /** Shows the Today / Clear footer. */
  readonly showButtonBar = input(false, { transform: booleanAttribute });

  /** 0 = Sunday. */
  readonly firstDayOfWeek = input(0);

  readonly todayLabel = input<string>('Today');

  readonly clearLabel = input<string>('Clear');

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayPanel = gmOverlayPanel();
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  protected readonly open = signal(false);

  /** Month on screen, as a local-midnight first-of-month. */
  protected readonly viewMonth = signal(gmToday());

  /** The day the calendar's roving focus sits on. */
  protected readonly focusedDate = signal(gmToday());

  readonly calendarId = gmUniqueId('gm-calendar');

  /** Whether the calendar can be opened at all. */
  protected readonly locked = computed(
    () => this.isDisabled() || this.readOnly(),
  );

  protected readonly selected = computed(() => this.value() ?? null);

  protected readonly displayText = computed(() => {
    const current = this.selected();
    return current === null ? '' : gmFormatDate(current, this.dateFormat());
  });

  protected readonly weekdays = computed(() => {
    // Derived from a known week rather than a hardcoded list, so it follows
    // firstDayOfWeek and the browser's locale.
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    const sunday = gmStartOfDay(new Date(2024, 0, 7)); // a Sunday
    return Array.from({ length: 7 }, (_, i) =>
      formatter.format(gmAddDays(sunday, (i + this.firstDayOfWeek()) % 7)),
    );
  });

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(this.viewMonth()),
  );

  /** The six-week grid, chunked into rows for the table. */
  protected readonly weeks = computed(() => {
    const days = gmMonthGrid(
      this.viewMonth().getFullYear(),
      this.viewMonth().getMonth(),
      this.firstDayOfWeek(),
    );
    return Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  });

  constructor() {
    super();
    // Disabling the field must not leave a calendar hanging open.
    effect(() => {
      if (this.locked() && this.open()) {
        this.close();
      }
    });
  }

  protected override generateId(): string {
    return gmUniqueId('gm-datepicker');
  }

  /** `writeValue` may hand us a string; normalise before anything reads it. */
  override writeValue(value: Date | null): void {
    super.writeValue(gmCoerceDate(value));
  }

  // ── Day state, for the template ─────────────────────────────────────────

  protected isSelected(day: Date): boolean {
    return gmIsSameDay(day, this.selected());
  }

  protected isToday(day: Date): boolean {
    return gmIsSameDay(day, gmToday());
  }

  protected isOutsideMonth(day: Date): boolean {
    return day.getMonth() !== this.viewMonth().getMonth();
  }

  protected isDisabledDay(day: Date): boolean {
    return gmIsOutOfRange(day, this.minDate(), this.maxDate());
  }

  protected isFocused(day: Date): boolean {
    return gmIsSameDay(day, this.focusedDate());
  }

  protected dayId(day: Date): string {
    return `${this.calendarId}-${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
  }

  protected dayLabel(day: Date): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(day);
  }

  // ── Open / close ────────────────────────────────────────────────────────

  protected toggle(): void {
    this.open() ? this.close() : this.show();
  }

  protected show(): void {
    if (this.locked() || this.open()) {
      return;
    }

    // Open on the selected date, else today — clamped so focus never starts on
    // a day the range forbids.
    const start = gmClamp(
      this.selected() ?? gmToday(),
      this.minDate(),
      this.maxDate(),
    );
    this.focusedDate.set(start);
    this.viewMonth.set(start);

    this.overlayPanel.open(this.panel(), () => this.close());
    this.open.set(true);
    this.focusActiveDay();
  }

  protected close(): void {
    this.overlayPanel.close();
    this.open.set(false);
    // Closing ends the interaction, which is when the control becomes touched.
    this.handleBlur();
  }

  private focusTrigger(): void {
    this.hostRef.nativeElement
      .querySelector<HTMLElement>('.gm-datepicker__trigger')
      ?.focus();
  }

  /**
   * Moves DOM focus onto the day button the roving focus points at. Deferred
   * because the button only exists after the panel renders the new month.
   */
  private focusActiveDay(): void {
    const id = this.dayId(this.focusedDate());
    requestAnimationFrame(() => {
      document.getElementById(id)?.focus();
    });
  }

  // ── Selection ───────────────────────────────────────────────────────────

  protected select(day: Date): void {
    if (this.isDisabledDay(day)) {
      return;
    }
    this.commit(gmStartOfDay(day));
    this.close();
    this.focusTrigger();
  }

  protected selectToday(): void {
    const today = gmToday();
    if (!gmIsOutOfRange(today, this.minDate(), this.maxDate())) {
      this.select(today);
    }
  }

  protected clear(event?: Event): void {
    // Without this the inline button's click would bubble into the trigger and
    // reopen the calendar.
    event?.stopPropagation();
    this.commit(null);
    this.handleBlur();
    if (this.open()) {
      this.close();
    }
  }

  // ── Month navigation ────────────────────────────────────────────────────

  protected shiftMonth(delta: number): void {
    this.viewMonth.set(gmAddMonths(this.viewMonth(), delta));
  }

  /** Prev/next are pointless when the whole neighbouring month is out of range. */
  protected canGoBack(): boolean {
    const min = this.minDate();
    if (!min) {
      return true;
    }
    const lastOfPrev = gmAddDays(this.viewMonth(), -this.viewMonth().getDate());
    return !gmIsOutOfRange(lastOfPrev, min, null);
  }

  protected canGoForward(): boolean {
    const max = this.maxDate();
    if (!max) {
      return true;
    }
    const firstOfNext = gmAddMonths(
      gmStartOfDay(new Date(this.viewMonth().getFullYear(), this.viewMonth().getMonth(), 1)),
      1,
    );
    return !gmIsOutOfRange(firstOfNext, null, max);
  }

  // ── Keyboard ────────────────────────────────────────────────────────────

  /** Trigger keys: open the calendar. */
  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.locked()) {
      return;
    }
    if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.show();
      return;
    }
    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.close();
    }
  }

  /**
   * Calendar grid keys, per the ARIA date-grid pattern. Movement is clamped to
   * the min/max range rather than skipping disabled days: with only min/max the
   * allowed span is contiguous, so clamping lands on the nearest valid day.
   */
  protected onCalendarKeydown(event: KeyboardEvent): void {
    const current = this.focusedDate();
    let next: Date | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        next = gmAddDays(current, -1);
        break;
      case 'ArrowRight':
        next = gmAddDays(current, 1);
        break;
      case 'ArrowUp':
        next = gmAddDays(current, -7);
        break;
      case 'ArrowDown':
        next = gmAddDays(current, 7);
        break;
      case 'Home':
        next = gmAddDays(current, -(current.getDay() - this.firstDayOfWeek() + 7) % 7);
        break;
      case 'End':
        next = gmAddDays(
          current,
          6 - ((current.getDay() - this.firstDayOfWeek() + 7) % 7),
        );
        break;
      case 'PageUp':
        next = gmAddMonths(current, -1);
        break;
      case 'PageDown':
        next = gmAddMonths(current, 1);
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        this.select(current);
        return;

      case 'Escape':
        event.preventDefault();
        this.close();
        this.focusTrigger();
        return;

      default:
        return;
    }

    event.preventDefault();
    const clamped = gmClamp(next, this.minDate(), this.maxDate());
    this.focusedDate.set(clamped);
    this.viewMonth.set(clamped);
    this.focusActiveDay();
  }
}
