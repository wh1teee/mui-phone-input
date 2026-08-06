'use client';

import { type CountryCode, isSupportedCountry } from 'libphonenumber-js/core';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import { assertPhoneValue, type PhoneValue } from '../phone-value';
import type { PhoneMetadata } from '../phone-metadata';

type PhoneInputDiagnosticName = 'MuiPhoneInput' | 'usePhoneInput';

interface PhoneInputOwnershipParameters {
  defaultCountry?: CountryCode | null;
  defaultValue?: PhoneValue;
  selectedCountry?: CountryCode | null;
  value?: PhoneValue;
}

export interface PhoneInputOwnership {
  controlledRef: RefObject<boolean>;
  countryControlledRef: RefObject<boolean>;
  currentSelectedCountry: CountryCode | null;
  currentSelectedCountryRef: RefObject<CountryCode | null>;
  currentValue: PhoneValue;
  currentValueRef: RefObject<PhoneValue>;
  initialDefaultCountryRef: RefObject<CountryCode | null>;
  initialDefaultValueRef: RefObject<PhoneValue>;
  setUncontrolledCountry: Dispatch<SetStateAction<CountryCode | null>>;
  setUncontrolledValue: Dispatch<SetStateAction<PhoneValue>>;
}

declare const process:
  | {
      env: {
        NODE_ENV?: string;
      };
    }
  | undefined;

function shouldWarnInDevelopment(): boolean {
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'production';
}

export function assertPhoneCountry(
  country: CountryCode | null | undefined,
  label: string,
  metadata: PhoneMetadata,
): void {
  if (country != null && !isSupportedCountry(country, metadata)) {
    throw new TypeError(`Unsupported ${label} country: ${country}`);
  }
}

export function usePhoneInputOwnership(
  parameters: PhoneInputOwnershipParameters,
  diagnosticName: PhoneInputDiagnosticName,
  metadata: PhoneMetadata,
): PhoneInputOwnership {
  const { defaultCountry, defaultValue, selectedCountry, value } = parameters;
  const hasValueProp = Object.hasOwn(parameters, 'value');
  const hasDefaultValueProp = Object.hasOwn(parameters, 'defaultValue');
  const hasSelectedCountryProp = Object.hasOwn(parameters, 'selectedCountry');
  const hasDefaultCountryProp = Object.hasOwn(parameters, 'defaultCountry');
  const isControlledNow = hasValueProp;
  const isCountryControlledNow = hasSelectedCountryProp;
  const controlledRef = useRef(isControlledNow);
  const countryControlledRef = useRef(isCountryControlledNow);
  const warnedAboutModeRef = useRef(false);
  const warnedAboutCountryModeRef = useRef(false);
  const warnedAboutOwnershipConflictRef = useRef(false);
  const warnedAboutCountryOwnershipConflictRef = useRef(false);
  const initialDefaultValueRef = useRef(defaultValue);
  const initialDefaultCountryRef = useRef(defaultCountry ?? null);
  const [uncontrolledValue, setUncontrolledValue] = useState<PhoneValue>(() => {
    assertPhoneValue(defaultValue);
    return defaultValue;
  });
  const [uncontrolledCountry, setUncontrolledCountry] = useState<CountryCode | null>(
    () => {
      assertPhoneCountry(defaultCountry, 'default', metadata);
      return defaultCountry ?? null;
    },
  );

  assertPhoneValue(value);
  assertPhoneCountry(selectedCountry, 'selected', metadata);

  const currentValue = controlledRef.current ? value : uncontrolledValue;
  const currentValueRef = useRef(currentValue);
  currentValueRef.current = currentValue;
  const currentSelectedCountry = countryControlledRef.current
    ? (selectedCountry ?? null)
    : uncontrolledCountry;
  const currentSelectedCountryRef = useRef(currentSelectedCountry);
  currentSelectedCountryRef.current = currentSelectedCountry;

  useEffect(() => {
    if (
      shouldWarnInDevelopment() &&
      isControlledNow !== controlledRef.current &&
      !warnedAboutModeRef.current
    ) {
      warnedAboutModeRef.current = true;
      console.error(
        `${diagnosticName} cannot switch between controlled and uncontrolled ownership after mount.`,
      );
    }
  }, [diagnosticName, isControlledNow]);

  useEffect(() => {
    if (
      shouldWarnInDevelopment() &&
      isCountryControlledNow !== countryControlledRef.current &&
      !warnedAboutCountryModeRef.current
    ) {
      warnedAboutCountryModeRef.current = true;
      console.error(
        `${diagnosticName} cannot switch selectedCountry between controlled and uncontrolled ownership after mount.`,
      );
    }
  }, [diagnosticName, isCountryControlledNow]);

  useEffect(() => {
    if (
      shouldWarnInDevelopment() &&
      hasValueProp &&
      hasDefaultValueProp &&
      !warnedAboutOwnershipConflictRef.current
    ) {
      warnedAboutOwnershipConflictRef.current = true;
      console.error(
        `${diagnosticName} received both value and defaultValue; value controls ownership.`,
      );
    }
  }, [diagnosticName, hasDefaultValueProp, hasValueProp]);

  useEffect(() => {
    if (
      shouldWarnInDevelopment() &&
      hasSelectedCountryProp &&
      hasDefaultCountryProp &&
      !warnedAboutCountryOwnershipConflictRef.current
    ) {
      warnedAboutCountryOwnershipConflictRef.current = true;
      console.error(
        `${diagnosticName} received both selectedCountry and defaultCountry; selectedCountry controls country ownership.`,
      );
    }
  }, [diagnosticName, hasDefaultCountryProp, hasSelectedCountryProp]);

  return {
    controlledRef,
    countryControlledRef,
    currentSelectedCountry,
    currentSelectedCountryRef,
    currentValue,
    currentValueRef,
    initialDefaultCountryRef,
    initialDefaultValueRef,
    setUncontrolledCountry,
    setUncontrolledValue,
  };
}
