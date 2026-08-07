import { z } from 'zod';

import {
  isPhoneExtension,
  type PhoneExtension,
  parsePhoneExtension,
} from './phone-extension';
import { type PhoneValidationOptions, validatePhoneValue } from './phone-validation';
import { isPhoneValue, type PhoneValue } from './phone-value';

export interface PhoneZodSchemaOptions
  extends Omit<PhoneValidationOptions, 'allowedNumberTypes' | 'validationMode'> {
  message?: string;
}

export interface PhoneExtensionZodSchemaOptions {
  maxLength?: number;
  message?: string;
  required?: boolean;
}

export interface PhoneFormZodSchemaOptions {
  extension?: PhoneExtensionZodSchemaOptions;
  phone?: PhoneZodSchemaOptions;
}

const PHONE_SYNTAX_MESSAGE =
  'Expected a canonical Phone Value: undefined or a leading plus followed only by digits.';
const PHONE_ACCEPTANCE_MESSAGE =
  'Phone number is not accepted by the configured policy.';
const PHONE_EXTENSION_MESSAGE =
  'Expected a canonical Phone Extension that satisfies the configured policy.';

export function createPhoneSyntaxSchema(
  message: string = PHONE_SYNTAX_MESSAGE,
): z.ZodType<PhoneValue> {
  return z.custom<PhoneValue>(isPhoneValue, { error: message });
}

export function createPhonePossibleSchema(
  options: PhoneZodSchemaOptions = {},
): z.ZodType<PhoneValue> {
  const { message = PHONE_ACCEPTANCE_MESSAGE, ...validationOptions } = options;

  return createPhoneSyntaxSchema().refine(
    (value) =>
      validatePhoneValue(value, {
        ...validationOptions,
        validationMode: 'possible',
      }).accepted,
    { message },
  );
}

export function createPhoneValidSchema(
  options: PhoneZodSchemaOptions = {},
): z.ZodType<PhoneValue> {
  const { message = PHONE_ACCEPTANCE_MESSAGE, ...validationOptions } = options;

  return createPhoneSyntaxSchema().refine(
    (value) =>
      validatePhoneValue(value, {
        ...validationOptions,
        validationMode: 'valid',
      }).accepted,
    { message },
  );
}

export function createPhoneNumberTypeSchema(
  allowedNumberTypes: NonNullable<PhoneValidationOptions['allowedNumberTypes']>,
  options: PhoneZodSchemaOptions = {},
): z.ZodType<PhoneValue> {
  const { message = PHONE_ACCEPTANCE_MESSAGE, ...validationOptions } = options;
  const validationPolicy = {
    ...validationOptions,
    allowedNumberTypes,
    validationMode: 'possible-and-type' as const,
  };

  validatePhoneValue(undefined, validationPolicy);

  return createPhoneSyntaxSchema().refine(
    (value) => validatePhoneValue(value, validationPolicy).accepted,
    { message },
  );
}

export function createPhoneExtensionSchema(
  options: PhoneExtensionZodSchemaOptions = {},
): z.ZodType<PhoneExtension> {
  const { maxLength, message = PHONE_EXTENSION_MESSAGE, required = false } = options;
  const parseOptions = maxLength === undefined ? {} : { maxLength };

  parsePhoneExtension(undefined, parseOptions);

  return z.custom<PhoneExtension>(isPhoneExtension, { error: message }).refine(
    (value) => {
      if (value === undefined) {
        return !required;
      }

      return parsePhoneExtension(value, parseOptions) === value;
    },
    { message },
  );
}

export function createPhoneFormSchema(
  options: PhoneFormZodSchemaOptions = {},
): z.ZodObject<{
  extension: z.ZodType<PhoneExtension>;
  phone: z.ZodType<PhoneValue>;
}> {
  return z.object({
    extension: createPhoneExtensionSchema(options.extension),
    phone: createPhonePossibleSchema(options.phone),
  });
}
