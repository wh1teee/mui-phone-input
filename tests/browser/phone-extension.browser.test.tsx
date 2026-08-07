import axe from 'axe-core';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  MuiPhoneInput,
  type MuiPhoneInputExtensionSlotComponentProps,
  type MuiPhoneInputSlotProps,
  type PhoneExtension,
  type PhoneExtensionPresentation,
  type PhoneValue,
} from '../../packages/mui-phone-input/src';

function ControlledExtensionHarness({
  extensionMaxLength,
  selectedCountry,
}: Readonly<{
  extensionMaxLength?: number;
  selectedCountry?: 'US';
}> = {}) {
  const [value, setValue] = useState<PhoneValue>('+12025550123');
  const [extension, setExtension] = useState<PhoneExtension>('12');

  return (
    <>
      <MuiPhoneInput
        extension={extension}
        extensionLabel="Extension"
        {...(extensionMaxLength === undefined ? {} : { extensionMaxLength })}
        extensionPresentation="separate"
        label="Phone"
        onChange={setValue}
        onExtensionChange={setExtension}
        {...(selectedCountry === undefined ? {} : { selectedCountry })}
        slotProps={{ htmlInput: { 'data-testid': 'extension-phone' } }}
        value={value}
      />
      <output data-testid="extension-value">{extension ?? ''}</output>
      <output data-testid="phone-value">{value ?? ''}</output>
    </>
  );
}

function UncontrolledExtensionResetHarness() {
  const [callbackCount, setCallbackCount] = useState(0);

  return (
    <form>
      <MuiPhoneInput
        defaultExtension="9"
        defaultValue="+12025550123"
        extensionLabel="Reset extension"
        extensionPresentation="separate"
        onExtensionChange={() => setCallbackCount((count) => count + 1)}
        slotProps={{ htmlInput: { 'data-testid': 'reset-phone' } }}
      />
      <output data-testid="extension-callback-count">{callbackCount}</output>
      <button type="reset">Reset extension form</button>
    </form>
  );
}

function ExtensionPresentationHarness() {
  const [extension, setExtension] = useState<PhoneExtension>('7');
  const [presentation, setPresentation] =
    useState<PhoneExtensionPresentation>('inline');

  return (
    <>
      <MuiPhoneInput
        extension={extension}
        extensionLabel="Inline extension"
        extensionPresentation={presentation}
        onExtensionChange={setExtension}
        renderExtension={({ inputProps }) => (
          <input
            {...inputProps}
            aria-label="Custom extension"
            data-testid="custom-extension"
          />
        )}
        value="+12025550123"
      />
      <output data-testid="presentation-extension-value">{extension ?? ''}</output>
      <button onClick={() => setPresentation('custom')} type="button">
        Custom extension UI
      </button>
      <button onClick={() => setPresentation('none')} type="button">
        Hide extension UI
      </button>
    </>
  );
}

function ExtensionFormattingHarness() {
  const [displayMode, setDisplayMode] = useState<'international' | 'national'>(
    'international',
  );
  const [masked, setMasked] = useState(false);
  const [country, setCountry] = useState<'US' | 'CA'>('US');

  return (
    <>
      <MuiPhoneInput
        displayMode={displayMode}
        extension="42"
        extensionLabel="Stable extension"
        extensionPresentation="separate"
        selectedCountry={country}
        value="+12025550123"
        {...(masked ? { displayMask: { pattern: '###.###.####' } } : {})}
      />
      <button onClick={() => setDisplayMode('national')} type="button">
        National format
      </button>
      <button onClick={() => setMasked(true)} type="button">
        Masked format
      </button>
      <button onClick={() => setCountry('CA')} type="button">
        Canada country
      </button>
    </>
  );
}

