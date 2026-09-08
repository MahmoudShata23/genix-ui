/**
 * What a `gmOrderListItem` template receives.
 *
 * `$implicit` is `any` rather than `unknown` on purpose. A content template is
 * declared by the consumer, and nothing at that site tells the compiler what
 * `[items]` holds — so `unknown` would make `{{ item.name }}` an error in every
 * real usage.
 */
export interface GmOrderListItemContext {
  $implicit: any;
  /** Current position, so a row can show its own rank. */
  index: number;
}
