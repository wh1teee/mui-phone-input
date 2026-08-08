import { useRef, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  type PhoneCountryChangeDetails,
  type PhoneCountryChangeReason,
  type PhoneCountrySelectionAppliedReason,
  type PhoneCountrySelectionResult,
  PhoneInputInput,
  PhoneInputProvider,
  PhoneInputRoot,
  PhoneInputValidationMessage,
  type PhoneValue,
  type UsePhoneInputParameters,
  usePhoneInput,
  usePhoneInputContext,
} from '../../packages/mui-phone-input/src';

type InitialCountryReasonParameters = Pick<
  UsePhoneInputParameters,
  'defaultCountry' | 'defaultValue' | 'selectedCountry' | 'value'
>;

function InitialCountryReasonHarness({
  parameters,
  testId,
}: {
  parameters: InitialCountryReasonParameters;
  testId: string;
}) {
  const [events, setEvents] = useState<PhoneCountryChangeDetails[]>([]);
  const phone = usePhoneInput({
    ...parameters,
    onCountryChange: (_country, details) =>
      setEvents((current) => [...current, details]),
  });

  return (
    <>
      <input {...phone.getInputProps({ 'data-testid': `${testId}-input` })} />
      <output data-testid={`${testId}-events`}>{JSON.stringify(events)}</output>
    </>
  );
}

function HeadlessHarness() {
  const [callbackCount, setCallbackCount] = useState(0);
  const phone = usePhoneInput({
    defaultValue: '+1',
    onChange: () => setCallbackCount((count) => count + 1),
    required: true,
  });

  return (
    <>
      <div {...phone.getRootProps({ 'data-testid': 'headless-root' })}>
        <label htmlFor={phone.state.inputId}>Headless phone</label>
        <input
          {...phone.getInputProps({
            'data-testid': 'headless-input',
          })}
        />
        {phone.state.validationError ? (
          <span
            {...phone.getValidationMessageProps({
              'data-testid': 'headless-validation',
            })}
          >
            {phone.state.validationMessage}
          </span>
        ) : null}
      </div>
      <output data-testid="headless-value">{phone.state.value ?? ''}</output>
      <output data-testid="headless-callback-count">{callbackCount}</output>
      <output data-testid="headless-state">{JSON.stringify(phone.state)}</output>
      <button onClick={phone.actions.focus} type="button">
        Focus headless input
      </button>
      <button onClick={phone.actions.clear} type="button">
        Clear headless input
      </button>
      <button onClick={phone.actions.reset} type="button">
        Reset headless input
      </button>
    </>
  );
}

function PrimitiveActions() {
  const phone = usePhoneInputContext();

  return (
    <>
      <output data-testid="primitive-value">{phone.state.value ?? ''}</output>
      <button onClick={phone.actions.clear} type="button">
        Clear primitive input
      </button>
    </>
  );
}

function PrimitiveHarness() {
  const externalRef = useRef<HTMLInputElement>(null);
  const phone = usePhoneInput({ defaultValue: '+1', required: true });

  return (
    <PhoneInputProvider value={phone}>
      <PhoneInputRoot className="consumer-root" data-testid="primitive-root">
        <PhoneInputInput
          aria-label="Primitive phone"
          className="consumer-input"
          data-testid="primitive-input"
          ref={externalRef}
        />
        <PhoneInputValidationMessage data-testid="primitive-validation" />
        <PrimitiveActions />
        <button onClick={() => externalRef.current?.focus()} type="button">
          Focus primitive ref
        </button>
      </PhoneInputRoot>
    </PhoneInputProvider>
  );
}

function ManualErrorHarness() {
  const phone = usePhoneInput({ error: true });

  return (
    <input
      {...phone.getInputProps({
        'data-testid': 'manual-error-input',
      })}
    />
  );
}

