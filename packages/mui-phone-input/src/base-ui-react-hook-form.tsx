'use client';

import type { ReactElement } from 'react';
import {
  type Control,
  Controller,
  type ControllerFieldState,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldPathByValue,
  type FieldValues,
} from 'react-hook-form';

import { PhoneInput, type PhoneInputProps } from './BasePhoneInput/PhoneInput';
import type { PhoneExtension } from './phone-extension';
import type { PhoneValue } from './phone-value';

export type PhoneControllerFieldPath<TValues extends FieldValues> = FieldPathByValue<
  TValues,
  PhoneValue
>;
export type PhoneExtensionControllerFieldPath<TValues extends FieldValues> = Exclude<
  FieldPathByValue<TValues, PhoneExtension>,
  FieldPathByValue<TValues, PhoneValue>
>;

export type PhoneInputControllerProps<
  TValues extends FieldValues,
  TName extends PhoneControllerFieldPath<TValues> = PhoneControllerFieldPath<TValues>,
  TExtensionName extends
    PhoneExtensionControllerFieldPath<TValues> = PhoneExtensionControllerFieldPath<TValues>,
> = Omit<
  PhoneInputProps,
  | 'value'
  | 'defaultValue'
  | 'name'
  | 'ref'
  | 'extension'
  | 'defaultExtension'
  | 'extensionRef'
> & {
  control?: Control<TValues>;
  defaultValue?: ControllerProps<TValues, TName>['defaultValue'];
  extensionDefaultValue?: ControllerProps<TValues, TExtensionName>['defaultValue'];
  extensionName?: TExtensionName;
  extensionRules?: ControllerProps<TValues, TExtensionName>['rules'];
  extensionShouldUnregister?: boolean;
  name: TName;
  rules?: ControllerProps<TValues, TName>['rules'];
  shouldUnregister?: boolean;
};

/** RHF owns form state; phone and extension share the Base UI editing authority. */
export function PhoneInputController<
  TValues extends FieldValues,
  TName extends PhoneControllerFieldPath<TValues> = PhoneControllerFieldPath<TValues>,
  TExtensionName extends
    PhoneExtensionControllerFieldPath<TValues> = PhoneExtensionControllerFieldPath<TValues>,
>({
  control,
  defaultValue,
  disabled,
  error,
  extensionDefaultValue,
  extensionError,
  extensionHelperText,
  extensionInputProps,
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
  ...props
}: PhoneInputControllerProps<TValues, TName, TExtensionName>): ReactElement {
  return (
    <Controller<TValues, TName>
      {...(control === undefined ? {} : { control })}
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(disabled === undefined ? {} : { disabled })}
      name={name}
      {...(rules === undefined ? {} : { rules })}
      {...(shouldUnregister === undefined ? {} : { shouldUnregister })}
      render={({ field, fieldState }) => {
        const renderPhone = (binding?: {
          field: ControllerRenderProps<TValues, TExtensionName>;
          fieldState: ControllerFieldState;
        }): ReactElement => (
          <PhoneInput
            {...props}
            disabled={field.disabled ?? disabled ?? false}
            error={Boolean(error || fieldState.error)}
            helperText={fieldState.error?.message ?? helperText}
            name={field.name}
            onBlur={(event) => {
              field.onBlur();
              onBlur?.(event);
            }}
            onChange={(value, details) => {
              field.onChange(value);
              onChange?.(value, details);
            }}
            onExtensionChange={(value, details) => {
              binding?.field.onChange(value);
              onExtensionChange?.(value, details);
            }}
            ref={field.ref}
            value={field.value as PhoneValue}
            extensionError={Boolean(extensionError || binding?.fieldState.error)}
            extensionHelperText={
              binding?.fieldState.error?.message ?? extensionHelperText
            }
            {...(binding
              ? {
                  extension: binding.field.value as PhoneExtension,
                  extensionRef: binding.field.ref,
                }
              : {})}
            extensionInputProps={{
              ...extensionInputProps,
              ...(binding ? { name: binding.field.name } : {}),
              onBlur: (event) => {
                binding?.field.onBlur();
                extensionInputProps?.onBlur?.(event);
              },
            }}
          />
        );
        return extensionName === undefined ? (
          renderPhone()
        ) : (
          <Controller<TValues, TExtensionName>
            {...(control === undefined ? {} : { control })}
            {...(disabled === undefined ? {} : { disabled })}
            {...(extensionDefaultValue === undefined
              ? {}
              : { defaultValue: extensionDefaultValue })}
            {...(extensionRules === undefined ? {} : { rules: extensionRules })}
            {...((extensionShouldUnregister ?? shouldUnregister) === undefined
              ? {}
              : { shouldUnregister: extensionShouldUnregister ?? shouldUnregister })}
            name={extensionName}
            render={(binding) => renderPhone(binding)}
          />
        );
      }}
    />
  );
}
