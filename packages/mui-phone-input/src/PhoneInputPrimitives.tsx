'use client';

import { useForkRef } from '@mui/material/utils';
import { type ComponentPropsWithRef, createContext, type ReactNode, use } from 'react';

import { muiPhoneInputClasses } from './MuiPhoneInput/muiPhoneInputClasses';
import type { UsePhoneInputReturn } from './usePhoneInput';

const PhoneInputContext = createContext<UsePhoneInputReturn | null>(null);

function joinClassNames(...values: Array<string | undefined>): string | undefined {
  const className = values.filter(Boolean).join(' ');
  return className || undefined;
}

export interface PhoneInputProviderProps {
  children: ReactNode;
  value: UsePhoneInputReturn;
}

export function PhoneInputProvider({
  children,
  value,
}: PhoneInputProviderProps): ReactNode {
  return <PhoneInputContext value={value}>{children}</PhoneInputContext>;
}

export function usePhoneInputContext(): UsePhoneInputReturn {
  const context = use(PhoneInputContext);

  if (!context) {
    throw new Error('Phone Input primitives must be wrapped in PhoneInputProvider.');
  }

  return context;
}

export type PhoneInputRootProps = ComponentPropsWithRef<'div'>;

export function PhoneInputRoot({
  className,
  ref,
  ...props
}: PhoneInputRootProps): ReactNode {
  const phone = usePhoneInputContext();

  return (
    <div
      {...phone.getRootProps({
        ...props,
        className: joinClassNames(muiPhoneInputClasses.root, className),
      })}
      ref={ref}
    />
  );
}

export type PhoneInputInputProps = ComponentPropsWithRef<'input'>;

export function PhoneInputInput({
  className,
  ref,
  ...props
}: PhoneInputInputProps): ReactNode {
  const phone = usePhoneInputContext();
  const forkedRef = useForkRef(phone.setInputRef, ref);
  const inputProps = phone.getInputProps({
    ...props,
    className: joinClassNames(muiPhoneInputClasses.input, className),
  });

  return <input {...inputProps} ref={forkedRef} />;
}

export type PhoneInputValidationMessageProps = ComponentPropsWithRef<'span'>;

export function PhoneInputValidationMessage({
  children,
  className,
  ref,
  ...props
}: PhoneInputValidationMessageProps): ReactNode {
  const phone = usePhoneInputContext();

  if (!phone.state.validationError) {
    return null;
  }

  return (
    <span
      {...phone.getValidationMessageProps({
        ...props,
        className: joinClassNames(muiPhoneInputClasses.validationMessage, className),
      })}
      ref={ref}
    >
      {children ?? phone.state.validationMessage}
    </span>
  );
}
