import type { GmSeverity, GmSize } from '../core/types';

/**
 * Semantic colour of a button. The library-wide `GmSeverity` — kept as a named
 * alias so `<gm-button severity="…">` stays self-documenting at call sites.
 */
export type GmButtonSeverity = GmSeverity;

/**
 * How the severity colour is applied:
 * - `filled`   — solid surface (the default call-to-action)
 * - `outlined` — transparent surface, coloured border and text
 * - `text`     — no surface, no border; tint appears on hover only
 */
export type GmButtonVariant = 'filled' | 'outlined' | 'text';

/** Size step. Maps to the design system's type/spacing scale. */
export type GmButtonSize = GmSize;

/** Which side of the label the icon sits on. */
export type GmButtonIconPosition = 'left' | 'right';

/** Native `type` attribute values relevant to a button. */
export type GmButtonType = 'button' | 'submit' | 'reset';
