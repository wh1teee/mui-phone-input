import {
  parseRfc3966,
  parseNationalPhoneValue,
  resolveNumberingPlan,
  serializeRfc3966,
  validatePhoneValue,
} from '@wh1teee/mui-phone-input/server';
import validateCustomMetadata from '@wh1teee/mui-phone-input/metadata/custom';
import minMetadata from '@wh1teee/mui-phone-input/metadata/min';
import mobileMetadata from '@wh1teee/mui-phone-input/metadata/mobile';
import {
  createPhoneExtensionSchema,
  createPhoneFormSchema,
  createPhoneNumberTypeSchema,
  createPhonePossibleSchema,
  createPhoneValidSchema,
} from '@wh1teee/mui-phone-input/zod';

export function compiledServerExample(input: string) {
  const phone = parseNationalPhoneValue(input, 'US');
  if (phone === null) {
    return { accepted: false as const };
  }

  return {
    accepted: validatePhoneValue(phone).accepted,
    plan: resolveNumberingPlan(phone, { selectedCountry: 'US' }),
    rfc3966: serializeRfc3966(phone, '42'),
  };
}

export const compiledZodExamples = {
  extension: createPhoneExtensionSchema({ maxLength: 8 }),
  form: createPhoneFormSchema({ extension: { maxLength: 8 } }),
  mobile: createPhoneNumberTypeSchema(['MOBILE', 'FIXED_LINE_OR_MOBILE']),
  possible: createPhonePossibleSchema(),
  valid: createPhoneValidSchema(),
};

export const compiledMetadataExamples = {
  min: validatePhoneValue('+12025550123', { metadata: minMetadata }),
  mobile: validatePhoneValue('+12025550123', { metadata: mobileMetadata }),
};

export function compiledCustomMetadata(input: unknown) {
  return validateCustomMetadata(input);
}

export function compiledRfc3966RoundTrip() {
  return parseRfc3966(serializeRfc3966('+12025550123', '42'));
}
