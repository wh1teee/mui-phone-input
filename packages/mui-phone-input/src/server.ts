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
export { type PhoneMetadata, validatePhoneMetadata } from './phone-metadata';
export {
  assertPhoneValue,
  isPhoneValue,
  type PhoneValue,
  parsePhoneValue,
} from './phone-value';
