import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  type InputEngineCandidateId,
  InputEngineHarness,
} from '../bakeoff/harness/InputEngineHarness';

const CANDIDATES = [
  'maskito',
  'adapted-input-format',
] as const satisfies readonly InputEngineCandidateId[];

async function getInput(): Promise<HTMLInputElement> {
  const locator = page.getByTestId('phone-input');
  await expect.element(locator).toBeInTheDocument();
  const input = locator.element();

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Phone input locator did not resolve to an input.');
  }

  return input;
}

async function waitForInputEngine(): Promise<void> {
  await expect
    .element(page.getByTestId('phone-input'))
    .toHaveAttribute('data-engine-ready', 'true');
}

function setBrowserValue(input: HTMLInputElement, value: string): void {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;

  if (!nativeSetter) {
    throw new Error('Missing native HTMLInputElement value setter.');
  }

  nativeSetter.call(input, value);
}

function getOutput(testId: string): string {
  const output = document.querySelector<HTMLOutputElement>(`[data-testid="${testId}"]`);

  if (!output) {
    throw new Error(`Missing output ${testId}.`);
  }

  return output.value || output.textContent || '';
}

async function expectOutput(testId: string, expected: string | RegExp) {
  await expect.element(page.getByTestId(testId)).toHaveTextContent(expected);
}

async function dispatchAuthoritativeInput(
  value: string,
  inputType: string,
  data: string | null = null,
) {
  const input = await getInput();
  await waitForInputEngine();
  setBrowserValue(input, value);
  input.setSelectionRange(value.length, value.length);
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data,
      inputType,
    }),
  );
}

async function dispatchRangeReplacement(
  input: HTMLInputElement,
  start: number,
  end: number,
  replacement: string,
) {
  input.focus();
  input.setSelectionRange(start, end);
  input.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: replacement,
      inputType: 'insertReplacementText',
    }),
  );
  input.setRangeText(replacement, start, end, 'end');
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: replacement,
      inputType: 'insertReplacementText',
    }),
  );
}

describe.each(CANDIDATES)('%s candidate', (candidate) => {
  test('inserts at the start and end of a partial candidate', async () => {
    render(<InputEngineHarness candidate={candidate} initialValue="+1202" />);
    const input = await getInput();

    input.focus();
    input.setSelectionRange(1, 1);
    await userEvent.keyboard('9');
    await expectOutput('canonical-value', '+91202');
    expect(input.selectionStart).toBeGreaterThan(1);

    await page.getByRole('button', { name: 'Reset field' }).click();
    await expectOutput('canonical-value', '+1202');
    const resetInput = await getInput();
    resetInput.focus();
    resetInput.setSelectionRange(resetInput.value.length, resetInput.value.length);
    await userEvent.keyboard('5');

    await expectOutput('canonical-value', '+12025');
    expect(resetInput.selectionStart).toBe(resetInput.value.length);
  });

  test('normalizes international input and emits one callback', async () => {
    render(<InputEngineHarness candidate={candidate} />);

    await dispatchAuthoritativeInput(
      '+375 29 123-45-67',
      'insertReplacementText',
      null,
    );

    await expectOutput('canonical-value', '+375291234567');
    await expectOutput('callback-count', '1');
  });

  test('preserves semantic selection for middle insert and range replacement', async () => {
    render(<InputEngineHarness candidate={candidate} initialValue="+12025550123" />);
    const input = await getInput();

    input.focus();
    const firstFive = input.value.indexOf('5');
    input.setSelectionRange(firstFive, firstFive);
    await userEvent.keyboard('8');

    await expectOutput('canonical-value', /8/u);
    if (candidate === 'maskito') {
      expect(input.selectionStart).toBeGreaterThan(firstFive);
    } else {
      expect(input.selectionStart).toBe(firstFive);
    }

    await page.getByRole('button', { name: 'Reset field' }).click();
    await expectOutput('canonical-value', '+12025550123');
    const resetInput = await getInput();
    const selectionStart = resetInput.value.indexOf('202');
    await dispatchRangeReplacement(
      resetInput,
      selectionStart,
      selectionStart + 3,
      '999',
    );

    await expectOutput('canonical-value', '+19995550123');
    expect(resetInput.selectionStart).toBeLessThanOrEqual(resetInput.value.length);
  });

  test('uses input as the authoritative autofill fallback', async () => {
    render(<InputEngineHarness candidate={candidate} initialValue="+12025550123" />);

    await dispatchAuthoritativeInput('+44 20 7946 0958', 'insertReplacementText', null);

    await expectOutput('canonical-value', '+442079460958');
    await expectOutput('callback-count', '1');
  });

  test('commits only after composition ends and normalizes Unicode digits', async () => {
    render(<InputEngineHarness candidate={candidate} />);
    const input = await getInput();

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '+١٢٣';
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '١٢٣',
        inputType: 'insertCompositionText',
        isComposing: true,
      }),
    );

    expect(getOutput('canonical-value')).toBe('');

    input.dispatchEvent(
      new CompositionEvent('compositionend', {
        bubbles: true,
        data: '+١٢٣',
      }),
    );

    await expectOutput('canonical-value', '+123');
    await expectOutput('callback-count', '1');
  });

  test('external updates and reset do not create callback loops', async () => {
    render(<InputEngineHarness candidate={candidate} initialValue="+375291234567" />);

    await page.getByRole('button', { name: 'Set external value' }).click();
    await expectOutput('canonical-value', '+442079460958');
    await expectOutput('callback-count', '0');

    await page.getByRole('button', { name: 'Set external value' }).click();
    await expectOutput('callback-count', '0');

    await dispatchAuthoritativeInput('+1 202 555 0123', 'insertReplacementText', null);
    await expectOutput('callback-count', '1');

    await page.getByRole('button', { name: 'Reset field' }).click();
    await expectOutput('canonical-value', '+375291234567');
    await expectOutput('callback-count', '1');
  });

  test('supports a fixed calling code and native input ref', async () => {
    render(<InputEngineHarness candidate={candidate} country="BY" fixedCallingCode />);

    await dispatchAuthoritativeInput('+48 123 456 789', 'insertReplacementText', null);

    await expectOutput('canonical-value', /^\+375/u);

    await page.getByRole('button', { name: 'Focus phone input' }).click();
    expect(document.activeElement).toBe(await getInput());
  });
});
