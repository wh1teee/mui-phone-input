'use client';

import { useDefaultProps } from '@mui/material/DefaultPropsProvider';
import {
  type ComponentsOverrides,
  type ComponentsVariants,
  styled,
} from '@mui/material/styles';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { mergeSlotProps } from '@mui/material/utils';
import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import { type ReactNode, type Ref, useCallback, useMemo } from 'react';

import type { PhoneValidationMode } from '../phone-validation';
import type { PhoneValue } from '../phone-value';
import {
  type PhoneInputChangeDetails,
  type PhoneInputChangeReason,
  type PhoneInputNumberingPlanState,
  type PhoneInputValidationState,
  type PhoneValidationDisplay,
  useMuiPhoneInput,
} from '../usePhoneInput';
import {
  getMuiPhoneInputUtilityClass,
  type MuiPhoneInputClasses,
  type MuiPhoneInputClassKey,
  muiPhoneInputClasses,
} from './muiPhoneInputClasses';

export type {
  PhoneInputChangeDetails,
  PhoneInputChangeReason,
  PhoneInputNumberingPlanState,
  PhoneInputValidationState,
  PhoneValidationDisplay,
};

export type MuiPhoneInputProps = Omit<
  TextFieldProps,
  'classes' | 'defaultValue' | 'inputRef' | 'onChange' | 'ref' | 'value'
> & {
  allowedNumberTypes?: readonly PhoneNumberType[];
  classes?: Partial<MuiPhoneInputClasses>;
  defaultValue?: PhoneValue;
  onChange?: (value: PhoneValue, details: PhoneInputChangeDetails) => void;
  readOnly?: boolean;
  ref?: Ref<HTMLInputElement>;
  selectedCountry?: CountryCode | null;
  validationDisplay?: PhoneValidationDisplay;
  validationMessage?:
    | ReactNode
    | ((validation: PhoneInputValidationState) => ReactNode);
  validationMode?: PhoneValidationMode;
  value?: PhoneValue;
};

export interface MuiPhoneInputOwnerState {
  controlled: boolean;
  disabled: boolean;
  empty: boolean;
  error: boolean;
  numberingPlanKind: PhoneInputNumberingPlanState['kind'];
  readOnly: boolean;
  required: boolean;
  validationStatus: PhoneInputValidationState['status'];
}

const MuiPhoneInputRoot = styled(TextField, {
  name: 'MuiPhoneInput',
  slot: 'Root',
  overridesResolver: (_props, styles) => [
    styles.root,
    styles.input && {
      [`& .${muiPhoneInputClasses.input}`]: styles.input,
    },
    styles.validationMessage && {
      [`& .${muiPhoneInputClasses.validationMessage}`]: styles.validationMessage,
    },
  ],
})<{ ownerState: MuiPhoneInputOwnerState }>({});

function joinClassNames(...values: Array<string | undefined>): string | undefined {
  const className = values.filter(Boolean).join(' ');
  return className || undefined;
}

function assignInputRef(
  ref: Ref<HTMLInputElement> | undefined,
  input: HTMLInputElement | null,
): void {
  if (typeof ref === 'function') {
    ref(input);
  } else if (ref) {
    ref.current = input;
  }
}

function useUtilityClasses(
  classes: Partial<MuiPhoneInputClasses> | undefined,
): MuiPhoneInputClasses {
  return {
    input: joinClassNames(muiPhoneInputClasses.input, classes?.input) ?? '',
    root: joinClassNames(muiPhoneInputClasses.root, classes?.root) ?? '',
    validationMessage:
      joinClassNames(
        muiPhoneInputClasses.validationMessage,
        classes?.validationMessage,
      ) ?? '',
  };
}

export function MuiPhoneInput(inProps: MuiPhoneInputProps): ReactNode {
  const props = useDefaultProps({ name: 'MuiPhoneInput', props: inProps });
  const {
    allowedNumberTypes,
    autoComplete,
    classes: classesProp,
    className,
    defaultValue,
    disabled = false,
    error = false,
    helperText,
    id,
    onChange,
    readOnly = false,
    ref: inputRefProp,
    required = false,
    selectedCountry,
    slotProps,
    validationDisplay = 'blur',
    validationMessage,
    validationMode = 'possible',
    value,
    ...other
  } = props;
  const phone = useMuiPhoneInput({
    disabled,
    error,
    readOnly,
    required,
    validationDisplay,
    validationMode,
    ...(Object.hasOwn(props, 'defaultValue') ? { defaultValue } : {}),
    ...(Object.hasOwn(props, 'value') ? { value } : {}),
    ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    ...(id === undefined ? {} : { id }),
    ...(onChange === undefined ? {} : { onChange }),
    ...(selectedCountry == null ? {} : { selectedCountry }),
    ...(validationMessage === undefined ? {} : { validationMessage }),
  });
  const classes = useUtilityClasses(classesProp);
  const ownerState: MuiPhoneInputOwnerState = {
    controlled: phone.state.controlled,
    disabled,
    empty: phone.state.empty,
    error: phone.state.error,
    numberingPlanKind: phone.state.numberingPlan.kind,
    readOnly,
    required,
    validationStatus: phone.state.validation.status,
  };
  const setInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      phone.setInputRef(input);
      assignInputRef(inputRefProp, input);
    },
    [inputRefProp, phone.setInputRef],
  );
  const htmlInputSlotProps = useMemo(() => {
    const preparedInputProps = phone.getInputProps({
      className: classes.input,
      ...(autoComplete === undefined ? {} : { autoComplete }),
    });
    const { ref: _preparedRef, ...preparedWithoutRef } = preparedInputProps;

    return mergeSlotProps(slotProps?.htmlInput, preparedWithoutRef);
  }, [autoComplete, classes.input, phone, slotProps?.htmlInput]);
  const formHelperTextSlotProps = useMemo(
    () =>
      mergeSlotProps(slotProps?.formHelperText, {
        'aria-live': 'polite',
        className: classes.validationMessage,
        id: phone.state.validationMessageId,
      }),
    [
      classes.validationMessage,
      phone.state.validationMessageId,
      slotProps?.formHelperText,
    ],
  );
  const resolvedHelperText =
    helperText !== undefined
      ? helperText
      : phone.state.validationError
        ? phone.state.validationMessage
        : undefined;

  return (
    <MuiPhoneInputRoot
      {...other}
      className={joinClassNames(classes.root, className)}
      disabled={disabled}
      error={phone.state.error}
      helperText={resolvedHelperText}
      id={phone.state.inputId}
      inputRef={setInputRef}
      ownerState={ownerState}
      required={required}
      slotProps={{
        ...slotProps,
        formHelperText: formHelperTextSlotProps,
        htmlInput: htmlInputSlotProps,
      }}
      value={phone.state.displayValue}
    />
  );
}

declare module '@mui/material/styles' {
  interface ComponentsPropsList {
    MuiPhoneInput: MuiPhoneInputProps;
  }

  interface ComponentNameToClassKey {
    MuiPhoneInput: MuiPhoneInputClassKey;
  }

  interface Components<Theme = unknown> {
    MuiPhoneInput?: {
      defaultProps?: ComponentsPropsList['MuiPhoneInput'];
      styleOverrides?: ComponentsOverrides<Theme>['MuiPhoneInput'];
      variants?: ComponentsVariants<Theme>['MuiPhoneInput'];
    };
  }
}

export { getMuiPhoneInputUtilityClass, muiPhoneInputClasses };
