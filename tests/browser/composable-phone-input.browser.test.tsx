import { useRef, useState } from 'react';
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  PhoneInputInput,
  PhoneInputProvider,
  PhoneInputRoot,
  PhoneInputValidationMessage,
  usePhoneInput,
  usePhoneInputContext,
} from '../../packages/mui-phone-input/src';

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

describe('usePhoneInput and composable primitives', () => {
  test('exposes one headless state model with actions and prop getters', async () => {
    render(<HeadlessHarness />);
    const input = page.getByTestId('headless-input');

    await expect.element(input).toHaveValue('+1');
    await expect
      .element(page.getByTestId('headless-root'))
      .toHaveAttribute('data-phone-input-status', 'incomplete');
    await userEvent.type(input, '2025550123');
    await expect.element(input).toHaveValue('+12025550123');
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
      displayValue: '+12025550123',
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
      .toHaveAttribute('aria-live', 'polite');

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
});
