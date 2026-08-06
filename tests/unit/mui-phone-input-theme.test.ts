import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import {
  getMuiPhoneInputUtilityClass,
  type MuiPhoneInputOwnerState,
  type PhoneCountrySelectorSlotProps,
  type PhoneCountrySelectorSlots,
  muiPhoneInputClasses,
} from '../../packages/mui-phone-input/src';

describe('MuiPhoneInput MUI contract', () => {
  it('accepts default props, root/input overrides, and variants in the MUI theme', () => {
    const selectorSlots = {
      option: 'li',
      searchInput: 'input',
    } satisfies PhoneCountrySelectorSlots;
    const selectorSlotProps = {
      option: (ownerState) => ({
        'data-country': ownerState.option.country,
      }),
      searchInput: { autoComplete: 'off' },
    } satisfies PhoneCountrySelectorSlotProps;
    const theme = createTheme({
      components: {
        MuiPhoneInput: {
          defaultProps: {
            fullWidth: true,
            label: 'Theme phone',
            slotProps: {
              countrySelector: {
                slotProps: selectorSlotProps,
                slots: selectorSlots,
              },
            },
          },
          styleOverrides: {
            countrySelectorCallingCode: {
              fontVariantNumeric: 'tabular-nums',
            },
            countrySelectorOptionLabel: {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            input: {
              fontVariantNumeric: 'tabular-nums',
            },
            extension: {
              minWidth: 80,
            },
            extensionInput: {
              fontVariantNumeric: 'tabular-nums',
            },
            extensionValidationMessage: {
              fontWeight: 500,
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
    expect(theme.components?.MuiPhoneInput?.styleOverrides).toHaveProperty('extension');
    expect(theme.components?.MuiPhoneInput?.styleOverrides).toHaveProperty(
      'extensionInput',
    );
    expect(theme.components?.MuiPhoneInput?.styleOverrides).toHaveProperty(
      'countrySelectorOptionLabel',
    );
    expect(theme.components?.MuiPhoneInput?.variants).toHaveLength(1);
  });

  it('exports stable utility classes', () => {
    expect(muiPhoneInputClasses.root).toBe('MuiPhoneInput-root');
    expect(muiPhoneInputClasses.input).toBe('MuiPhoneInput-input');
    expect(muiPhoneInputClasses.validationMessage).toBe(
      'MuiPhoneInput-validationMessage',
    );
    expect(muiPhoneInputClasses.extension).toBe('MuiPhoneInput-extension');
    expect(muiPhoneInputClasses.extensionInput).toBe('MuiPhoneInput-extensionInput');
    expect(muiPhoneInputClasses.extensionValidationMessage).toBe(
      'MuiPhoneInput-extensionValidationMessage',
    );
    expect(muiPhoneInputClasses.countrySelector).toBe('MuiPhoneInput-countrySelector');
    expect(muiPhoneInputClasses.countrySelectorOption).toBe(
      'MuiPhoneInput-countrySelectorOption',
    );
    expect(muiPhoneInputClasses.countrySelectorCallingCode).toBe(
      'MuiPhoneInput-countrySelectorCallingCode',
    );
    expect(muiPhoneInputClasses.countrySelectorOptionLabel).toBe(
      'MuiPhoneInput-countrySelectorOptionLabel',
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
      extensionControlled: true,
      extensionError: false,
      extensionPresent: true,
      extensionPresentation: 'separate',
      extensionRequired: false,
      numberingPlanKind: 'geographic',
      readOnly: false,
      required: true,
      selectedCountry: 'BY',
      validationStatus: 'valid',
    } satisfies MuiPhoneInputOwnerState;

    expect(ownerState.validationStatus).toBe('valid');
    expect(ownerState.numberingPlanKind).toBe('geographic');
    expect(ownerState.extensionPresentation).toBe('separate');
  });
});
