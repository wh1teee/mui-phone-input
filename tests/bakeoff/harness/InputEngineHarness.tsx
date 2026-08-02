import { useCallback, useRef, useState } from 'react';

import { InputEngineCandidate } from '../candidates/InputEngineCandidate';
import type { PhoneValue } from '../candidates/shared';
import type { InputEngineCandidateId } from '../candidates/types';

export type { InputEngineCandidateId } from '../candidates/types';

type Props = Readonly<{
  candidate: InputEngineCandidateId;
  country?: 'BY' | 'CA' | 'GB' | 'KZ' | 'US';
  fixedCallingCode?: boolean;
  initialValue?: PhoneValue;
  separator?: string;
}>;

export function InputEngineHarness({
  candidate,
  country,
  fixedCallingCode,
  initialValue,
  separator,
}: Props) {
  const initialValueRef = useRef(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(initialValue);
  const [activeCountry, setActiveCountry] = useState(country);
  const [activeLocale, setActiveLocale] = useState('en');
  const [activeSeparator, setActiveSeparator] = useState(separator ?? ' ');
  const [value, setValue] = useState(initialValue);
  const [callbackCount, setCallbackCount] = useState(0);
  valueRef.current = value;

  const handleChange = useCallback((nextValue: PhoneValue) => {
    if (nextValue === valueRef.current) {
      return;
    }

    valueRef.current = nextValue;
    setValue(nextValue);
    setCallbackCount((count) => count + 1);
  }, []);

  return (
    <form>
      <InputEngineCandidate
        candidate={candidate}
        onChange={handleChange}
        ref={inputRef}
        value={value}
        {...(activeCountry ? { country: activeCountry } : {})}
        {...(fixedCallingCode === undefined ? {} : { fixedCallingCode })}
        separator={activeSeparator}
      />
      <output data-testid="canonical-value">{value ?? ''}</output>
      <output data-testid="callback-count">{callbackCount}</output>
      <output data-testid="active-country">{activeCountry ?? ''}</output>
      <output data-testid="active-locale">{activeLocale}</output>
      <output data-testid="active-separator">{activeSeparator}</output>
      <button
        onClick={() => {
          valueRef.current = '+442079460958';
          setValue('+442079460958');
        }}
        type="button"
      >
        Set external value
      </button>
      <button
        onClick={() => {
          valueRef.current = initialValueRef.current;
          setValue(initialValueRef.current);
        }}
        type="button"
      >
        Reset field
      </button>
      <button
        onClick={() => {
          inputRef.current?.focus();
        }}
        type="button"
      >
        Focus phone input
      </button>
      <button
        onClick={() => {
          setActiveSeparator((current) => (current === ' ' ? '-' : ' '));
        }}
        type="button"
      >
        Change separator
      </button>
      <button
        onClick={() => {
          setActiveCountry((current) => (current === 'BY' ? 'GB' : 'BY'));
        }}
        type="button"
      >
        Change country
      </button>
      <button
        onClick={() => {
          setActiveLocale((current) => (current === 'en' ? 'fr' : 'en'));
        }}
        type="button"
      >
        Change locale
      </button>
    </form>
  );
}
