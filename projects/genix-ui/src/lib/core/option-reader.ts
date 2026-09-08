/* ==========================================================================
   Option reading
   --------------------------------------------------------------------------
   Every option-based control in the package addresses its options the same
   way: a primitive option is its own label and value, and an object option is
   read through `optionLabel` / `optionValue`. `GmDropdownBase` delegates here,
   so `gm-select-button` and `gm-autocomplete` share the behaviour rather than
   restating it.
   ========================================================================== */

/** Reads `key` off an object option; a primitive option is its own value. */
export function gmReadOption(option: unknown, key: string | undefined): unknown {
  if (!key || option === null || typeof option !== 'object') {
    return option;
  }
  return (option as Record<string, unknown>)[key];
}

/** Display text for an option, honouring `optionLabel`. */
export function gmOptionLabel(
  option: unknown,
  optionLabel: string | undefined,
): string {
  return String(gmReadOption(option, optionLabel) ?? '');
}

/** Form value for an option, honouring `optionValue`. */
export function gmOptionValue(
  option: unknown,
  optionValue: string | undefined,
): unknown {
  return optionValue ? gmReadOption(option, optionValue) : option;
}