function CountryActionHarness() {
  const [changeDetails, setChangeDetails] = useState('');
  const [countryEvents, setCountryEvents] = useState<PhoneCountryChangeDetails[]>([]);
  const phone = usePhoneInput({
    defaultCountry: 'CA',
    onChange: (_value, details) => setChangeDetails(JSON.stringify(details)),
    onCountryChange: (_country, details) =>
      setCountryEvents((events) => [...events, details]),
  });

  return (
    <>
      <div {...phone.getRootProps({ 'data-testid': 'country-action-root' })}>
        <input {...phone.getInputProps({ 'data-testid': 'country-action-input' })} />
      </div>
      <output data-testid="country-action-state">{JSON.stringify(phone.state)}</output>
      <output data-testid="country-action-change">{changeDetails}</output>
      <output data-testid="country-action-country-change">
        {JSON.stringify(countryEvents)}
      </output>
      <button onClick={() => phone.actions.selectCountry('BY')} type="button">
        Select Belarus
      </button>
      <button onClick={phone.actions.reset} type="button">
        Reset country action
      </button>
    </>
  );
}

function InputCountryTransitionHarness() {
  const [countryEvents, setCountryEvents] = useState<PhoneCountryChangeDetails[]>([]);
  const phone = usePhoneInput({
    onCountryChange: (_country, details) =>
      setCountryEvents((events) => [...events, details]),
  });

  return (
    <>
      <input {...phone.getInputProps({ 'data-testid': 'country-input-transition' })} />
      <output data-testid="country-input-events">
        {JSON.stringify(countryEvents)}
      </output>
    </>
  );
}

function PasteCountryTransitionHarness() {
  const [countryEvents, setCountryEvents] = useState<PhoneCountryChangeDetails[]>([]);
  const phone = usePhoneInput({
    onCountryChange: (_country, details) =>
      setCountryEvents((events) => [...events, details]),
  });

  return (
    <>
      <input {...phone.getInputProps({ 'data-testid': 'country-paste-transition' })} />
      <output data-testid="country-paste-events">
        {JSON.stringify(countryEvents)}
      </output>
    </>
  );
}

function ExternalCountryTransitionHarness() {
  const [value, setValue] = useState<PhoneValue>();
  const [countryEvents, setCountryEvents] = useState<PhoneCountryChangeDetails[]>([]);
  const phone = usePhoneInput({
    onCountryChange: (_country, details) =>
      setCountryEvents((events) => [...events, details]),
    value,
  });

  return (
    <>
      <input
        {...phone.getInputProps({ 'data-testid': 'country-external-transition' })}
      />
      <output data-testid="country-external-events">
        {JSON.stringify(countryEvents)}
      </output>
      <button onClick={() => setValue('+375291234567')} type="button">
        Set Belarus externally
      </button>
      <button onClick={() => setValue('+80012345678')} type="button">
        Set non-geographic externally
      </button>
    </>
  );
}

function ControlledCountrySelectionHarness() {
  const [value, setValue] = useState<PhoneValue>('+1');
  const [selectedCountry, setSelectedCountry] =
    useState<PhoneCountryChangeDetails['country']>('CA');
  const [countryEvents, setCountryEvents] = useState<PhoneCountryChangeDetails[]>([]);
  const phone = usePhoneInput({
    onChange: (nextValue) => setValue(nextValue),
    onCountryChange: (country, details) => {
      setCountryEvents((events) => [...events, details]);
      if (details.reason === 'user') {
        setSelectedCountry(country);
      }
    },
    selectedCountry,
    value,
  });

  return (
    <>
      <input {...phone.getInputProps({ 'data-testid': 'controlled-country-input' })} />
      <output data-testid="controlled-country-events">
        {JSON.stringify(countryEvents)}
      </output>
      <button onClick={() => phone.actions.selectCountry('BY')} type="button">
        Select controlled Belarus
      </button>
    </>
  );
}

