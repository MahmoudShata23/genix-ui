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
  numberAttribute,
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
  gmCoerceDateTime,
  gmFormatDate,
  gmFormatTime,
  gmIsOutOfRange,
  gmIsSameDay,
  gmMonthGrid,
  gmStartOfDay,
  gmToday,
  gmWithTime,
} from './date-utils';
import type {
  GmDateRange,
  GmDatepickerHourFormat,
  GmDatepickerSelectionMode,
} from './datepicker.types';

/**
 * `count` values from 0, keeping every `step`-th one. A step below 1 would
 * produce an empty or infinite list, so it falls back to every value.
 */
function gmStepped(count: number, step: number): number[] {
  const stride = Number.isFinite(step) && step >= 1 ? Math.floor(step) : 1;
  const values: number[] = [];
  for (let value = 0; value < count; value += stride) {
    values.push(value);
  }
  return values;
}

/** `hourFormat="12"` (attribute) and `[hourFormat]="12"` both have to work. */
function hourFormatAttribute(
  value: GmDatepickerHourFormat | '12' | '24',
): GmDatepickerHourFormat {
  return Number(value) === 12 ? 12 : 24;
}

/**
 * Date picker: a read-only trigger plus a calendar in the shared overlay.
 *
 * ```html
 * <gm-datepicker formControlName="startDate" label="Start Date"
 *                [minDate]="min" dateFormat="dd/MM/yyyy" />
 * <gm-datepicker formControlName="appointment" [showTime]="true" />
 * <gm-datepicker formControlName="startTime" [timeOnly]="true" />
 * <gm-datepicker formControlName="period" selectionMode="range" />
 * ```
 *
 * The control value is a `Date` (or null) in every single-date mode, and a
 * `[start, end]` tuple in range mode — never a string, and never shifted by
 * timezone, because every date is built from explicit parts. `writeValue` also
 * accepts a `yyyy-MM-dd` string (or `yyyy-MM-ddTHH:mm` / `HH:mm` with time on),
 * since API payloads commonly patch one in.
 *
 * No inline mode and no per-date disabling beyond min/max, neither of which the
 * app's usages need.
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
    '[class.gm-datepicker-host--filled]': 'hasSelection()',
  },
})
export class GmDatepickerComponent extends GmFormFieldBase<Date | GmDateRange> {
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

  /** Adds hour/minute controls below the calendar; the value carries the time. */
  readonly showTime = input(false, { transform: booleanAttribute });

  /** Time controls only — no calendar. The value is still a `Date`. */
  readonly timeOnly = input(false, { transform: booleanAttribute });

  /**
   * Granularity of the minute list, e.g. `30` offers only :00 and :30.
   * The time controls are option lists rather than spinners, so a step
   * narrows the list instead of sizing an increment.
   */
  readonly stepMinute = input(1, { transform: numberAttribute });

  /** Granularity of the hour list. */
  readonly stepHour = input(1, { transform: numberAttribute });

  readonly hourFormat = input<GmDatepickerHourFormat, GmDatepickerHourFormat | '12' | '24'>(
    24,
    { transform: hourFormatAttribute },
  );

  /** `range` makes the value a `[start, end]` tuple. */
  readonly selectionMode = input<GmDatepickerSelectionMode>('single');

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayPanel = gmOverlayPanel();
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  protected readonly open = signal(false);

  /** Month on screen, as a local-midnight first-of-month. */
  protected readonly viewMonth = signal(gmToday());

  /** The day the calendar's roving focus sits on. */
  protected readonly focusedDate = signal(gmToday());

  /** Pointer position, for previewing a range before its end is committed. */
  protected readonly hoverDate = signal<Date | null>(null);

  readonly calendarId = gmUniqueId('gm-calendar');

  protected readonly minuteOptions = computed(() =>
    gmStepped(60, this.stepMinute()),
  );

  /** Whether the calendar can be opened at all. */
  protected readonly locked = computed(
    () => this.isDisabled() || this.readOnly(),
  );

  protected readonly isRange = computed(
    () => this.selectionMode() === 'range',
  );

  /**
   * Time controls are suppressed in range mode: a range's value is a pair of
   * calendar days, and there is no single date for an hour to belong to.
   */
  protected readonly hasTime = computed(
    () => (this.showTime() || this.timeOnly()) && !this.isRange(),
  );

  protected readonly showCalendar = computed(() => !this.timeOnly());

  /** The single-date value. Null in range mode, where the tuple applies. */
  protected readonly selected = computed<Date | null>(() => {
    const current = this.value();
    return current instanceof Date ? current : null;
  });

  /** The range value, normalised — `writeValue` may hand us null or a short array. */
  protected readonly selectedRange = computed<GmDateRange>(() => {
    const current = this.value();
    return Array.isArray(current)
      ? [current[0] ?? null, current[1] ?? null]
      : [null, null];
  });

  /** Whether anything is selected, whichever mode is active. */
  protected readonly hasSelection = computed(() =>
    this.isRange()
      ? this.selectedRange()[0] !== null
      : this.selected() !== null,
  );

  protected readonly displayText = computed(() => {
    if (this.isRange()) {
      const [start, end] = this.selectedRange();
      if (!start) {
        return '';
      }
      return end
        ? `${this.formatValue(start)} – ${this.formatValue(end)}`
        : this.formatValue(start);
    }

    const current = this.selected();
    return current === null ? '' : this.formatValue(current);
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

  /** Names the overlay: there is no month to announce when it is time only. */
  protected readonly panelLabel = computed(() =>
    this.timeOnly() ? 'Time' : this.monthLabel(),
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

  // ── Time state ──────────────────────────────────────────────────────────

  protected readonly hour = computed(() => this.selected()?.getHours() ?? 0);

  protected readonly minute = computed(() => this.selected()?.getMinutes() ?? 0);

  /** The hour as the controls show it — 0–23, or 1–12 alongside a meridiem. */
  protected readonly displayHour = computed(() => {
    const hours = this.hour();
    return this.hourFormat() === 24 ? hours : hours % 12 || 12;
  });

  protected readonly meridiem = computed(() =>
    this.hour() < 12 ? 'AM' : 'PM',
  );

  protected readonly hourOptions = computed(() =>
    this.hourFormat() === 24
      ? gmStepped(24, this.stepHour())
      : gmStepped(12, this.stepHour()).map((hour) => hour + 1),
  );

  /**
   * The far end of the range currently on screen: the committed end, or the
   * day being hovered while one is still being picked. Only ever ahead of the
   * start, so a preview never renders backwards.
   */
  private readonly rangeSpanEnd = computed<Date | null>(() => {
    const [start, end] = this.selectedRange();
    if (!start) {
      return null;
    }
    if (end) {
      return end;
    }
    const preview = this.hoverDate();
    return preview && preview > start ? preview : null;
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

  /**
   * `writeValue` may hand us a string, a null, or a range tuple; normalise
   * before anything reads it. Which coercion applies depends on the mode, so a
   * `showTime` control keeps its hours where a plain one strips them.
   */
  override writeValue(value: Date | GmDateRange | null): void {
    if (this.isRange()) {
      const [start, end] = Array.isArray(value) ? value : [null, null];
      super.writeValue([gmCoerceDate(start), gmCoerceDate(end)]);
      return;
    }
    super.writeValue(
      this.hasTime() ? gmCoerceDateTime(value) : gmCoerceDate(value),
    );
  }

  private formatValue(date: Date): string {
    if (this.timeOnly()) {
      return gmFormatTime(date, this.hourFormat());
    }
    const text = gmFormatDate(date, this.dateFormat());
    return this.hasTime()
      ? `${text} ${gmFormatTime(date, this.hourFormat())}`
      : text;
  }

  protected pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  // ── Day state, for the template ─────────────────────────────────────────

  protected isSelected(day: Date): boolean {
    if (this.isRange()) {
      const [start, end] = this.selectedRange();
      return gmIsSameDay(day, start) || (end !== null && gmIsSameDay(day, end));
    }
    return gmIsSameDay(day, this.selected());
  }

  /** The opening endpoint — only once there is a span to open. */
  protected isRangeStart(day: Date): boolean {
    return (
      this.isRange() &&
      this.rangeSpanEnd() !== null &&
      gmIsSameDay(day, this.selectedRange()[0])
    );
  }

  /** The closing endpoint, committed or previewed. */
  protected isRangeEnd(day: Date): boolean {
    return this.isRange() && gmIsSameDay(day, this.rangeSpanEnd());
  }

  /** Strictly between the endpoints; the ends carry their own state. */
  protected isInRange(day: Date): boolean {
    const [start] = this.selectedRange();
    const end = this.rangeSpanEnd();
    if (!this.isRange() || !start || !end) {
      return false;
    }
    const time = gmStartOfDay(day).getTime();
    return (
      time > gmStartOfDay(start).getTime() && time < gmStartOfDay(end).getTime()
    );
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

    // Open on the selection (a range's start), else today — clamped so focus
    // never starts on a day the range forbids.
    const anchor = this.isRange()
      ? this.selectedRange()[0] ?? gmToday()
      : this.selected() ?? gmToday();
    const start = gmClamp(anchor, this.minDate(), this.maxDate());
    this.focusedDate.set(start);
    this.viewMonth.set(start);

    this.overlayPanel.open(this.panel(), () => this.close());
    this.open.set(true);

    if (this.showCalendar()) {
      this.focusActiveDay();
    } else {
      this.focusFirstTimeControl();
    }
  }

  protected close(): void {
    this.overlayPanel.close();
    this.open.set(false);
    this.hoverDate.set(null);
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

  /** Time-only has no grid to focus, so the hour control takes it instead. */
  private focusFirstTimeControl(): void {
    requestAnimationFrame(() => {
      this.overlayPanel.panelElement
        ?.querySelector<HTMLElement>('.gm-datepicker__time-select')
        ?.focus();
    });
  }

  // ── Selection ───────────────────────────────────────────────────────────

  protected select(day: Date): void {
    if (this.isDisabledDay(day)) {
      return;
    }

    if (this.isRange()) {
      this.selectRangeDay(day);
      return;
    }

    // Picking a day keeps whatever time is already set, so the two controls do
    // not overwrite each other.
    this.commit(
      this.hasTime()
        ? gmWithTime(day, this.hour(), this.minute())
        : gmStartOfDay(day),
    );

    // With time controls on screen the interaction is not finished, so the
    // panel stays open for the hour and minute.
    if (!this.hasTime()) {
      this.close();
      this.focusTrigger();
    }
  }

  private selectRangeDay(day: Date): void {
    const [start, end] = this.selectedRange();
    const picked = gmStartOfDay(day);

    // Nothing started, or a finished range — either way, begin a new one.
    if (!start || end) {
      this.commit([picked, null]);
      return;
    }

    // Clicking before the start reads as "I meant this as the start" rather
    // than as an invalid range, so the two swap. Both ends have already passed
    // the min/max check, so the result is always inside the allowed span.
    this.commit(picked < start ? [picked, start] : [start, picked]);
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
    // Range mode keeps the tuple shape so the value stays predictable.
    this.commit(this.isRange() ? [null, null] : null);
    this.handleBlur();
    if (this.open()) {
      this.close();
    }
  }

  // ── Time selection ──────────────────────────────────────────────────────

  protected setHour(raw: string): void {
    const picked = Number(raw);
    this.commitTime(
      this.hourFormat() === 24 ? picked : this.to24Hour(picked, this.meridiem()),
      this.minute(),
    );
  }

  protected setMinute(raw: string): void {
    this.commitTime(this.hour(), Number(raw));
  }

  protected setMeridiem(raw: string): void {
    this.commitTime(this.to24Hour(this.displayHour(), raw), this.minute());
  }

  private to24Hour(displayHour: number, meridiem: string): number {
    const base = displayHour % 12;
    return meridiem === 'PM' ? base + 12 : base;
  }

  /**
   * Applies a time to the selected day, keeping it. With nothing selected yet
   * the time lands on today, so a `timeOnly` control produces a value from the
   * first interaction.
   */
  private commitTime(hours: number, minutes: number): void {
    this.commit(gmWithTime(this.selected() ?? gmToday(), hours, minutes));
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
   * Escape from anywhere in the panel — the time controls have no grid to
   * bubble through. Guarded on `open()`, so the grid handler below having
   * already closed the panel does not double-fire.
   */
  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.close();
      this.focusTrigger();
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
    // Keyboard movement previews the range too, so arrowing shows the span.
    this.hoverDate.set(clamped);
    this.focusActiveDay();
  }
}
