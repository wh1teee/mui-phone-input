'use client';

import { type FocusEventHandler, type ReactNode, type Ref, useMemo } from 'react';

import { composeInputRefs } from '../internal/compose-input-refs';
import {
  type PhoneExtensionInputExternalProps,
  type PhoneInputInputExternalProps,
  type UsePhoneInputParameters,
  type UsePhoneInputReturn,
  usePhoneInput,
} from '../usePhoneInput';
import type {
  PhoneCountryListProps,
  PhoneCountryTriggerProps,
} from './PhoneCountryParts';
import {
  PhoneInputCountrySelector,
  type PhoneInputCountrySelectorProps,
} from './PhoneInputCountrySelector';

/** What `renderCountrySelector` receives to build its own country presentation. */
export interface PhoneInputCountrySelectorRenderProps {
  /** The built-in anchored popover, e.g. for wide screens. */
  defaultSelector: ReactNode;
  /**
   * Moves focus to the phone input. After a pick: select (the list does it),
   * close your container, then focus the input, e.g. as the container's final
   * focus target or by calling this once it has closed.
   */
  focusInput: () => void;
  /**
   * Props for `PhoneCountryList`, from `countrySelector`. The list applies the
   * selection itself; add your own `onSelect` to close your container.
   */
  listProps: PhoneCountryListProps;
  phone: UsePhoneInputReturn;
  /**
   * Props for `PhoneCountryTrigger`, including `countrySelector.triggerProps`
   * (its Base UI `render` and function `className`/`style` stay popover-only);
   * its accessible name carries the selection.
   */
  triggerProps: PhoneCountryTriggerProps;
}

export interface PhoneInputClassNames {
  control?: string;
  description?: string;
  extension?: string;
  extensionInput?: string;
  input?: string;
  label?: string;
}

export interface PhoneInputProps extends UsePhoneInputParameters {
  className?: string;
  classNames?: PhoneInputClassNames;
  countrySelector?: Omit<PhoneInputCountrySelectorProps, 'phone'> | false;
  dir?: 'ltr' | 'rtl';
  extensionHelperText?: ReactNode;
  extensionInputProps?: PhoneExtensionInputExternalProps;
  extensionRef?: Ref<HTMLInputElement>;
  /** Providing a label enables the optional, separately controlled extension. */
  extensionLabel?: ReactNode;
  helperText?: ReactNode;
  inputProps?: PhoneInputInputExternalProps;
  label?: ReactNode;
  name?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  ref?: Ref<HTMLInputElement>;
  /**
   * Replaces the country selector's presentation (a host sheet on phones, the
   * default popover on wide screens) while the field keeps its label,
   * description, errors and extension.
   */
  renderCountrySelector?: (props: PhoneInputCountrySelectorRenderProps) => ReactNode;
}

function createCountrySelectorRenderProps(
  phone: UsePhoneInputReturn,
  selector: Omit<PhoneInputCountrySelectorProps, 'phone'>,
  defaultSelector: ReactNode,
): PhoneInputCountrySelectorRenderProps {
  const { classNames } = selector;
  // A Base UI render element and state functions only make sense on the popover.
  const {
    className,
    render: _render,
    style,
    ...triggerProps
  } = selector.triggerProps ?? {};
  return {
    defaultSelector,
    focusInput: phone.actions.focus,
    // The list ignores the popover-only options (portal, trigger props).
    listProps: { ...selector, phone } as PhoneCountryListProps,
    phone,
    triggerProps: {
      ...triggerProps,
      className: typeof className === 'string' ? className : classNames?.trigger,
      style: typeof style === 'function' ? undefined : style,
      flagClassName: classNames?.flag,
      flags: selector.flags,
      locale: selector.locale,
      messages: selector.messages,
      phone,
      resolveCountryName: selector.resolveCountryName,
      triggerContent: selector.triggerContent,
    } as PhoneCountryTriggerProps,
  };
}

