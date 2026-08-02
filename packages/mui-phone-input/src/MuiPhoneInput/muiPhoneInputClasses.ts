import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface MuiPhoneInputClasses {
  root: string;
  input: string;
}

export type MuiPhoneInputClassKey = keyof MuiPhoneInputClasses;

export function getMuiPhoneInputUtilityClass(slot: string): string {
  return generateUtilityClass('MuiPhoneInput', slot);
}

export const muiPhoneInputClasses: MuiPhoneInputClasses = generateUtilityClasses(
  'MuiPhoneInput',
  ['root', 'input'],
);