function ExternalExtensionHarness() {
  const [extension, setExtension] = useState<PhoneExtension>('5');
  const [callbackCount, setCallbackCount] = useState(0);

  return (
    <>
      <MuiPhoneInput
        disableCountrySelector
        extension={extension}
        extensionLabel="External extension"
        extensionPresentation="separate"
        label="External phone"
        onExtensionChange={(nextExtension) => {
          setExtension(nextExtension);
          setCallbackCount((count) => count + 1);
        }}
        value="+12025550123"
      />
      <output data-testid="external-extension-callbacks">{callbackCount}</output>
      <button onClick={() => setExtension('88')} type="button">
        Apply external extension
      </button>
    </>
  );
}

function RejectedExtensionHarness() {
  const [callbackCount, setCallbackCount] = useState(0);

  return (
    <>
      <MuiPhoneInput
        disableCountrySelector
        extension="5"
        extensionLabel="Rejected extension"
        extensionPresentation="separate"
        label="Rejected phone"
        onExtensionChange={() => setCallbackCount((count) => count + 1)}
        value="+12025550123"
      />
      <output data-testid="rejected-extension-callbacks">{callbackCount}</output>
    </>
  );
}

function CustomExtensionSlot({
  ownerState,
  ...props
}: MuiPhoneInputExtensionSlotComponentProps) {
  return (
    <TextField
      {...props}
      data-extension-owner-state={ownerState.extensionPresentation}
      data-testid="extension-slot-root"
    />
  );
}

async function pasteText(inputTestId: string, text: string): Promise<void> {
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
  if (pasteEvent.clipboardData?.getData('text/plain') !== text) {
    Object.defineProperty(pasteEvent, 'clipboardData', {
      configurable: true,
      value: transfer,
    });
  }
  const pasteNotCancelled = input.dispatchEvent(pasteEvent);

  if (!pasteNotCancelled || pasteEvent.defaultPrevented) {
    return;
  }

  input.setRangeText(text, 0, input.value.length, 'end');
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: text,
      inputType: 'insertFromPaste',
    }),
  );
}

