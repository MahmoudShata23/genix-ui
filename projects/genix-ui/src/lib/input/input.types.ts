/**
 * `type` values `gm-input` accepts. Restricted to the text-entry types the app
 * actually uses — a date or checkbox belongs in its own component.
 */
export type GmInputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search';
