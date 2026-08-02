import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  type InputEngineCandidateId,
  InputEngineHarness,
} from '../bakeoff/harness/InputEngineHarness';
import { ReactHookFormHarness } from '../bakeoff/harness/ReactHookFormHarness';

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

async function expectOutput(testId: string, expected: string | RegExp) {
  await expect.element(page.getByTestId(testId)).toHaveTextContent(expected);
}

async function dispatchInput(
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

async function pasteText(text: string) {
  const source = document.createElement('textarea');
  source.value = text;
  document.body.append(source);
  source.focus();
  source.select();
  await userEvent.copy();
  source.remove();

  const input = await getInput();
  await waitForInputEngine();
  input.focus();
  input.select();
  await userEvent.paste();
}

function canonicalDigits(): string {
  return (
    document.querySelector('[data-testid="canonical-value"]')?.textContent ?? ''
  ).replaceAll(/\D/gu, '');
}

describe.each(CANDIDATES)('%s extended candidate corpus', (candidate) => {
  test('clears the complete value to undefined with one callback', async () => {
    render(<InputEngineHarness candidate={candidate} initialValue="+12025550123" />);
    const input = await getInput();

    input.focus();
    input.select();
    await userEvent.keyboard('{Backspace}');

    await expectOutput('canonical-value', '');
    await expectOutput('callback-count', '1');
    await expect.element(page.getByTestId('phone-input')).toHaveValue('');
  });

  test('deletes semantic digits next to separators', async () => {
    render(<InputEngineHarness candidate={candidate} initialValue="+12025550123" />);
    const input = await getInput();
    const areaCodeEnd = input.value.indexOf('202') + 3;
    const separatorAfterAreaCode = input.value.indexOf(' ', areaCodeEnd);

    input.focus();
    input.setSelectionRange(separatorAfterAreaCode + 1, separatorAfterAreaCode + 1);
    await userEvent.keyboard('{Backspace}');

    await expect.poll(canonicalDigits).toHaveLength(10);
    await expectOutput('callback-count', '1');

    await page.getByRole('button', { name: 'Reset field' }).click();
    await expectOutput('canonical-value', '+12025550123');
    const resetInput = await getInput();
    const resetAreaCodeEnd = resetInput.value.indexOf('202') + 3;
    const resetSeparator = resetInput.value.indexOf(' ', resetAreaCodeEnd);

    resetInput.focus();
    resetInput.setSelectionRange(resetSeparator, resetSeparator);
    await userEvent.keyboard('{Delete}');

    await expect.poll(canonicalDigits).toHaveLength(10);
    await expectOutput('callback-count', '2');
  });

  test('handles formatted international paste', async () => {
    render(<InputEngineHarness candidate={candidate} />);

    await pasteText('+1 (202) 555-0123');
    await expectOutput('canonical-value', '+12025550123');
    await expectOutput('callback-count', '1');
  });

  test('handles national paste with selected-country context', async () => {
    render(<InputEngineHarness candidate={candidate} country="BY" />);

    await pasteText('29 123 45 67');

    await expectOutput('canonical-value', '+375291234567');
    await expectOutput('callback-count', '1');
  });

  test('applies fixed-calling-code policy to paste', async () => {
    render(<InputEngineHarness candidate={candidate} country="BY" fixedCallingCode />);

    await pasteText('+48 123 456 789');

    await expectOutput('canonical-value', /^\+375/u);
    await expectOutput('callback-count', '1');
  });

  test('accepts predictive replacement through authoritative input', async () => {
    render(<InputEngineHarness candidate={candidate} initialValue="+37529" />);

    await dispatchInput(
      '+375 29 555 55 55',
      'insertReplacementText',
      '+375 29 555 55 55',
    );

    await expectOutput('canonical-value', '+375295555555');
    await expectOutput('callback-count', '1');
  });

  test('preserves canonical value across separator, locale, and country updates', async () => {
    render(
      <InputEngineHarness
        candidate={candidate}
        country="BY"
        initialValue="+442079460958"
      />,
    );

    await page.getByRole('button', { name: 'Change separator' }).click();
    await expectOutput('canonical-value', '+442079460958');
    await expectOutput('callback-count', '0');
    await expectOutput('active-separator', '-');
    expect((await getInput()).value).toContain('-');

    await page.getByRole('button', { name: 'Change locale' }).click();
    await expectOutput('active-locale', 'fr');
    await expectOutput('canonical-value', '+442079460958');
    await expectOutput('callback-count', '0');

    await page.getByRole('button', { name: 'Change country' }).click();
    await expectOutput('active-country', 'GB');
    await expectOutput('canonical-value', '+442079460958');
    await expectOutput('callback-count', '0');
  });

  test('does not double-commit under React Strict Mode', async () => {
    render(
      <StrictMode>
        <InputEngineHarness candidate={candidate} />
      </StrictMode>,
    );

    await dispatchInput('+375 29 123 45 67', 'insertText', '7');

    await expectOutput('canonical-value', '+375291234567');
    await expectOutput('callback-count', '1');
  });

  test('resets coherently through React Hook Form', async () => {
    render(<ReactHookFormHarness candidate={candidate} initialValue="+375291234567" />);

    await dispatchInput('+44 20 7946 0958', 'insertReplacementText', null);
    await expectOutput('rhf-value', '+442079460958');
    await expectOutput('rhf-dirty', 'true');

    await page.getByRole('button', { name: 'Reset form' }).click();
    await expectOutput('rhf-value', '+375291234567');
    await expectOutput('rhf-dirty', 'false');
    await expect
      .element(page.getByTestId('phone-input'))
      .toHaveValue(expect.stringContaining('375'));
  });

  test('renders on the server and hydrates without recovery errors', async () => {
    const recoverableErrors: unknown[] = [];
    const element = (
      <InputEngineHarness candidate={candidate} initialValue="+12025550123" />
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    document.body.append(container);

    const root = hydrateRoot(container, element, {
      onRecoverableError(error) {
        recoverableErrors.push(error);
      },
    });

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const hydratedInput = container.querySelector('input');
    expect(hydratedInput).toBeInstanceOf(HTMLInputElement);
    expect(recoverableErrors).toEqual([]);

    root.unmount();
    container.remove();
  });

  test('records native undo and redo behavior', async () => {
    render(<InputEngineHarness candidate={candidate} />);
    const input = await getInput();

    input.focus();
    await userEvent.keyboard('+1202');
    await expectOutput('canonical-value', '+1202');
    const typedValue = input.value;

    await userEvent.keyboard('{Control>}z{/Control}');
    const afterUndo = input.value;

    await userEvent.keyboard('{Control>}y{/Control}');
    const afterRedo = input.value;

    expect(afterUndo).not.toBe(typedValue);
    expect(afterRedo).toBe(typedValue);
  });
});