describe('MuiPhoneInput extensions', () => {
  test('keeps a separate controlled extension independent from Phone Value', async () => {
    render(<ControlledExtensionHarness />);

    const phone = page.getByTestId('extension-phone');
    const extension = page.getByRole('textbox', { name: 'Extension' });

    await expect.element(phone).toHaveValue('+1 202 555 0123');
    await expect.element(extension).toHaveValue('12');

    await userEvent.type(extension, '34');

    await expect.element(extension).toHaveValue('1234');
    await expect.element(page.getByTestId('extension-value')).toHaveTextContent('1234');
    await expect
      .element(page.getByTestId('phone-value'))
      .toHaveTextContent('+12025550123');
  });

  test('applies extensionMaxLength only when the consumer opts into that policy', async () => {
    render(
      <MuiPhoneInput
        defaultExtension="12"
        defaultValue="+12025550123"
        extensionLabel="Policy extension"
        extensionMaxLength={4}
        extensionPresentation="separate"
      />,
    );

    const extension = page.getByRole('textbox', { name: 'Policy extension' });
    await userEvent.type(extension, '3456');

    await expect.element(extension).toHaveValue('1234');
    await expect.element(extension).toHaveAttribute('maxlength', '4');
  });

  test('atomically imports an RFC 3966 telephone URI into phone and extension state', async () => {
    render(<ControlledExtensionHarness />);

    await pasteText('extension-phone', 'tel:+44-20-7946-0018;ext=456');

    await expect
      .element(page.getByTestId('phone-value'))
      .toHaveTextContent('+442079460018');
    await expect.element(page.getByTestId('extension-value')).toHaveTextContent('456');
    await expect
      .element(page.getByRole('textbox', { name: 'Extension' }))
      .toHaveValue('456');
  });

  test('atomically imports a formatted number with a human-readable extension', async () => {
    render(<ControlledExtensionHarness />);

    await pasteText('extension-phone', '+44 20 7946 0018 ext. 456');

    expect(page.getByTestId('phone-value').element().textContent).toBe('+442079460018');
    expect(page.getByTestId('extension-value').element().textContent).toBe('456');
    await expect
      .element(page.getByRole('textbox', { name: 'Extension' }))
      .toHaveValue('456');
  });

  test('rejects a malformed human-readable extension without contaminating Phone Value', async () => {
    render(<ControlledExtensionHarness />);

    await pasteText('extension-phone', '+44 20 7946 0018 ext. 45A');

    expect(page.getByTestId('phone-value').element().textContent).toBe('+12025550123');
    expect(page.getByTestId('extension-value').element().textContent).toBe('12');
  });

  test('uses the selected country when importing a national number with extension', async () => {
    render(<ControlledExtensionHarness selectedCountry="US" />);

    await pasteText('extension-phone', '(415) 555-2671 ext. 77');

    expect(page.getByTestId('phone-value').element().textContent).toBe('+14155552671');
    expect(page.getByTestId('extension-value').element().textContent).toBe('77');
  });

  test('imports RFC 3966 scheme and extension parameters case-insensitively', async () => {
    render(<ControlledExtensionHarness />);

    await pasteText('extension-phone', 'TEL:+44-20-7946-0018;EXT=456');

    expect(page.getByTestId('phone-value').element().textContent).toBe('+442079460018');
    expect(page.getByTestId('extension-value').element().textContent).toBe('456');
  });

  test('applies extensionMaxLength to RFC 3966 imports in the same transaction', async () => {
    render(<ControlledExtensionHarness extensionMaxLength={3} />);

    await pasteText('extension-phone', 'tel:+44-20-7946-0018;ext=45678');

    await expect
      .element(page.getByTestId('phone-value'))
      .toHaveTextContent('+442079460018');
    expect(page.getByTestId('extension-value').element().textContent).toBe('456');
  });

  test('clears an existing extension when an imported RFC 3966 URI has none', async () => {
    render(<ControlledExtensionHarness />);

    await pasteText('extension-phone', 'tel:+44-20-7946-0018');

    expect(page.getByTestId('phone-value').element().textContent).toBe('+442079460018');
    expect(page.getByTestId('extension-value').element().textContent).toBe('');
    await expect
      .element(page.getByRole('textbox', { name: 'Extension' }))
      .toHaveValue('');
  });

  test('rejects a malformed RFC 3966 extension without mutating either state', async () => {
    render(<ControlledExtensionHarness />);

    await pasteText('extension-phone', 'tel:+44-20-7946-0018;ext=45A');

    await expect
      .element(page.getByTestId('phone-value'))
      .toHaveTextContent('+12025550123');
    await expect.element(page.getByTestId('extension-value')).toHaveTextContent('12');
    await expect
      .element(page.getByRole('textbox', { name: 'Extension' }))
      .toHaveValue('12');
  });

  test('restores uncontrolled extension defaults on form reset without a synthetic change', async () => {
    render(<UncontrolledExtensionResetHarness />);

    const extension = page.getByRole('textbox', { name: 'Reset extension' });
    await userEvent.type(extension, '8');
    await expect.element(extension).toHaveValue('98');
    await expect
      .element(page.getByTestId('extension-callback-count'))
      .toHaveTextContent('1');

    await userEvent.click(page.getByRole('button', { name: 'Reset extension form' }));

    await expect.element(extension).toHaveValue('9');
    await expect
      .element(page.getByTestId('extension-callback-count'))
      .toHaveTextContent('1');
  });

  test('shares one extension state across inline, custom, and hidden presentations', async () => {
    render(<ExtensionPresentationHarness />);

    const inline = page.getByRole('textbox', { name: 'Inline extension' });
    await expect.element(inline).toHaveValue('7');
    await userEvent.type(inline, '8');
    await expect
      .element(page.getByTestId('presentation-extension-value'))
      .toHaveTextContent('78');

    await userEvent.click(page.getByRole('button', { name: 'Custom extension UI' }));
    const custom = page.getByRole('textbox', { name: 'Custom extension' });
    await expect.element(custom).toHaveValue('78');
    await userEvent.type(custom, '9');
    await expect
      .element(page.getByTestId('presentation-extension-value'))
      .toHaveTextContent('789');

    await userEvent.click(page.getByRole('button', { name: 'Hide extension UI' }));
    await expect
      .element(page.getByTestId('presentation-extension-value'))
      .toHaveTextContent('789');
    await expect.element(page.getByTestId('custom-extension')).not.toBeInTheDocument();
  });

  test('associates extension errors and required state accessibly', async () => {
    render(
      <>
        <MuiPhoneInput
          extension="7"
          extensionError
          extensionHelperText="Extension is required for routing"
          extensionLabel="Routing extension"
          extensionPresentation="separate"
          extensionRequired
          id="a11y-extension-phone"
          label="Routing phone"
          value="+12025550123"
        />
        <MuiPhoneInput
          disabled
          extension="9"
          extensionLabel="Disabled extension"
          extensionPresentation="separate"
          id="disabled-extension-phone"
          label="Disabled phone"
          value="+12025550123"
        />
        <MuiPhoneInput
          extension="3"
          extensionError
          extensionHelperText="Inline extension error"
          extensionLabel="Inline error extension"
          extensionPresentation="inline"
          id="inline-error-phone"
          label="Inline error phone"
          value="+12025550123"
        />
      </>,
    );

    const extension = page.getByRole('textbox', { name: 'Routing extension' });
    await expect
      .element(extension)
      .toHaveAttribute('id', 'a11y-extension-phone-extension');
    await expect.element(extension).toHaveAttribute('required');
    await expect.element(extension).toHaveAttribute('aria-invalid', 'true');
    await expect
      .element(extension)
      .toHaveAttribute(
        'aria-errormessage',
        'a11y-extension-phone-extension-helper-text',
      );
    expect(
      extension.element().getAttribute('aria-describedby')?.split(/\s+/u),
    ).toContain('a11y-extension-phone-extension-helper-text');
    await expect
      .element(page.getByText('Extension is required for routing'))
      .toHaveAttribute('id', 'a11y-extension-phone-extension-helper-text');
    await expect
      .element(page.getByRole('textbox', { name: 'Disabled extension' }))
      .toBeDisabled();
    const inlineExtension = page.getByRole('textbox', {
      name: 'Inline error extension',
    });
    await expect
      .element(inlineExtension)
      .toHaveAttribute('aria-errormessage', 'inline-error-phone-extension-helper-text');
    await expect
      .element(page.getByText('Inline extension error'))
      .toHaveAttribute('id', 'inline-error-phone-extension-helper-text');

    const accessibility = await axe.run(document.body, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
      },
    });
    const violations = accessibility.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('keeps extension state stable through country and formatting changes', async () => {
    render(<ExtensionFormattingHarness />);

    const extension = page.getByRole('textbox', { name: 'Stable extension' });
    await expect.element(extension).toHaveValue('42');

    await userEvent.click(page.getByRole('button', { name: 'National format' }));
    await expect.element(extension).toHaveValue('42');
    await userEvent.click(page.getByRole('button', { name: 'Masked format' }));
    await expect.element(extension).toHaveValue('42');
    await userEvent.click(page.getByRole('button', { name: 'Canada country' }));
    await expect.element(extension).toHaveValue('42');
  });

  test('reconciles external controlled extension updates without emitting changes', async () => {
    render(<ExternalExtensionHarness />);

    const extension = page.getByRole('textbox', { name: 'External extension' });
    await expect.element(extension).toHaveValue('5');

    await userEvent.click(
      page.getByRole('button', { name: 'Apply external extension' }),
    );
    await expect.element(extension).toHaveValue('88');
    expect(page.getByTestId('external-extension-callbacks').element().textContent).toBe(
      '0',
    );

    await userEvent.type(extension, '9');
    await expect.element(extension).toHaveValue('889');
    expect(page.getByTestId('external-extension-callbacks').element().textContent).toBe(
      '1',
    );
  });

  test('restores the authoritative controlled extension when a parent rejects an edit', async () => {
    render(<RejectedExtensionHarness />);

    const extension = page.getByRole('textbox', { name: 'Rejected extension' });
    await expect.element(extension).toHaveValue('5');
    await userEvent.type(extension, '9');

    await expect.element(extension).toHaveValue('5');
    expect(page.getByTestId('rejected-extension-callbacks').element().textContent).toBe(
      '1',
    );
  });

  test('restores a controlled extension when the parent ignores an edit without rerendering', async () => {
    const onExtensionChange = vi.fn();
    render(
      <MuiPhoneInput
        disableCountrySelector
        extension="5"
        extensionLabel="Static extension"
        extensionPresentation="separate"
        onExtensionChange={onExtensionChange}
        value="+12025550123"
      />,
    );

    const extension = page.getByRole('textbox', { name: 'Static extension' });
    await userEvent.type(extension, '9');

    await expect.element(extension).toHaveValue('5');
    expect(onExtensionChange).toHaveBeenCalledOnce();
    expect(onExtensionChange.mock.calls[0]?.[1].previousExtension).toBe('5');

    await userEvent.type(extension, '8');

    await expect.element(extension).toHaveValue('5');
    expect(onExtensionChange).toHaveBeenCalledTimes(2);
    expect(onExtensionChange.mock.calls[1]?.[0]).toBe('58');
    expect(onExtensionChange.mock.calls[1]?.[1].previousExtension).toBe('5');
  });

  test('keeps native tab order from phone input to a separate extension field', async () => {
    render(
      <MuiPhoneInput
        disableCountrySelector
        extension="12"
        extensionLabel="Focusable extension"
        extensionPresentation="separate"
        label="Focusable phone"
        slotProps={{ htmlInput: { 'data-testid': 'focus-phone' } }}
        value="+12025550123"
      />,
    );

    const phone = page.getByTestId('focus-phone');
    const extension = page.getByRole('textbox', { name: 'Focusable extension' });
    await expect.element(phone).toBeInTheDocument();
    phone.element().focus();
    await expect.element(phone).toHaveFocus();
    await userEvent.tab();
    await expect.element(extension).toHaveFocus();
  });

  test('rejects malformed extension edits and supports extension slots and slotProps', async () => {
    render(
      <MuiPhoneInput
        disableCountrySelector
        defaultExtension="12"
        extensionLabel="Slotted extension"
        extensionPresentation="separate"
        label="Slotted phone"
        slotProps={
          {
            extension: {
              htmlInput: {
                'data-extension-consumer': 'true',
              },
              slotProps: {
                htmlInput: {
                  id: 'hijacked-extension-id',
                  value: '999',
                },
              },
            },
          } as unknown as MuiPhoneInputSlotProps
        }
        slots={{ extension: CustomExtensionSlot }}
        value="+12025550123"
      />,
    );

    const extension = page.getByRole('textbox', { name: 'Slotted extension' });
    await expect
      .element(page.getByTestId('extension-slot-root'))
      .toHaveAttribute('data-extension-owner-state', 'separate');
    await expect.element(extension).toHaveAttribute('data-extension-consumer', 'true');
    await expect.element(extension).toHaveValue('12');
    expect(extension.element().id).not.toBe('hijacked-extension-id');

    await userEvent.type(extension, 'A');
    await expect.element(extension).toHaveValue('12');
  });

  test('renders extension state on the server and hydrates deterministically', async () => {
    const recoverableErrors: unknown[] = [];
    const element = (
      <MuiPhoneInput
        extension="314"
        extensionLabel="SSR extension"
        extensionPresentation="separate"
        id="ssr-extension-phone"
        label="SSR phone"
        value="+12025550123"
      />
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    document.body.append(container);

    const serverExtension = container.querySelector<HTMLInputElement>(
      '#ssr-extension-phone-extension',
    );
    expect(serverExtension?.value).toBe('314');

    const root = hydrateRoot(container, element, {
      onRecoverableError(error) {
        recoverableErrors.push(error);
      },
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(
      container.querySelector<HTMLInputElement>('#ssr-extension-phone-extension')
        ?.value,
    ).toBe('314');
    expect(recoverableErrors).toEqual([]);

    root.unmount();
    container.remove();
  });
});
