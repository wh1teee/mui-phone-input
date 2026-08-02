import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import {
  getMuiPhoneInputUtilityClass,
  type MuiPhoneInputOwnerState,
  muiPhoneInputClasses,
} from '../../packages/mui-phone-input/src';

describe('MuiPhoneInput MUI contract', () => {
  it('accepts default props, root/input overrides, and variants in the MUI theme', () => {
    const theme = createTheme({
      components: {
        MuiPhoneInput: {
          defaultProps: {
            fullWidth: true,
            label: 'Theme phone',
          },
          styleOverrides: {
            input: {
              fontVariantNumeric: 'tabular-nums',
            },
            root: {
              minWidth: 240,
            },
          },
          variants: [
            {
              props: { size: 'small' },
              style: { minHeight: 40 },
            },
          ],
        },
      },
    });

    expect(theme.components?.MuiPhoneInput?.defaultProps?.fullWidth).toBe(true);
    expect(theme.components?.MuiPhoneInput?.styleOverrides).toHaveProperty('root');
    expect(theme.components?.MuiPhoneInput?.styleOverrides).toHaveProperty('input');
    expect(theme.components?.MuiPhoneInput?.variants).toHaveLength(1);
  });

  it('exports stable utility classes', () => {
    expect(muiPhoneInputClasses.root).toBe('MuiPhoneInput-root');
    expect(muiPhoneInputClasses.input).toBe('MuiPhoneInput-input');
    expect(muiPhoneInputClasses.validationMessage).toBe(
      'MuiPhoneInput-validationMessage',
    );
    expect(muiPhoneInputClasses.countrySelector).toBe('MuiPhoneInput-countrySelector');
    expect(muiPhoneInputClasses.countrySelectorOption).toBe(
      'MuiPhoneInput-countrySelectorOption',
    );
    expect(getMuiPhoneInputUtilityClass('root')).toBe('MuiPhoneInput-root');
  });

  it('exports the computed owner-state contract', () => {
    const ownerState = {
      controlled: true,
      countryControlled: true,
      disabled: false,
      empty: false,
      error: false,
      numberingPlanKind: 'geographic',
      readOnly: false,
      required: true,
      selectedCountry: 'BY',
      validationStatus: 'valid',
    } satisfies MuiPhoneInputOwnerState;

    expect(ownerState.validationStatus).toBe('valid');
    expect(ownerState.numberingPlanKind).toBe('geographic');
  });
});
