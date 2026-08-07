'use client';

import type { FocusEvent, ReactElement } from 'react';
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldPathByValue,
  type FieldValues,
} from 'react-hook-form';

import { MuiPhoneInput, type MuiPhoneInputProps } from './MuiPhoneInput';
import type { PhoneExtension } from './phone-extension';
import type { PhoneValue } from './phone-value';

export type PhoneControllerFieldPath<TFieldValues extends FieldValues> =
  FieldPathByValue<TFieldValues, PhoneValue>;

export type PhoneExtensionControllerFieldPath<TFieldValues extends FieldValues> =
  Exclude<
    FieldPathByValue<TFieldValues, PhoneExtension>,
    FieldPathByValue<TFieldValues, PhoneValue>
  >;

export type MuiPhoneInputControllerProps<
  TFieldValues extends FieldValues,
  TName extends
    PhoneControllerFieldPath<TFieldValues> = PhoneControllerFieldPath<TFieldValues>,
  TExtensionName extends
    PhoneExtensionControllerFieldPath<TFieldValues> = PhoneExtensionControllerFieldPath<TFieldValues>,
> = Omit<
  MuiPhoneInputProps,
  | 'defaultExtension'
  | 'defaultValue'
  | 'extension'
  | 'extensionRef'
  | 'name'
  | 'ref'
  | 'value'
> & {
  control?: Control<TFieldValues>;
  defaultValue?: ControllerProps<TFieldValues, TName>['defaultValue'];
  extensionDefaultValue?: ControllerProps<TFieldValues, TExtensionName>['defaultValue'];
  extensionName?: TExtensionName;
  extensionRules?: ControllerProps<TFieldValues, TExtensionName>['rules'];
  extensionShouldUnregister?: boolean;
  name: TName;
  rules?: ControllerProps<TFieldValues, TName>['rules'];
  shouldUnregister?: boolean;
};

type ExtensionBinding<
  TFieldValues extends FieldValues,
  TExtensionName extends PhoneExtensionControllerFieldPath<TFieldValues>,
> = Readonly<{
  field: ControllerRenderProps<TFieldValues, TExtensionName>;
  fieldState: ControllerFieldState;
}>;

export function MuiPhoneInputController<
  TFieldValues extends FieldValues,
  TName extends
    PhoneControllerFieldPath<TFieldValues> = PhoneControllerFieldPath<TFieldValues>,
  TExtensionName extends
    PhoneExtensionControllerFieldPath<TFieldValues> = PhoneExtensionControllerFieldPath<TFieldValues>,
>(
  props: MuiPhoneInputControllerProps<TFieldValues, TName, TExtensionName>,
): ReactElement {
  const {
    control,
    defaultValue,
    disabled,
    error,
    extensionDefaultValue,
    extensionError,
    extensionHelperText,
    extensionName,
    extensionRules,
    extensionShouldUnregister,
    helperText,
    name,
    onBlur,
    onChange,
    onExtensionChange,
    rules,
    shouldUnregister,
    slotProps,
    ...muiProps
  } = props;

  return (
    <Controller
      name={name}
      {...(control === undefined ? {} : { control })}
      {...(disabled === undefined ? {} : { disabled })}
      {...(rules === undefined ? {} : { rules })}
      {...(shouldUnregister === undefined ? {} : { shouldUnregister })}
      {...(defaultValue === undefined ? {} : { defaultValue })}
      render={({ field, fieldState }) => {
        const renderPhoneInput = (
          extensionBinding?: ExtensionBinding<TFieldValues, TExtensionName>,
        ): ReactElement => {
          const resolvedExtensionSlotProps = extensionBinding
            ? {
                ...slotProps?.extension,
                name: extensionBinding.field.name,
                onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  slotProps?.extension?.onBlur?.(event);
                  extensionBinding.field.onBlur();
                },
              }
            : slotProps?.extension;

          return (
            <MuiPhoneInput
              {...muiProps}
              disabled={field.disabled ?? disabled}
              error={Boolean(error || fieldState.invalid)}
              helperText={fieldState.error?.message ?? helperText}
              name={field.name}
              onBlur={(event) => {
                onBlur?.(event);
                field.onBlur();
              }}
              onChange={(value, details) => {
                field.onChange(value);
                onChange?.(value, details);
              }}
              ref={field.ref}
              slotProps={{
                ...slotProps,
                ...(resolvedExtensionSlotProps === undefined
                  ? {}
                  : { extension: resolvedExtensionSlotProps }),
              }}
              value={field.value}
              {...(extensionBinding
                ? {
                    extension: extensionBinding.field.value,
                    extensionError: Boolean(
                      extensionError || extensionBinding.fieldState.invalid,
                    ),
                    extensionHelperText:
                      extensionBinding.fieldState.error?.message ?? extensionHelperText,
                    extensionRef: extensionBinding.field.ref,
                    onExtensionChange: (value, details) => {
                      extensionBinding.field.onChange(value);
                      onExtensionChange?.(value, details);
                    },
                  }
                : {})}
            />
          );
        };

        if (extensionName === undefined) {
          return renderPhoneInput();
        }

        return (
          <Controller
            name={extensionName}
            {...(control === undefined ? {} : { control })}
            {...(disabled === undefined ? {} : { disabled })}
            {...(extensionRules === undefined ? {} : { rules: extensionRules })}
            {...((extensionShouldUnregister ?? shouldUnregister) === undefined
              ? {}
              : {
                  shouldUnregister: extensionShouldUnregister ?? shouldUnregister,
                })}
            {...(extensionDefaultValue === undefined
              ? {}
              : { defaultValue: extensionDefaultValue })}
            render={({ field: extensionField, fieldState: extensionFieldState }) =>
              renderPhoneInput({
                field: extensionField,
                fieldState: extensionFieldState,
              })
            }
          />
        );
      }}
    />
  );
}
