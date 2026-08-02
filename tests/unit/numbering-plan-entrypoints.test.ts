import { describe, expect, it } from 'vitest';

import * as client from '../../packages/mui-phone-input/src/index';
import * as server from '../../packages/mui-phone-input/src/server';

describe('numbering-plan entrypoint parity', () => {
  it.each([
    undefined,
    '+1',
    '+12025550123',
    '+7',
    '+77071234567',
    '+44',
    '+442079460958',
    '+375291234567',
    '+80012345678',
  ] as const)('returns the same serializable resolution for %s', (value) => {
    const options = { selectedCountry: 'CA' as const };

    expect(client.resolveNumberingPlan(value, options)).toEqual(
      server.resolveNumberingPlan(value, options),
    );
  });
});
