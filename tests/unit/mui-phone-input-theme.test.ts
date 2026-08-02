import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import {
  getMuiPhoneInputUtilityClass,
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
    expect(getMuiPhoneInputUtilityClass('root')).toBe('MuiPhoneInput-root');
  });
});
