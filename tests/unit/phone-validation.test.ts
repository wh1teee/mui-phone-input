import { describe, expect, it, vi } from 'vitest';

import {
  formatPhoneValueForDisplay,
  validatePhoneValue,
} from '../../packages/mui-phone-input/src/phone-validation';

describe('validatePhoneValue', () => {
  it('distinguishes optional and required empty values', () => {
    expect(validatePhoneValue(undefined)).toEqual({
      accepted: true,
      isPossible: null,
      isValid: null,
      mode: 'possible',
      numberType: null,
      reason: 'empty',
      status: 'empty',
      value: undefined,
    });
    expect(validatePhoneValue(undefined, { required: true })).toEqual({
      accepted: false,
      isPossible: null,
      isValid: null,
      mode: 'possible',
      numberType: null,
      reason: 'required',
      status: 'empty',
      value: undefined,
    });
  });

  it('reports incomplete and structurally invalid drafts with typed reasons', () => {
    expect(validatePhoneValue('+')).toMatchObject({
      accepted: false,
      reason: 'no-digits',
      status: 'incomplete',
    });
    expect(validatePhoneValue('+1')).toMatchObject({
      accepted: false,
      reason: 'too-short',
      status: 'incomplete',
    });
    expect(validatePhoneValue('+999')).toMatchObject({
      accepted: false,
      reason: 'invalid-country-calling-code',
      status: 'invalid',
    });
    expect(validatePhoneValue('+120255501234')).toMatchObject({
      accepted: false,
      reason: 'too-long',
      status: 'invalid',
    });
  });

  it('accepts structurally possible numbers by default without claiming strict validity', () => {
    expect(validatePhoneValue('+441481123456')).toEqual({
      accepted: true,
      isPossible: true,
      isValid: false,
      mode: 'possible',
      numberType: null,
      reason: 'possible',
      status: 'possible',
      value: '+441481123456',
    });
  });

  it('makes strict validity an explicit policy', () => {
    expect(
      validatePhoneValue('+441481123456', { validationMode: 'valid' }),
    ).toMatchObject({
      accepted: false,
      mode: 'valid',
      reason: 'strict-validity-required',
      status: 'possible',
    });
    expect(validatePhoneValue('+375291234567', { validationMode: 'valid' })).toEqual({
      accepted: true,
      isPossible: true,
      isValid: true,
      mode: 'valid',
      numberType: 'MOBILE',
      reason: 'valid',
      status: 'valid',
      value: '+375291234567',
    });
  });

  it('requires an explicit allowed-type policy', () => {
    expect(() =>
      validatePhoneValue('+375291234567', {
        validationMode: 'possible-and-type',
      }),
    ).toThrow(TypeError);
    expect(
      validatePhoneValue('+375291234567', {
        allowedNumberTypes: ['MOBILE'],
        validationMode: 'possible-and-type',
      }),
    ).toMatchObject({
      accepted: true,
      numberType: 'MOBILE',
      reason: 'valid',
    });
    expect(
      validatePhoneValue('+375291234567', {
        allowedNumberTypes: ['FIXED_LINE'],
        validationMode: 'possible-and-type',
      }),
    ).toMatchObject({
      accepted: false,
      numberType: 'MOBILE',
      reason: 'disallowed-number-type',
      status: 'valid',
    });
    expect(
      validatePhoneValue('+441481123456', {
        allowedNumberTypes: ['FIXED_LINE'],
        validationMode: 'possible-and-type',
      }),
    ).toMatchObject({
      accepted: false,
      numberType: null,
      reason: 'unknown-number-type',
      status: 'possible',
    });
  });

  it('allows a custom acceptance strategy without changing structural authority', () => {
    const strategy = vi.fn(
      (context) => context.numberingPlan.kind === 'non-geographic',
    );

    expect(
      validatePhoneValue('+80012345678', { validationMode: strategy }),
    ).toMatchObject({
      accepted: true,
      mode: 'custom',
      numberType: 'TOLL_FREE',
      reason: 'custom-accepted',
      status: 'valid',
    });
    expect(strategy).toHaveBeenCalledWith(
      expect.objectContaining({
        isPossible: true,
        isValid: true,
        numberType: 'TOLL_FREE',
        numberingPlan: expect.objectContaining({ kind: 'non-geographic' }),
        status: 'valid',
        value: '+80012345678',
      }),
    );
    expect(
      validatePhoneValue('+375291234567', { validationMode: strategy }),
    ).toMatchObject({
      accepted: false,
      mode: 'custom',
      reason: 'custom-rejected',
      status: 'valid',
    });
  });

  it('rejects a custom strategy that does not return a boolean', () => {
    expect(() =>
      validatePhoneValue('+375291234567', {
        validationMode: (() => 'accepted') as never,
      }),
    ).toThrow(TypeError);
  });

  it('keeps every result serializable', () => {
    for (const result of [
      validatePhoneValue(undefined),
      validatePhoneValue('+1'),
      validatePhoneValue('+441481123456'),
      validatePhoneValue('+375291234567'),
      validatePhoneValue('+80012345678'),
    ]) {
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    }
  });
});

describe('formatPhoneValueForDisplay', () => {
  it.each([
    [undefined, ''],
    ['+', '+'],
    ['+37529', '+375 29'],
    ['+375291234567', '+375 29 123 45 67'],
    ['+80012345678', '+800 1234 5678'],
  ] as const)('formats %s without changing the Phone Value', (value, expected) => {
    expect(formatPhoneValueForDisplay(value)).toBe(expected);
  });
});
