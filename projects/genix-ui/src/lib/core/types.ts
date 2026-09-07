/**
 * Semantic colour shared by every component that tints itself (button, badge,
 * chip). Each value maps to the design system's semantic palette, so a severity
 * always resolves to `--gm-*` tokens rather than a literal.
 */
export type GmSeverity =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'contrast';

/** Size step shared across the library. */
export type GmSize = 'small' | 'medium' | 'large';
