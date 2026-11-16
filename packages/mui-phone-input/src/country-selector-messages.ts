/** UI-independent messages shared by renderer adapters and locale packs. */
export interface PhoneCountrySelectorMessages {
  allCountries: string;
  close: string;
  dialogTitle: string;
  noOptions: string;
  preferredCountries: string;
  searchLabel: string;
  selectCountry: string;
  /**
   * Accessible name of the country trigger while a country is selected.
   * Placeholders: `{label}` (the trigger's `aria-label`, or `selectCountry`),
   * `{countryName}`, `{country}` (ISO code) and `{callingCode}` (with `+`).
   * Optional so existing custom message sets stay valid; every shipped locale
   * provides it, and the English template is used when it is missing.
   */
  triggerLabel?: string;
}