function RejectedControlledCountrySelectionHarness() {
  const [value, setValue] = useState<PhoneValue>('+1');
  const [countryEvents, setCountryEvents] = useState<PhoneCountryChangeDetails[]>([]);
  const phone = usePhoneInput({
    onChange: (nextValue) => setValue(nextValue),
    onCountryChange: (_country, details) =>
      setCountryEvents((events) => [...events, details]),
    selectedCountry: 'CA',
    value,
  });

  return (
    <>
      <input {...phone.getInputProps({ 'data-testid': 'rejected-country-input' })} />
      <output data-testid="rejected-country-events">
        {JSON.stringify(countryEvents)}
      </output>
      <button onClick={() => phone.actions.selectCountry('BY')} type="button">
        Reject controlled Belarus
      </button>
    </>
  );
}

function SharedCodeCountrySelectionHarness() {
  const [changeCount, setChangeCount] = useState(0);
  const [actionResult, setActionResult] = useState<PhoneCountrySelectionResult>();
  const [selectionEvents, setSelectionEvents] = useState<PhoneCountrySelectionResult[]>(
    [],
  );
  const phone = usePhoneInput({
    defaultValue: '+12025550123',
    onChange: () => setChangeCount((count) => count + 1),
    onCountrySelection: (result) => setSelectionEvents((events) => [...events, result]),
  });

  return (
    <>
      <input {...phone.getInputProps({ 'data-testid': 'shared-code-country-input' })} />
      <output data-testid="shared-code-country-change-count">{changeCount}</output>
      <output data-testid="shared-code-country-events">
        {JSON.stringify(selectionEvents)}
      </output>
      <output data-testid="shared-code-country-action-result">
        {actionResult ? JSON.stringify(actionResult) : ''}
      </output>
      <button
        onClick={() => setActionResult(phone.actions.selectCountry('CA'))}
        type="button"
      >
        Select Canada
      </button>
    </>
  );
}

function CountrySelectionAppliedHarness() {
  const [changeCount, setChangeCount] = useState(0);
  const [actionResult, setActionResult] = useState<PhoneCountrySelectionResult>();
  const [selectionEvents, setSelectionEvents] = useState<PhoneCountrySelectionResult[]>(
    [],
  );
  const phone = usePhoneInput({
    defaultValue: '+24740123',
    onChange: () => setChangeCount((count) => count + 1),
    onCountrySelection: (result) => setSelectionEvents((events) => [...events, result]),
  });

  return (
    <>
      <input {...phone.getInputProps({ 'data-testid': 'country-applied-input' })} />
      <output data-testid="country-applied-change-count">{changeCount}</output>
      <output data-testid="country-applied-events">
        {JSON.stringify(selectionEvents)}
      </output>
      <output data-testid="country-applied-action-result">
        {actionResult ? JSON.stringify(actionResult) : ''}
      </output>
      <button
        onClick={() => setActionResult(phone.actions.selectCountry('DE'))}
        type="button"
      >
        Select compatible Germany
      </button>
    </>
  );
}

function ImpossibleCountrySelectionHarness() {
  const [changeCount, setChangeCount] = useState(0);
  const [countryChangeCount, setCountryChangeCount] = useState(0);
  const [actionResult, setActionResult] = useState<PhoneCountrySelectionResult>();
  const [selectionEvents, setSelectionEvents] = useState<PhoneCountrySelectionResult[]>(
    [],
  );
  const phone = usePhoneInput({
    defaultValue: '+24740123',
    onChange: () => setChangeCount((count) => count + 1),
    onCountryChange: () => setCountryChangeCount((count) => count + 1),
    onCountrySelection: (result) => setSelectionEvents((events) => [...events, result]),
  });

  return (
    <>
      <input {...phone.getInputProps({ 'data-testid': 'country-impossible-input' })} />
      <output data-testid="country-impossible-change-count">{changeCount}</output>
      <output data-testid="country-impossible-country-change-count">
        {countryChangeCount}
      </output>
      <output data-testid="country-impossible-events">
        {JSON.stringify(selectionEvents)}
      </output>
      <output data-testid="country-impossible-action-result">
        {actionResult ? JSON.stringify(actionResult) : ''}
      </output>
      <button
        onClick={() => setActionResult(phone.actions.selectCountry('AZ'))}
        type="button"
      >
        Select impossible Azerbaijan
      </button>
    </>
  );
}