/** A complete, unstyled Base UI composition. /shadcn.css supplies optional skin. */
export function PhoneInput({
  className,
  classNames = {},
  countrySelector,
  dir,
  extensionHelperText,
  extensionInputProps,
  extensionRef,
  extensionLabel,
  helperText,
  inputProps,
  label,
  name,
  onBlur,
  ref,
  renderCountrySelector,
  ...parameters
}: PhoneInputProps): ReactNode {
  const phone = usePhoneInput(parameters);
  const inputRef = useMemo(
    () => composeInputRefs(phone.setInputRef, ref),
    [phone.setInputRef, ref],
  );
  const resolvedExtensionRef = useMemo(
    () => composeInputRefs(phone.setExtensionInputRef, extensionRef),
    [phone.setExtensionInputRef, extensionRef],
  );
  // The selector reads its locale from phone; only the direction is passed on.
  const selectorOptions =
    countrySelector !== false &&
    ({ dir, ...countrySelector } as Omit<PhoneInputCountrySelectorProps, 'phone'>);
  const defaultSelector = selectorOptions && (
    <PhoneInputCountrySelector {...selectorOptions} phone={phone} />
  );
  // An application-supplied error (e.g. a server or form error) speaks through
  // helperText; otherwise built-in validation explains what to fix.
  const description = parameters.error
    ? (helperText ?? phone.state.validationMessage)
    : phone.state.validationError
      ? (phone.state.validationMessage ?? helperText)
      : helperText;
  const describedBy =
    [
      inputProps?.['aria-describedby'],
      description != null ? phone.state.validationMessageId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div
      {...phone.getRootProps()}
      className={className}
      data-disabled={phone.state.disabled || undefined}
      data-invalid={phone.state.error || undefined}
      data-slot="phone-input"
      dir={dir}
    >
      {label != null && (
        <label
          className={classNames.label}
          data-slot="phone-input-label"
          htmlFor={phone.state.inputId}
        >
          {label}
        </label>
      )}
      <div className={classNames.control} data-slot="phone-input-control">
        {selectorOptions &&
          (renderCountrySelector
            ? renderCountrySelector(
                createCountrySelectorRenderProps(
                  phone,
                  selectorOptions,
                  defaultSelector,
                ),
              )
            : defaultSelector)}
        <input
          {...phone.getInputProps({
            ...inputProps,
            ...(name === undefined ? {} : { name }),
            'aria-describedby': describedBy,
            onBlur: (event) => {
              inputProps?.onBlur?.(event);
              onBlur?.(event);
            },
            type: 'tel',
          })}
          className={inputProps?.className ?? classNames.input}
          data-slot="phone-input-native"
          ref={inputRef}
        />
      </div>
      {(description != null || phone.state.validationError) && (
        <p
          {...phone.getValidationMessageProps()}
          className={classNames.description}
          data-slot="phone-input-description"
          role={phone.state.validationError ? 'alert' : undefined}
        >
          {description}
        </p>
      )}
      {extensionLabel != null && (
        <div
          className={classNames.extension}
          data-slot="phone-input-extension"
          data-invalid={phone.state.extensionError || undefined}
        >
          <label className={classNames.label} htmlFor={phone.state.extensionInputId}>
            {extensionLabel}
          </label>
          <input
            {...phone.getExtensionInputProps({
              ...extensionInputProps,
              'aria-describedby':
                [
                  extensionInputProps?.['aria-describedby'],
                  extensionHelperText != null
                    ? phone.state.extensionValidationMessageId
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined,
              type: 'text',
            })}
            className={extensionInputProps?.className ?? classNames.extensionInput}
            data-slot="phone-input-extension-native"
            ref={resolvedExtensionRef}
          />
          {extensionHelperText != null && (
            <p
              id={phone.state.extensionValidationMessageId}
              data-slot="phone-input-description"
              role={phone.state.extensionError ? 'alert' : undefined}
            >
              {extensionHelperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
