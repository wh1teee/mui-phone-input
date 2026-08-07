import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface MuiPhoneInputClasses {
  countrySelector: string;
  countrySelectorCallingCode: string;
  countrySelectorCloseButton: string;
  countrySelectorCountryCode: string;
  countrySelectorEmpty: string;
  countrySelectorFlag: string;
  countrySelectorGroup: string;
  countrySelectorGroupLabel: string;
  countrySelectorListbox: string;
  countrySelectorOption: string;
  countrySelectorOptionLabel: string;
  countrySelectorPopup: string;
  countrySelectorSearchInput: string;
  extension: string;
  extensionInput: string;
  extensionValidationMessage: string;
  root: string;
  input: string;
  validationMessage: string;
}

export type MuiPhoneInputClassKey = keyof MuiPhoneInputClasses;

export function getMuiPhoneInputUtilityClass(slot: string): string {
  return generateUtilityClass('MuiPhoneInput', slot);
}

export const muiPhoneInputClasses: MuiPhoneInputClasses = generateUtilityClasses(
  'MuiPhoneInput',
  [
    'root',
    'input',
    'validationMessage',
    'extension',
    'extensionInput',
    'extensionValidationMessage',
    'countrySelector',
    'countrySelectorCallingCode',
    'countrySelectorCloseButton',
    'countrySelectorCountryCode',
    'countrySelectorPopup',
    'countrySelectorSearchInput',
    'countrySelectorListbox',
    'countrySelectorOption',
    'countrySelectorOptionLabel',
    'countrySelectorGroup',
    'countrySelectorGroupLabel',
    'countrySelectorEmpty',
    'countrySelectorFlag',
  ],
);