function PartialCountryPrefixHarness() {
  const [changeCount, setChangeCount] = useState(0);
  const [selectionEvents, setSelectionEvents] = useState<PhoneCountrySelectionResult[]>(
    [],
  );
  const phone = usePhoneInput({
    defaultValue: '+37',
    onChange: () => setChangeCount((count) => count + 1),
    onCountrySelection: (result) => setSelectionEvents((events) => [...events, result]),
  });

  return (
    <>
      <input
        {...phone.getInputProps({ 'data-testid': 'partial-country-prefix-input' })}
      />
      <output data-testid="partial-country-prefix-change-count">{changeCount}</output>
      <output data-testid="partial-country-prefix-events">
        {JSON.stringify(selectionEvents)}
      </output>
      <button onClick={() => phone.actions.selectCountry('BY')} type="button">
        Replace partial prefix with Belarus
      </button>
    </>
  );
}

async function pasteText(inputTestId: string, text: string) {
  const locator = page.getByTestId(inputTestId);
  await expect.element(locator).toBeInTheDocument();
  const input = locator.element();

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected a native phone input.');
  }

  input.focus();
  input.select();
  const transfer = new DataTransfer();
  transfer.setData('text/plain', text);
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: transfer,
  });
  input.dispatchEvent(pasteEvent);

  if (pasteEvent.defaultPrevented) {
    return;
  }

  const beforeInput = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: text,
    inputType: 'insertFromPaste',
  });
  input.dispatchEvent(beforeInput);

  if (!beforeInput.defaultPrevented) {
    input.setRangeText(
      text,
      input.selectionStart ?? 0,
      input.selectionEnd ?? input.value.length,
      'end',
    );
  }
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: text,
      inputType: 'insertFromPaste',
    }),
  );
}

