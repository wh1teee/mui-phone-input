'use client';

export * from './MuiPhoneInput';
export {
  type GeographicNumberingPlanResolution,
  type NonGeographicNumberingPlanResolution,
  type NumberingPlanResolution,
  type NumberingPlanResolutionOptions,
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
  assertPhoneValue,
  isPhoneValue,
  type PhoneValue,
  parsePhoneValue,
} from './phone-value';
