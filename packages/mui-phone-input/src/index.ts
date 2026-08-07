'use client';

import './MuiPhoneInput/muiPhoneInputThemeAugmentation';

export {
  type CreatePhoneCountryOptionsParameters,
  createPhoneCountryOptions,
  type FilterPhoneCountryOptionsParameters,
  filterPhoneCountryOptions,
  type PhoneCountryNameResolver,
  type PhoneCountryOption,
  type PhoneCountrySelectionAppliedReason,
  type PhoneCountrySelectionAppliedResult,
  type PhoneCountrySelectionConflictReason,
  type PhoneCountrySelectionConflictResult,
  type PhoneCountrySelectionOptions,
  type PhoneCountrySelectionResult,
  resolvePhoneCountrySelection,
  selectPhoneCountryValue,
} from './country-selector';
export * from './MuiPhoneInput';
export {
  type PhoneCountryFlagProps,
  type PhoneExternalFlagFallback,
  type PhoneExternalFlagOptions,
  type PhoneFlagMode,
  type PhoneFlagPlacement,
  type PhoneFlagProvider,
  type PhoneFlagProviderContext,
} from './flags';
export {
  type GeographicNumberingPlanResolution,
  type NationalPhoneValueOptions,
  type NonGeographicNumberingPlanResolution,
  type NumberingPlanResolution,
  type NumberingPlanResolutionOptions,
  parseNationalPhoneValue,
  resolveNumberingPlan,
  type UnresolvedNumberingPlanResolution,
} from './numbering-plan';
export {
  type PhoneCountrySelectorClasses,
  type PhoneCountrySelectorGroupOwnerState,
  type PhoneCountrySelectorFlagOwnerState,
  type PhoneCountrySelectorIndicatorOwnerState,
  type PhoneCountrySelectorMessages,
  type PhoneCountrySelectorMode,
  type PhoneCountrySelectorOptionOwnerState,
  type PhoneCountrySelectorOwnerState,
  type PhoneCountrySelectorPresentation,
  type PhoneCountrySelectorSlotProps,
  type PhoneCountrySelectorSlots,
  PhoneInputCountrySelector,
  type PhoneInputCountrySelectorProps,
} from './PhoneInputCountrySelector';
export {
  PhoneInputExtensionInput,
  type PhoneInputExtensionInputProps,
  PhoneInputInput,
  type PhoneInputInputProps,
  PhoneInputProvider,
  type PhoneInputProviderProps,
  PhoneInputRoot,
  type PhoneInputRootProps,
  PhoneInputValidationMessage,
  type PhoneInputValidationMessageProps,
  usePhoneInputContext,
} from './PhoneInputPrimitives';
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
export {
  assertPhoneExtension,
  isPhoneExtension,
  type ParsedRfc3966,
  type ParsePhoneExtensionOptions,
  type PhoneExtension,
  parsePhoneExtension,
  parseRfc3966,
  serializeRfc3966,
} from './phone-extension';
export {
  type BuiltInPhoneValidationMode,
  formatPhoneValueForDisplay,
  type PhoneValidationMode,
  type PhoneValidationOptions,
  type PhoneValidationReason,
  type PhoneValidationResult,
  type PhoneValidationStatus,
  type PhoneValidationStrategy,
  type PhoneValidationStrategyContext,
  validatePhoneValue,
} from './phone-validation';
export { type PhoneMetadata, validatePhoneMetadata } from './phone-metadata';
export {
  assertPhoneValue,
  isPhoneValue,
  type PhoneValue,
  parsePhoneValue,
} from './phone-value';
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
  type PhoneInputResolvedInputProps,
  type PhoneInputResolvedExtensionInputProps,
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
