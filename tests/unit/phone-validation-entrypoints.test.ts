import { describe, expect, it } from 'vitest';

import * as client from '../../packages/mui-phone-input/src/index';
import * as server from '../../packages/mui-phone-input/src/server';

describe('phone-validation entrypoint parity', () => {
  it.each([
    undefined,
    '+',
    '+1',
    '+441481123456',
    '+375291234567',
    '+80012345678',
  ] as const)('returns the same validation and formatting for %s', (value) => {
    expect(client.validatePhoneValue(value)).toEqual(server.validatePhoneValue(value));
    expect(client.formatPhoneValueForDisplay(value)).toBe(
      server.formatPhoneValueForDisplay(value),
    );
  });
});
