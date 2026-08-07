'use client';

import { useDefaultProps } from '@mui/material/DefaultPropsProvider';
import InputAdornment from '@mui/material/InputAdornment';
import { styled } from '@mui/material/styles';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { mergeSlotProps, useForkRef } from '@mui/material/utils';
import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import { type ElementType, type ReactNode, type Ref, useMemo } from 'react';

import type { PhoneCountrySelectionResult } from '../country-selector';
import type { PhoneExtension } from '../phone-extension';
import {
  type PhoneCountrySelectorClasses,
  PhoneInputCountrySelector,
  type PhoneInputCountrySelectorProps,
} from '../PhoneInputCountrySelector';
import { PhoneInputProvider } from '../PhoneInputPrimitives';
import type { PhoneMetadata } from '../phone-metadata';
import type {
  DisplayMask,
  FormatStrategy,
  PhoneInputDisplayMode,
} from '../phone-formatting';
import type { PhoneValidationMode } from '../phone-validation';
import type { PhoneValue } from '../phone-value';
import {
  type PhoneCountryChangeDetails,
  type PhoneCountryChangeReason,
  type PhoneExtensionChangeDetails,
  type PhoneExtensionInputExternalProps,
  type PhoneInputChangeDetails,
  type PhoneInputChangeReason,
  type PhoneInputInputExternalProps,
  type PhoneInputNumberingPlanState,
  type PhoneInputValidationState,
  type PhoneInputResolvedExtensionInputProps,
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

export type PhoneExtensionPresentation = 'none' | 'separate' | 'inline' | 'custom';

export interface MuiPhoneInputExtensionRenderContext {
  inputProps: PhoneInputResolvedExtensionInputProps;
  ownerState: MuiPhoneInputOwnerState;
}

export type MuiPhoneInputExtensionSlotProps = Omit<
  TextFieldProps,
  | 'defaultValue'
  | 'error'
  | 'inputRef'
  | 'onChange'
  | 'required'
  | 'slotProps'
  | 'value'
> & {
  htmlInput?: PhoneExtensionInputExternalProps;
  slotProps?: Omit<NonNullable<TextFieldProps['slotProps']>, 'htmlInput'>;
};

export type MuiPhoneInputExtensionSlotComponentProps = TextFieldProps & {
  ownerState: MuiPhoneInputOwnerState;
};

export type MuiPhoneInputSlots = NonNullable<TextFieldProps['slots']> & {
  countrySelector?: ElementType<PhoneInputCountrySelectorProps>;
  extension?: ElementType<MuiPhoneInputExtensionSlotComponentProps>;
};

export type MuiPhoneInputSlotProps = NonNullable<TextFieldProps['slotProps']> & {
  countrySelector?: PhoneInputCountrySelectorProps;
  extension?: MuiPhoneInputExtensionSlotProps;
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
  defaultExtension?: PhoneExtension;
  defaultValue?: PhoneValue;
  disableCountrySelector?: boolean;
  displayMask?: DisplayMask;
  displayMode?: PhoneInputDisplayMode;
  extension?: PhoneExtension;
  extensionError?: boolean;
  extensionHelperText?: ReactNode;
  extensionLabel?: string;
  extensionMaxLength?: number;
  extensionPresentation?: PhoneExtensionPresentation;
  extensionRef?: Ref<HTMLInputElement>;
  extensionRequired?: boolean;
  formatStrategy?: FormatStrategy;
  locale?: string;
  metadata?: PhoneMetadata;
  onChange?: (value: PhoneValue, details: PhoneInputChangeDetails) => void;
  onCountryChange?: (
    country: CountryCode | null,
    details: PhoneCountryChangeDetails,
  ) => void;
  onCountrySelection?: (result: PhoneCountrySelectionResult) => void;
  onExtensionChange?: (
    extension: PhoneExtension,
    details: PhoneExtensionChangeDetails,
  ) => void;
  readOnly?: boolean;
  ref?: Ref<HTMLInputElement>;
  renderExtension?: (context: MuiPhoneInputExtensionRenderContext) => ReactNode;
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
  extensionControlled: boolean;
  extensionError: boolean;
  extensionPresent: boolean;
  extensionPresentation: PhoneExtensionPresentation;
  extensionRequired: boolean;
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

const MuiPhoneInputExtension = styled(TextField, {
  name: 'MuiPhoneInput',
  slot: 'Extension',
  overridesResolver: (_props, styles) => [
    styles.extension,
    styles.extensionInput && {
      [`& .${muiPhoneInputClasses.extensionInput}`]: styles.extensionInput,
    },
    styles.extensionValidationMessage && {
      [`& .${muiPhoneInputClasses.extensionValidationMessage}`]:
        styles.extensionValidationMessage,
    },
  ],
})<{ ownerState: MuiPhoneInputOwnerState }>(({ theme }) => ({
  marginInlineStart: theme.spacing(1),
  '&[data-phone-extension-presentation="inline"]': {
    marginInlineStart: theme.spacing(0.5),
    width: theme.spacing(10),
  },
}));

const MuiPhoneInputExtensionValidationMessage = styled('span', {
  name: 'MuiPhoneInput',
  slot: 'ExtensionValidationMessage',
  overridesResolver: (_props, styles) => [styles.extensionValidationMessage],
})({
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
});

function joinClassNames(...values: Array<string | undefined>): string | undefined {
  const className = values.filter(Boolean).join(' ');
  return className || undefined;
}

function joinAttributeTokens(...values: Array<string | undefined>): string | undefined {
  const joined = [
    ...new Set(values.flatMap((value) => value?.split(/\s+/u).filter(Boolean) ?? [])),
  ].join(' ');
  return joined || undefined;
}

function removeAttributeToken(
  value: string | undefined,
  token: string,
): string | undefined {
  return joinAttributeTokens(
    value
      ?.split(/\s+/u)
      .filter((candidate) => candidate && candidate !== token)
      .join(' '),
  );
}

const COUNTRY_SELECTOR_CLASS_KEYS = [
  'countrySelector',
  'countrySelectorCallingCode',
  'countrySelectorCloseButton',
  'countrySelectorCountryCode',
  'countrySelectorEmpty',
  'countrySelectorFlag',
  'countrySelectorGroup',
  'countrySelectorGroupLabel',
  'countrySelectorListbox',
  'countrySelectorOption',
  'countrySelectorOptionLabel',
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

function useUtilityClasses(
  classes: Partial<MuiPhoneInputClasses> | undefined,
): MuiPhoneInputClasses {
  return {
    countrySelector:
      joinClassNames(muiPhoneInputClasses.countrySelector, classes?.countrySelector) ??
      '',
    countrySelectorCallingCode:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorCallingCode,
        classes?.countrySelectorCallingCode,
      ) ?? '',
    countrySelectorCloseButton:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorCloseButton,
        classes?.countrySelectorCloseButton,
      ) ?? '',
    countrySelectorCountryCode:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorCountryCode,
        classes?.countrySelectorCountryCode,
      ) ?? '',
    countrySelectorEmpty:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorEmpty,
        classes?.countrySelectorEmpty,
      ) ?? '',
    countrySelectorFlag:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorFlag,
        classes?.countrySelectorFlag,
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
    countrySelectorOptionLabel:
      joinClassNames(
        muiPhoneInputClasses.countrySelectorOptionLabel,
        classes?.countrySelectorOptionLabel,
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
    extension: joinClassNames(muiPhoneInputClasses.extension, classes?.extension) ?? '',
    extensionInput:
      joinClassNames(muiPhoneInputClasses.extensionInput, classes?.extensionInput) ??
      '',
    extensionValidationMessage:
      joinClassNames(
        muiPhoneInputClasses.extensionValidationMessage,
        classes?.extensionValidationMessage,
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
    defaultExtension,
    defaultValue,
    disabled = false,
    defaultCountry,
    disableCountrySelector = false,
    displayMask,
    displayMode = 'international',
    error = false,
    extension,
    extensionError = false,
    extensionHelperText,
    extensionLabel = 'Extension',
    extensionMaxLength,
    extensionPresentation = 'none',
    extensionRef: extensionRefProp,
    extensionRequired = false,
    formatStrategy,
    helperText,
    id,
    locale = 'en',
    metadata,
    onChange,
    onCountryChange,
    onCountrySelection,
    onExtensionChange,
    readOnly = false,
    ref: inputRefProp,
    renderExtension,
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
    displayMode,
    error,
    extensionError,
    extensionRequired,
    locale,
    readOnly,
    required,
    validationDisplay,
    validationMode,
    ...(metadata === undefined ? {} : { metadata }),
    ...(Object.hasOwn(props, 'defaultValue') ? { defaultValue } : {}),
    ...(Object.hasOwn(props, 'defaultCountry') ? { defaultCountry } : {}),
    ...(Object.hasOwn(props, 'defaultExtension') ? { defaultExtension } : {}),
    ...(Object.hasOwn(props, 'value') ? { value } : {}),
    ...(Object.hasOwn(props, 'extension') ? { extension } : {}),
    ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    ...(displayMask === undefined ? {} : { displayMask }),
    ...(extensionMaxLength === undefined ? {} : { extensionMaxLength }),
    ...(formatStrategy === undefined ? {} : { formatStrategy }),
    ...(id === undefined ? {} : { id }),
    ...(onChange === undefined ? {} : { onChange }),
    ...(onCountryChange === undefined ? {} : { onCountryChange }),
    ...(onCountrySelection === undefined ? {} : { onCountrySelection }),
    ...(onExtensionChange === undefined ? {} : { onExtensionChange }),
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
    extensionControlled: phone.state.extensionControlled,
    extensionError,
    extensionPresent: phone.state.extension !== undefined,
    extensionPresentation,
    extensionRequired,
    numberingPlanKind: phone.state.numberingPlan.kind,
    readOnly,
    required,
    selectedCountry: phone.state.selectedCountry,
    validationStatus: phone.state.validation.status,
  };
  const resolvedHelperText =
    helperText !== undefined
      ? helperText
      : phone.state.validationError
        ? phone.state.validationMessage
        : undefined;
  const renderedHelperTextId = resolvedHelperText
    ? phone.state.validationMessageId
    : undefined;
  const setInputRef = useForkRef(phone.setInputRef, inputRefProp);
  const setExtensionInputRef =
    useForkRef(phone.setExtensionInputRef, extensionRefProp) ??
    phone.setExtensionInputRef;
  const ExtensionSlot = slots?.extension ?? MuiPhoneInputExtension;
  const extensionSlotProps = slotProps?.extension;
  const {
    htmlInput: externalExtensionHtmlInput,
    slotProps: extensionTextFieldSlotProps,
    ...extensionTextFieldProps
  } = extensionSlotProps ?? {};
  const {
    htmlInput: _ignoredNestedExtensionHtmlInput,
    ...safeExtensionTextFieldSlotProps
  } = (extensionTextFieldSlotProps ?? {}) as NonNullable<TextFieldProps['slotProps']>;
  const extensionValidationMessageId = extensionHelperText
    ? phone.state.extensionValidationMessageId
    : undefined;
  const preparedExtensionInputProps = phone.getExtensionInputProps({
    ...externalExtensionHtmlInput,
    className: joinClassNames(
      classes.extensionInput,
      externalExtensionHtmlInput?.className,
    ),
    ...(extensionPresentation === 'inline' || extensionPresentation === 'custom'
      ? { 'aria-label': externalExtensionHtmlInput?.['aria-label'] ?? extensionLabel }
      : {}),
    ...(extensionValidationMessageId
      ? {
          'aria-describedby': joinAttributeTokens(
            externalExtensionHtmlInput?.['aria-describedby'],
            extensionValidationMessageId,
          ),
        }
      : {}),
    ...(extensionError && extensionValidationMessageId
      ? { 'aria-errormessage': extensionValidationMessageId }
      : {}),
  });
  const resolvedExtensionInputProps = {
    ...preparedExtensionInputProps,
    ref: setExtensionInputRef,
  };
  const {
    ref: _extensionPreparedRef,
    value: _extensionPreparedValue,
    ...extensionHtmlInputProps
  } = resolvedExtensionInputProps;
  const extensionField =
    extensionPresentation === 'separate' || extensionPresentation === 'inline' ? (
      <ExtensionSlot
        {...extensionTextFieldProps}
        className={joinClassNames(classes.extension, extensionTextFieldProps.className)}
        data-phone-extension-presentation={extensionPresentation}
        disabled={disabled}
        error={extensionError}
        helperText={
          extensionPresentation === 'separate' ? extensionHelperText : undefined
        }
        hiddenLabel={
          extensionPresentation === 'inline'
            ? true
            : extensionTextFieldProps.hiddenLabel
        }
        id={phone.state.extensionInputId}
        inputRef={setExtensionInputRef}
        label={extensionPresentation === 'separate' ? extensionLabel : undefined}
        ownerState={ownerState}
        placeholder={
          extensionPresentation === 'inline'
            ? (extensionTextFieldProps.placeholder ?? extensionLabel)
            : extensionTextFieldProps.placeholder
        }
        required={extensionRequired}
        size={extensionTextFieldProps.size ?? 'small'}
        slotProps={{
          ...safeExtensionTextFieldSlotProps,
          formHelperText: mergeSlotProps(
            safeExtensionTextFieldSlotProps.formHelperText,
            {
              className: classes.extensionValidationMessage,
              id: phone.state.extensionValidationMessageId,
            },
          ),
          htmlInput: extensionHtmlInputProps,
        }}
        value={phone.state.extension ?? ''}
        variant={
          extensionPresentation === 'inline'
            ? 'standard'
            : extensionTextFieldProps.variant
        }
      />
    ) : null;
  const customExtension =
    extensionPresentation === 'custom'
      ? (renderExtension?.({ inputProps: resolvedExtensionInputProps, ownerState }) ??
        null)
      : null;
  const hiddenExtensionValidationMessage =
    extensionHelperText &&
    (extensionPresentation === 'inline' || extensionPresentation === 'custom') ? (
      <MuiPhoneInputExtensionValidationMessage
        aria-live="polite"
        className={classes.extensionValidationMessage}
        id={phone.state.extensionValidationMessageId}
      >
        {extensionHelperText}
      </MuiPhoneInputExtensionValidationMessage>
    ) : null;
  const htmlInputSlotProps = useMemo(() => {
    const externalSlotProps = slotProps?.htmlInput;

    return (ownerState: unknown) => {
      const preparedInputProps = phone.getInputProps({
        className: classes.input,
        ...(autoComplete === undefined ? {} : { autoComplete }),
      });
      const { ref: _preparedRef, ...preparedWithoutRef } = preparedInputProps;
      const externalValue =
        (typeof externalSlotProps === 'function'
          ? externalSlotProps({
              ...(ownerState as object),
              ...preparedWithoutRef,
            } as never)
          : externalSlotProps) ?? {};
      const {
        defaultValue: _externalDefaultValue,
        onChange: externalOnChange,
        ref: externalRef,
        ...externalWithoutRef
      } = externalValue;
      const externalInputProps = externalWithoutRef as PhoneInputInputExternalProps;
      const resolved = phone.getInputProps({
        ...externalInputProps,
        className: joinClassNames(classes.input, externalInputProps.className),
        ...(externalInputProps.autoComplete === undefined && autoComplete !== undefined
          ? { autoComplete }
          : {}),
      });
      const {
        'aria-describedby': _resolvedDescribedBy,
        'aria-errormessage': _resolvedErrorMessage,
        ref: _resolvedRef,
        ...resolvedWithoutOwnedRelationships
      } = resolved;
      const describedBy = joinAttributeTokens(
        removeAttributeToken(
          externalInputProps['aria-describedby'],
          phone.state.validationMessageId,
        ),
        renderedHelperTextId,
      );

      return {
        ...resolvedWithoutOwnedRelationships,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(phone.state.validationError && renderedHelperTextId
          ? { 'aria-errormessage': renderedHelperTextId }
          : {}),
        ...(externalOnChange === undefined ? {} : { onChange: externalOnChange }),
        ...(externalRef === undefined ? {} : { ref: externalRef }),
      };
    };
  }, [autoComplete, classes.input, phone, renderedHelperTextId, slotProps?.htmlInput]);
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
        {...(metadata === undefined ? {} : { metadata })}
      />
    </InputAdornment>
  );
  const extensionAdornment =
    extensionPresentation === 'inline' && extensionField ? (
      <InputAdornment position="end">{extensionField}</InputAdornment>
    ) : null;
  const inputSlotProps = useMemo(
    () =>
      mergeSlotProps(slotProps?.input, {
        startAdornment: countrySelector,
        ...(extensionAdornment === null ? {} : { endAdornment: extensionAdornment }),
      }),
    [countrySelector, extensionAdornment, slotProps?.input],
  );
  const formHelperTextSlotProps = useMemo(() => {
    const externalSlotProps = slotProps?.formHelperText;

    return (ownerState: unknown) => {
      const prepared = {
        'aria-live': 'polite',
        className: classes.validationMessage,
        id: phone.state.validationMessageId,
      } as const;
      const externalValue =
        (typeof externalSlotProps === 'function'
          ? externalSlotProps({
              ...(ownerState as object),
              ...prepared,
            } as never)
          : externalSlotProps) ?? {};
      const merged = mergeSlotProps(externalValue, prepared);

      return {
        ...merged,
        'aria-live': 'polite' as const,
        id: phone.state.validationMessageId,
      };
    };
  }, [
    classes.validationMessage,
    phone.state.validationMessageId,
    slotProps?.formHelperText,
  ]);
  const {
    countrySelector: _countrySelectorSlotProps,
    extension: _extensionSlotProps,
    ...textFieldSlotProps
  } = slotProps ?? {};
  const {
    countrySelector: _countrySelectorSlot,
    extension: _extensionSlot,
    ...textFieldSlots
  } = slots ?? {};

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
      {extensionPresentation === 'separate' ? extensionField : null}
      {customExtension}
      {hiddenExtensionValidationMessage}
    </PhoneInputProvider>
  );
}

export { getMuiPhoneInputUtilityClass, muiPhoneInputClasses };
