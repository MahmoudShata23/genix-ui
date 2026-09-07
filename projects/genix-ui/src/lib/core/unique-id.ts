let sequence = 0;

/**
 * Monotonic per-document id, used when a caller does not pass an explicit
 * `inputId`. Every field still needs a stable id so its `<label for>` and
 * `aria-describedby` can point at it.
 */
export function gmUniqueId(prefix: string): string {
  return `${prefix}-${++sequence}`;
}
