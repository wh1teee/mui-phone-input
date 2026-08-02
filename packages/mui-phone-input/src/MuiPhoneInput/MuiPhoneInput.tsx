'use client';

import { useDefaultProps } from '@mui/material/DefaultPropsProvider';
import InputAdornment from '@mui/material/InputAdornment';
import {
  type ComponentsOverrides,
  type ComponentsVariants,
  styled,
} from '@mui/material/styles';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { mergeSlotProps } from '@mui/material/utils';
import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import {
  type ElementType,
  type ReactNode,
  type Ref,
  useCallback,
  useMemo,
} from 'react';

import {
  type PhoneCountrySelectorClasses,
  PhoneInputCountrySelector,
  type PhoneInputCountrySelectorProps,
} from '../PhoneInputCountrySelector';
import { PhoneInputProvider } from '../PhoneInputPrimitives';
import type { PhoneValidationMode } from '../phone-validation';
import type { PhoneValue } from '../phone-value';
import {
  type PhoneCountryChangeDetails,
  type PhoneCountryChangeReason,
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
  PhoneCountryChangeReason,
  PhoneInputChangeDetails,
  PhoneInputChangeReason,
  PhoneInputNumberingPlanState,
  PhoneInputValidationState,
  PhoneValidationDisplay,
};

export type MuiPhoneInputSlots = NonNullable<TextFieldProps['slots']> & {
  countrySelector?: ElementType<PhoneInputCountrySelectorProps>;
};

export type MuiPhoneInputSlotProps = NonNullable<TextFieldProps['slotProps']> & {
  countrySelector?: PhoneInputCountrySelectorProps;
};

export type MuiPhoneInputProps = Omit<
  TextFieldProps,
  | 'classes'
  | 'defaultValue'
  | 'inputRef'
  | 'onChange'
  | 'ref'
  | 'slotProps'
  | 'slots'
  | 'value'
> & {
  allowedNumberTypes?: readonly PhoneNumberType[];
  classes?: Partial<MuiPhoneInputClasses>;
  defaultCountry?: CountryCode | null;
  defaultValue?: PhoneValue;
  disableCountrySelector?: boolean;
  onChange?: (value: PhoneValue, details: PhoneInputChangeDetails) => void;
  onCountryChange?: (
    country: CountryCode | null,
    details: PhoneCountryChangeDetails,
  ) => void;
  readOnly?: boolean;
  ref?: Ref<HTMLInputElement>;
  selectedCountry?: CountryCode | null;
  slotProps?: MuiPhoneInputSlotProps;
  slots?: MuiPhoneInputSlots;
  validationDisplay?: PhoneValidationDisplay;
  validationMessage?:
    | ReactNode
    | ((validation: PhoneInputValidationState) => ReactNode);
  validationMode?: PhoneValidationMode;
  value?: PhoneValue;
};

