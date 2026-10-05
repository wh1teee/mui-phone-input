'use client';

export {
  type CreatePhoneCountryOptionsParameters,
  createPhoneCountryOptions,
  type FilterPhoneCountryOptionsParameters,
  filterPhoneCountryOptions,
  getPopularPhoneCountries,
  type PhoneCountryNameResolver,
  type PhoneCountryOption,
  type PhoneCountrySelectionAppliedReason,
  type PhoneCountrySelectionAppliedResult,
  type PhoneCountrySelectionOptions,
  type PhoneCountrySelectionResult,
  type PopularPhoneCountriesParameters,
  resolvePhoneCountrySelection,
  selectPhoneCountryValue,
} from './country-selector';
export type { PhoneCountrySelectorMessages } from './country-selector-messages';
// Shared engine types live here so renderer-independent consumers never need
// the MUI root declaration graph. The legacy index is not re-exported: its MUI
// runtime and theme augmentation stay outside this entrypoint.
export {
  type DisplayMask,
  type FormatStrategy,
  type FormatStrategyContext,
  type FormatStrategyResult,
  formatPhoneInputPresentation,
  type LogicalCaretMapping,
  type PhoneInputDisplayMode,
  type PhoneInputFormatOptions,
  type PhoneInputPresentation,
} from './phone-formatting';
export * from './server';
export {
  type PhoneCountryChangeDetails,
  type PhoneCountryChangeReason,
  type PhoneExtensionChangeDetails,
  type PhoneExtensionChangeReason,
  type PhoneExtensionInputExternalProps,
  type PhoneInputActions,
  type PhoneInputChangeDetails,
  type PhoneInputChangeReason,
  type PhoneInputInputExternalProps,
  type PhoneInputNumberingPlanState,
  type PhoneInputResolvedExtensionInputProps,
  type PhoneInputResolvedInputProps,
  type PhoneInputResolvedRootProps,
  type PhoneInputResolvedValidationMessageProps,
  type PhoneInputRootExternalProps,
  type PhoneInputState,
  type PhoneInputValidationMessageExternalProps,
  type PhoneInputValidationState,
  type PhoneValidationDisplay,
  type UsePhoneInputParameters,
  type UsePhoneInputReturn,
  usePhoneInput,
} from './usePhoneInput';