describe('usePhoneInput and composable primitives', () => {
  test('exposes one headless state model with actions and prop getters', async () => {
    render(<HeadlessHarness />);
    const input = page.getByTestId('headless-input');

    await expect.element(input).toHaveValue('+1');
    await expect
      .element(page.getByTestId('headless-root'))
      .toHaveAttribute('data-phone-input-status', 'incomplete');
    await userEvent.type(input, '2025550123');
    await expect.element(input).toHaveValue('+1 202 555 0123');
    await expect
      .element(page.getByTestId('headless-value'))
      .toHaveTextContent('+12025550123');
    await expect
      .element(page.getByTestId('headless-callback-count'))
      .toHaveTextContent('10');

    const state = JSON.parse(
      page.getByTestId('headless-state').element().textContent ?? '',
    );
    expect(state).toMatchObject({
      controlled: false,
      displayValue: '+1 202 555 0123',
      numberingPlan: { kind: 'geographic', resolvedCountry: 'US' },
      validation: { accepted: true, status: 'valid' },
      value: '+12025550123',
    });

    await userEvent.click(page.getByRole('button', { name: 'Focus headless input' }));
    await expect.element(input).toHaveFocus();
    await userEvent.click(page.getByRole('button', { name: 'Clear headless input' }));
    await expect.element(input).toHaveValue('');
    await expect
      .element(page.getByTestId('headless-callback-count'))
      .toHaveTextContent('11');
    await userEvent.click(page.getByRole('button', { name: 'Reset headless input' }));
    await expect.element(input).toHaveValue('+1');
    await expect
      .element(page.getByTestId('headless-callback-count'))
      .toHaveTextContent('11');
  });

  test('primitives compose classes, refs, state and accessibility props', async () => {
    render(<PrimitiveHarness />);
    const root = page.getByTestId('primitive-root');
    const input = page.getByTestId('primitive-input');

    await expect.element(root).toHaveClass('MuiPhoneInput-root');
    await expect.element(root).toHaveClass('consumer-root');
    await expect.element(input).toHaveClass('MuiPhoneInput-input');
    await expect.element(input).toHaveClass('consumer-input');
    await expect.element(input).toHaveAttribute('aria-invalid', 'false');

    input.element().focus();
    input.element().blur();
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect
      .element(input)
      .toHaveAttribute('aria-describedby', expect.stringContaining('helper-text'));
    await expect
      .element(page.getByTestId('primitive-validation'))
      .not.toHaveAttribute('aria-live');

    await userEvent.click(page.getByRole('button', { name: 'Focus primitive ref' }));
    await expect.element(input).toHaveFocus();
    await userEvent.type(input, '2025550123');
    await expect
      .element(page.getByTestId('primitive-value'))
      .toHaveTextContent('+12025550123');
    await expect.element(input).toHaveAttribute('aria-invalid', 'false');
    await userEvent.click(page.getByRole('button', { name: 'Clear primitive input' }));
    await expect.element(input).toHaveValue('');
  });

  test('manual error state does not reference a missing validation message', async () => {
    render(<ManualErrorHarness />);
    const input = page.getByTestId('manual-error-input');

    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect.element(input).not.toHaveAttribute('aria-describedby');
    await expect.element(input).not.toHaveAttribute('aria-errormessage');
  });

  test('classifies initial country transitions by ownership source', async () => {
    const controlledValue = await render(
      <InitialCountryReasonHarness
        parameters={{ value: '+375291234567' }}
        testId="initial-controlled-value"
      />,
    );
    await expect
      .element(page.getByTestId('initial-controlled-value-events'))
      .toHaveTextContent('"reason":"external-value"');
    expect(
      JSON.parse(
        page.getByTestId('initial-controlled-value-events').element().textContent ?? '',
      ),
    ).toMatchObject([{ country: 'BY', reason: 'external-value' }]);
    await controlledValue.unmount();

    const controlledCountry = await render(
      <InitialCountryReasonHarness
        parameters={{ selectedCountry: 'BY' }}
        testId="initial-controlled-country"
      />,
    );
    await expect
      .element(page.getByTestId('initial-controlled-country-events'))
      .toHaveTextContent('"reason":"external-value"');
    expect(
      JSON.parse(
        page.getByTestId('initial-controlled-country-events').element().textContent ??
          '',
      ),
    ).toMatchObject([{ country: 'BY', reason: 'external-value' }]);
    await controlledCountry.unmount();

    const defaultCountry = await render(
      <InitialCountryReasonHarness
        parameters={{ defaultCountry: 'BY' }}
        testId="initial-default-country"
      />,
    );
    await expect
      .element(page.getByTestId('initial-default-country-events'))
      .toHaveTextContent('"reason":"default"');
    expect(
      JSON.parse(
        page.getByTestId('initial-default-country-events').element().textContent ?? '',
      ),
    ).toMatchObject([{ country: 'BY', reason: 'default' }]);
    await defaultCountry.unmount();

    const empty = await render(
      <InitialCountryReasonHarness parameters={{}} testId="initial-empty" />,
    );
    await expect
      .element(page.getByTestId('initial-empty-events'))
      .toHaveTextContent('[]');
    await empty.unmount();

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const mixed = await render(
      <InitialCountryReasonHarness
        parameters={{ defaultValue: '+1', value: '+375291234567' }}
        testId="initial-mixed-value"
      />,
    );
    await expect
      .element(page.getByTestId('initial-mixed-value-events'))
      .toHaveTextContent('"reason":"external-value"');
    expect(consoleError).toHaveBeenCalledWith(
      'usePhoneInput received both value and defaultValue; value controls ownership.',
    );
    await mixed.unmount();

    const mixedCountry = await render(
      <InitialCountryReasonHarness
        parameters={{ defaultCountry: 'CA', selectedCountry: 'BY' }}
        testId="initial-mixed-country"
      />,
    );
    await expect
      .element(page.getByTestId('initial-mixed-country-events'))
      .toHaveTextContent('"reason":"external-value"');
    expect(consoleError).toHaveBeenCalledWith(
      'usePhoneInput received both selectedCountry and defaultCountry; selectedCountry controls country ownership.',
    );
    await mixedCountry.unmount();
    consoleError.mockRestore();
  });

  test('commits country selection through the shared transaction state', async () => {
    render(<CountryActionHarness />);
    const input = page.getByTestId('country-action-input');
    const root = page.getByTestId('country-action-root');

    await expect.element(input).toHaveValue('');
    await expect.element(root).toHaveAttribute('data-phone-input-country', 'CA');
    await expect
      .element(page.getByTestId('country-action-country-change'))
      .toHaveTextContent('"reason":"default"');
    await userEvent.click(page.getByRole('button', { name: 'Select Belarus' }));

    await expect.element(input).toHaveValue('+375');
    await expect.element(root).toHaveAttribute('data-phone-input-country', 'BY');
    expect(
      JSON.parse(page.getByTestId('country-action-change').element().textContent ?? ''),
    ).toMatchObject({
      reason: 'country-selection',
      value: '+375',
    });
    let events = JSON.parse(
      page.getByTestId('country-action-country-change').element().textContent ?? '',
    ) as PhoneCountryChangeDetails[];
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      country: 'BY',
      numberingPlan: { resolvedCountry: 'BY', selectedCountry: 'BY' },
      previousCountry: 'CA',
      previousNumberingPlan: { resolvedCountry: 'CA', selectedCountry: 'CA' },
      reason: 'user',
      value: '+375',
    });

    await userEvent.click(page.getByRole('button', { name: 'Reset country action' }));
    await expect.element(input).toHaveValue('');
    await expect.element(root).toHaveAttribute('data-phone-input-country', 'CA');
    events = JSON.parse(
      page.getByTestId('country-action-country-change').element().textContent ?? '',
    ) as PhoneCountryChangeDetails[];
    expect(events).toHaveLength(3);
    expect(events[2]).toMatchObject({
      country: 'CA',
      previousCountry: 'BY',
      reason: 'reset',
    });
  });

  test('emits exactly one input callback for each authority country transition', async () => {
    render(<InputCountryTransitionHarness />);
    const input = page.getByTestId('country-input-transition');

    await userEvent.type(input, '1');
    await expect
      .element(page.getByTestId('country-input-events'))
      .toHaveTextContent('[]');
    await userEvent.type(input, '2025550123');

    const events = JSON.parse(
      page.getByTestId('country-input-events').element().textContent ?? '',
    ) as PhoneCountryChangeDetails[];
    expect(events).toHaveLength(3);
    expect(
      events.map(({ country, previousCountry, reason }) => ({
        country,
        previousCountry,
        reason,
      })),
    ).toEqual([
      { country: 'CA', previousCountry: null, reason: 'input' },
      { country: null, previousCountry: 'CA', reason: 'input' },
      { country: 'US', previousCountry: null, reason: 'input' },
    ]);
    expect(events[2]).toMatchObject({ value: '+12025550123' });
  });

  test('emits a paste country transition with serializable plan details', async () => {
    render(<PasteCountryTransitionHarness />);
    await pasteText('country-paste-transition', '+375 29 123 45 67');
    await expect
      .element(page.getByTestId('country-paste-events'))
      .toHaveTextContent('"reason":"paste"');

    const events = JSON.parse(
      page.getByTestId('country-paste-events').element().textContent ?? '',
    ) as PhoneCountryChangeDetails[];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      country: 'BY',
      numberingPlan: { detectedCountry: 'BY', resolvedCountry: 'BY' },
      previousCountry: null,
      reason: 'paste',
      value: '+375291234567',
    });
  });

  test('emits external-value transitions without controlled callback loops', async () => {
    render(<ExternalCountryTransitionHarness />);
    const eventOutput = page.getByTestId('country-external-events');

    await expect.element(eventOutput).toHaveTextContent('[]');
    await userEvent.click(page.getByRole('button', { name: 'Set Belarus externally' }));
    await expect.element(eventOutput).toHaveTextContent('"reason":"external-value"');
    await userEvent.click(
      page.getByRole('button', { name: 'Set non-geographic externally' }),
    );

    const events = JSON.parse(
      eventOutput.element().textContent ?? '',
    ) as PhoneCountryChangeDetails[];
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      country: 'BY',
      previousCountry: null,
      reason: 'external-value',
    });
    expect(events[1]).toMatchObject({
      country: null,
      numberingPlan: { kind: 'non-geographic', resolvedCountry: null },
      previousCountry: 'BY',
      reason: 'external-value',
    });
  });

  test('does not duplicate a user transition during controlled reconciliation', async () => {
    render(<ControlledCountrySelectionHarness />);
    const eventOutput = page.getByTestId('controlled-country-events');

    await expect.element(eventOutput).toHaveTextContent('"reason":"external-value"');
    await userEvent.click(
      page.getByRole('button', { name: 'Select controlled Belarus' }),
    );
    await expect
      .element(page.getByTestId('controlled-country-input'))
      .toHaveValue('+375');

    const events = JSON.parse(
      eventOutput.element().textContent ?? '',
    ) as PhoneCountryChangeDetails[];
    expect(events.map(({ reason }) => reason)).toEqual(['external-value', 'user']);
  });

  test('reports a distinct external correction when controlled country is rejected', async () => {
    render(<RejectedControlledCountrySelectionHarness />);
    const eventOutput = page.getByTestId('rejected-country-events');

    await expect.element(eventOutput).toHaveTextContent('"reason":"external-value"');
    await userEvent.click(
      page.getByRole('button', { name: 'Reject controlled Belarus' }),
    );
    await expect
      .element(page.getByTestId('rejected-country-input'))
      .toHaveValue('+375');
    await expect.element(eventOutput).toHaveTextContent('"reason":"external-value"');

    const events = JSON.parse(
      eventOutput.element().textContent ?? '',
    ) as PhoneCountryChangeDetails[];
    expect(events.map(({ reason }) => reason)).toEqual([
      'external-value',
      'user',
      'external-value',
    ]);
    expect(events[2]).toMatchObject({
      country: 'BY',
      numberingPlan: { resolvedCountry: 'BY', selectedCountry: null },
      previousCountry: 'BY',
      previousNumberingPlan: { resolvedCountry: 'BY', selectedCountry: 'BY' },
    });
  });

  test('applies an explicit shared-code country selection and emits one typed result', async () => {
    render(<SharedCodeCountrySelectionHarness />);
    const input = page.getByTestId('shared-code-country-input');
    const eventOutput = page.getByTestId('shared-code-country-events');

    await userEvent.click(page.getByRole('button', { name: 'Select Canada' }));
    await expect.element(input).toHaveValue('+1 202 555 0123');
    await expect
      .element(page.getByTestId('shared-code-country-change-count'))
      .toHaveTextContent('1');
    await expect.element(eventOutput).toHaveTextContent('"status":"applied"');

    const events = JSON.parse(
      eventOutput.element().textContent ?? '',
    ) as PhoneCountrySelectionResult[];
    expect(events).toHaveLength(1);
    expect(
      JSON.parse(
        page.getByTestId('shared-code-country-action-result').element().textContent ??
          '',
      ),
    ).toEqual(events[0]);
    expect(events[0]).toMatchObject({
      country: 'CA',
      numberingPlan: { resolvedCountry: 'US', selectedCountry: null },
      previousValue: '+12025550123',
      reason: 'calling-code-preserved',
      status: 'applied',
      value: '+12025550123',
    });
  });

  test('commits a compatible country selection once through the shared result', async () => {
    render(<CountrySelectionAppliedHarness />);
    const eventOutput = page.getByTestId('country-applied-events');

    await userEvent.click(
      page.getByRole('button', { name: 'Select compatible Germany' }),
    );
    await expect
      .element(page.getByTestId('country-applied-input'))
      .toHaveValue('+49 40 123');
    await expect
      .element(page.getByTestId('country-applied-change-count'))
      .toHaveTextContent('1');

    const events = JSON.parse(
      eventOutput.element().textContent ?? '',
    ) as PhoneCountrySelectionResult[];
    expect(events).toHaveLength(1);
    expect(
      JSON.parse(
        page.getByTestId('country-applied-action-result').element().textContent ?? '',
      ),
    ).toEqual(events[0]);
    expect(events[0]).toMatchObject({
      country: 'DE',
      reason: 'national-digits-preserved',
      status: 'applied',
      value: '+4940123',
    });
  });

  test('applies an explicit target country and lets validation own an impossible draft', async () => {
    render(<ImpossibleCountrySelectionHarness />);
    const input = page.getByTestId('country-impossible-input');
    const countryChangeCount = page.getByTestId(
      'country-impossible-country-change-count',
    );

    await expect.element(input).toHaveValue('+247 40123');
    await expect.element(countryChangeCount).toHaveTextContent('1');
    await userEvent.click(
      page.getByRole('button', { name: 'Select impossible Azerbaijan' }),
    );
    await expect.element(input).toHaveValue('+994 40 123');
    await expect
      .element(page.getByTestId('country-impossible-change-count'))
      .toHaveTextContent('1');
    await expect.element(countryChangeCount).toHaveTextContent('2');

    const events = JSON.parse(
      page.getByTestId('country-impossible-events').element().textContent ?? '',
    ) as PhoneCountrySelectionResult[];
    expect(events).toHaveLength(1);
    expect(
      JSON.parse(
        page.getByTestId('country-impossible-action-result').element().textContent ??
          '',
      ),
    ).toEqual(events[0]);
    expect(events[0]).toMatchObject({
      candidateValue: '+99440123',
      country: 'AZ',
      previousValue: '+24740123',
      reason: 'national-digits-preserved',
      status: 'applied',
      value: '+99440123',
    });
  });

  test('replaces a partial international prefix in one country transaction', async () => {
    render(<PartialCountryPrefixHarness />);
    const eventOutput = page.getByTestId('partial-country-prefix-events');

    await userEvent.click(
      page.getByRole('button', { name: 'Replace partial prefix with Belarus' }),
    );
    await expect
      .element(page.getByTestId('partial-country-prefix-input'))
      .toHaveValue('+375');
    await expect
      .element(page.getByTestId('partial-country-prefix-change-count'))
      .toHaveTextContent('1');

    const events = JSON.parse(
      eventOutput.element().textContent ?? '',
    ) as PhoneCountrySelectionResult[];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      candidateValue: '+375',
      country: 'BY',
      previousValue: '+37',
      reason: 'partial-calling-code-replaced',
      status: 'applied',
      value: '+375',
    });
  });

  test('exports the complete typed country-selection applied reasons', () => {
    const reasonKeys: Record<PhoneCountrySelectionAppliedReason, true> = {
      'calling-code-initialized': true,
      'calling-code-preserved': true,
      'national-digits-preserved': true,
      'partial-calling-code-replaced': true,
    };

    expect(Object.keys(reasonKeys).sort()).toEqual([
      'calling-code-initialized',
      'calling-code-preserved',
      'national-digits-preserved',
      'partial-calling-code-replaced',
    ]);
  });

  test('exports the complete typed country reason vocabulary', () => {
    const reasonKeys: Record<PhoneCountryChangeReason, true> = {
      default: true,
      'external-value': true,
      input: true,
      paste: true,
      reset: true,
      user: true,
    };
    const reasons = [
      'default',
      'external-value',
      'input',
      'paste',
      'reset',
      'user',
    ] as const satisfies readonly PhoneCountryChangeReason[];

    expect(reasons).toHaveLength(6);
    expect(Object.keys(reasonKeys).sort()).toEqual([...reasons].sort());
  });
});