export interface MuiPhoneInputOwnerState {
  controlled: boolean;
  countryControlled: boolean;
  disabled: boolean;
  empty: boolean;
  error: boolean;
  numberingPlanKind: PhoneInputNumberingPlanState['kind'];
  readOnly: boolean;
  required: boolean;
  selectedCountry: CountryCode | null;
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

const COUNTRY_SELECTOR_CLASS_KEYS = [
  'countrySelector',
  'countrySelectorEmpty',
  'countrySelectorGroup',
  'countrySelectorGroupLabel',
  'countrySelectorListbox',
  'countrySelectorOption',
  'countrySelectorPopup',
  'countrySelectorSearchInput',
] as const satisfies readonly (keyof PhoneCountrySelectorClasses)[];

function mergeCountrySelectorClasses(
  componentClasses: Partial<PhoneCountrySelectorClasses> | undefined,
  slotClasses: Partial<PhoneCountrySelectorClasses> | undefined,
): Partial<PhoneCountrySelectorClasses> {
  const resolved: Partial<PhoneCountrySelectorClasses> = {};

  for (const key of COUNTRY_SELECTOR_CLASS_KEYS) {
    const merged = joinClassNames(componentClasses?.[key], slotClasses?.[key]);
    if (merged) {
      Object.assign(resolved, { [key]: merged });
    }
  }

  return resolved;
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
    countrySelector:
      joinClassNames(muiPhoneInputClasses.countrySelector, classes?.countrySelector) ??
      '',
    countrySelectorEmpty:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorEmpty,
        classes?.countrySelectorEmpty,
      ) ?? '',
    countrySelectorGroup:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorGroup,
        classes?.countrySelectorGroup,
      ) ?? '',
    countrySelectorGroupLabel:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorGroupLabel,
        classes?.countrySelectorGroupLabel,
      ) ?? '',
    countrySelectorListbox:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorListbox,
        classes?.countrySelectorListbox,
      ) ?? '',
    countrySelectorOption:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorOption,
        classes?.countrySelectorOption,
      ) ?? '',
    countrySelectorPopup:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorPopup,
        classes?.countrySelectorPopup,
      ) ?? '',
    countrySelectorSearchInput:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorSearchInput,
        classes?.countrySelectorSearchInput,
      ) ?? '',
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
    defaultCountry,
    disableCountrySelector = false,
    error = false,
    helperText,
    id,
    onChange,
    onCountryChange,
    readOnly = false,
    ref: inputRefProp,
    required = false,
    selectedCountry,
    slotProps,
    slots,
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
    ...(Object.hasOwn(props, 'defaultCountry') ? { defaultCountry } : {}),
    ...(Object.hasOwn(props, 'value') ? { value } : {}),
    ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    ...(id === undefined ? {} : { id }),
    ...(onChange === undefined ? {} : { onChange }),
    ...(onCountryChange === undefined ? {} : { onCountryChange }),
    ...(Object.hasOwn(props, 'selectedCountry') ? { selectedCountry } : {}),
    ...(validationMessage === undefined ? {} : { validationMessage }),
  });
  const classes = useUtilityClasses(classesProp);
  const ownerState: MuiPhoneInputOwnerState = {
    controlled: phone.state.controlled,
    countryControlled: phone.state.countryControlled,
    disabled,
    empty: phone.state.empty,
    error: phone.state.error,
    numberingPlanKind: phone.state.numberingPlan.kind,
    readOnly,
    required,
    selectedCountry: phone.state.selectedCountry,
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
  const CountrySelectorSlot = slots?.countrySelector ?? PhoneInputCountrySelector;
  const countrySelectorClasses = useMemo(
    () => mergeCountrySelectorClasses(classesProp, slotProps?.countrySelector?.classes),
    [classesProp, slotProps?.countrySelector?.classes],
  );
  const countrySelector = disableCountrySelector ? null : (
    <InputAdornment position="start">
      <CountrySelectorSlot
        {...slotProps?.countrySelector}
        classes={countrySelectorClasses}
        className={joinClassNames(
          classes.countrySelector,
          slotProps?.countrySelector?.className,
        )}
      />
    </InputAdornment>
  );
  const inputSlotProps = useMemo(
    () => mergeSlotProps(slotProps?.input, { startAdornment: countrySelector }),
    [countrySelector, slotProps?.input],
  );
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

  const { countrySelector: _countrySelectorSlotProps, ...textFieldSlotProps } =
    slotProps ?? {};
  const { countrySelector: _countrySelectorSlot, ...textFieldSlots } = slots ?? {};

  return (
    <PhoneInputProvider value={phone}>
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
          ...textFieldSlotProps,
          formHelperText: formHelperTextSlotProps,
          htmlInput: htmlInputSlotProps,
          input: inputSlotProps,
        }}
        slots={textFieldSlots}
        value={phone.state.displayValue}
      />
    </PhoneInputProvider>
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
