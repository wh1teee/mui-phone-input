import { describe, expect, expectTypeOf, it } from 'vitest';

import type { PhoneExtension } from '../../packages/mui-phone-input/src/phone-extension';
import type { PhoneValue } from '../../packages/mui-phone-input/src/phone-value';
import {
  createPhoneExtensionSchema,
  createPhoneFormSchema,
  createPhoneNumberTypeSchema,
  createPhonePossibleSchema,
  createPhoneSyntaxSchema,
  createPhoneValidSchema,
} from '../../packages/mui-phone-input/src/zod';

describe('Zod adapter', () => {
  it('keeps canonical Phone Value syntax distinct from possible-number acceptance', () => {
    const syntax = createPhoneSyntaxSchema();
    const possible = createPhonePossibleSchema();

    expect(syntax.parse('+441481123456')).toBe('+441481123456');
    expect(syntax.parse('+1')).toBe('+1');
    expect(() => syntax.parse(' +44 1481 123456 ')).toThrow();

    expect(possible.parse('+441481123456')).toBe('+441481123456');
    expect(() => possible.parse('+1')).toThrow();

    expectTypeOf<ReturnType<typeof syntax.parse>>().toEqualTypeOf<PhoneValue>();
    expectTypeOf<ReturnType<typeof possible.parse>>().toEqualTypeOf<PhoneValue>();
  });

  it('delegates strict validity to the existing validation authority', () => {
    const schema = createPhoneValidSchema();

    expect(schema.parse('+375291234567')).toBe('+375291234567');
    expect(() => schema.parse('+441481123456')).toThrow();
    expectTypeOf<ReturnType<typeof schema.parse>>().toEqualTypeOf<PhoneValue>();
  });

  it('delegates number-type restrictions to possible-and-type validation', () => {
    const mobile = createPhoneNumberTypeSchema(['MOBILE']);

    expect(mobile.parse('+375291234567')).toBe('+375291234567');
    expect(() => createPhoneNumberTypeSchema([])).toThrow(TypeError);
    expect(() =>
      createPhoneNumberTypeSchema(['FIXED_LINE']).parse('+375291234567'),
    ).toThrow();
    expectTypeOf<ReturnType<typeof mobile.parse>>().toEqualTypeOf<PhoneValue>();
  });

  it('keeps extension syntax canonical while applying required and max-length policy', () => {
    const optional = createPhoneExtensionSchema();
    const required = createPhoneExtensionSchema({ maxLength: 4, required: true });

    expect(optional.parse(undefined)).toBeUndefined();
    expect(required.parse('42')).toBe('42');
    expect(() => required.parse(undefined)).toThrow();
    expect(() => required.parse('12345')).toThrow();
    expect(() => required.parse('1 2')).toThrow();
    expect(() => createPhoneExtensionSchema({ maxLength: 0 })).toThrow(TypeError);
    expectTypeOf<ReturnType<typeof required.parse>>().toEqualTypeOf<PhoneExtension>();
  });

  it('builds a combined possible-phone and extension form shape', () => {
    const schema = createPhoneFormSchema({
      extension: { maxLength: 4 },
      phone: { required: true },
    });

    expect(schema.parse({ extension: '42', phone: '+375291234567' })).toEqual({
      extension: '42',
      phone: '+375291234567',
    });
    expect(() => schema.parse({ extension: '12345', phone: undefined })).toThrow();
  });

  it('supports custom error text without changing validation semantics', () => {
    const schema = createPhonePossibleSchema({
      message: 'Use a possible phone number',
    });
    const result = schema.safeParse('+1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Use a possible phone number');
    }
  });
});
