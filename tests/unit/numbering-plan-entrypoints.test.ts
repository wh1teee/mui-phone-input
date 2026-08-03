import { describe, expect, it } from 'vitest';

import * as client from '../../packages/mui-phone-input/src/index';
import * as server from '../../packages/mui-phone-input/src/server';

describe('numbering-plan entrypoint parity', () => {
  it.each([
    [undefined, 'CA'],
    ['+1', 'CA'],
    ['+12015550', 'US'],
    ['+12025550123', 'CA'],
    ['+7', 'CA'],
    ['+77071234567', 'CA'],
    ['+44', 'CA'],
    ['+442079460958', 'CA'],
    ['+375291234567', 'CA'],
    ['+80012345678', 'CA'],
    ['+358412345678', 'AX'],
    ['+35841234', 'AX'],
  ] as const)(
    'returns the same serializable resolution for %s with %s selected',
    (value, selectedCountry) => {
      const options = { selectedCountry };

      expect(client.resolveNumberingPlan(value, options)).toEqual(
        server.resolveNumberingPlan(value, options),
      );
    },
  );
});
