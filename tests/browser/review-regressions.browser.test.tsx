import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { MuiPhoneInput } from '../../packages/mui-phone-input/src';
import {
  PhoneInput,
  type PhoneExtension,
  type PhoneValue,
} from '../../packages/mui-phone-input/src/base-ui';
import '../../packages/mui-phone-input/src/shadcn.css';

type Adapter = 'base' | 'mui';

type FieldProps = {
  defaultCountry?: 'BY' | 'US';
  defaultValue?: PhoneValue;
  displayMode?: 'international' | 'international-fixed-calling-code' | 'national';
  extensionMaxLength?: number;
};

function Field({ adapter, ...props }: FieldProps & { adapter: Adapter }) {
  const [value, setValue] = useState<PhoneValue>(props.defaultValue);
  const [extension, setExtension] = useState<PhoneExtension>();
  const shared = {
    ...(props.defaultCountry === undefined
      ? {}
      : { defaultCountry: props.defaultCountry }),
    ...(props.displayMode === undefined ? {} : { displayMode: props.displayMode }),
    ...(props.extensionMaxLength === undefined
      ? {}
      : { extensionMaxLength: props.extensionMaxLength }),
    extension,
    extensionLabel: 'Extension',
    label: 'Phone',
    onChange: setValue,
    onExtensionChange: setExtension,
    value,
  };
  return (
    <>
      {adapter === 'base' ? (
        <PhoneInput {...shared} />
      ) : (
        <MuiPhoneInput {...shared} extensionPresentation="separate" />
      )}
      <output data-testid="value">{value ?? ''}</output>
      <output data-testid="extension">{extension ?? ''}</output>
    </>
  );
}

function trigger(adapter: Adapter) {
  return page.getByRole(adapter === 'base' ? 'combobox' : 'button', {
    name: /^Select country/u,
  });
}

async function paste(label: string, text: string): Promise<void> {
  const input = page.getByLabelText(label, { exact: true }).element();
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected an input.');
  input.focus();
  input.select();
  const transfer = new DataTransfer();
  transfer.setData('text/plain', text);
  const event = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: transfer,
  });
  if (event.clipboardData?.getData('text/plain') !== text) {
    Object.defineProperty(event, 'clipboardData', { value: transfer });
  }
  input.dispatchEvent(event);
}

for (const adapter of ['base', 'mui'] as const) {
  describe(`${adapter}: review regressions`, () => {
    test('the trigger follows the number, not an incompatible default country', async () => {
      await render(
        <Field adapter={adapter} defaultCountry="BY" defaultValue="+442079460018" />,
      );
      await expect.element(trigger(adapter)).toHaveTextContent('GB');
      await expect.element(trigger(adapter)).not.toHaveTextContent('BY');
    });

    test('a non-geographic number shows no invented country', async () => {
      await render(
        <Field adapter={adapter} defaultCountry="BY" defaultValue="+80012345678" />,
      );
      await expect.element(trigger(adapter)).not.toHaveTextContent('BY');
    });

    test('a tel: paste cannot replace a fixed calling code', async () => {
      await render(
        <Field
          adapter={adapter}
          defaultCountry="BY"
          defaultValue="+375291234567"
          displayMode="international-fixed-calling-code"
        />,
      );
      await paste('Phone', 'tel:+44-20-7946-0018;ext=42');
      await expect
        .element(page.getByTestId('value'))
        .toHaveTextContent('+375291234567');
      await expect.element(page.getByTestId('extension')).toHaveTextContent('');
    });

    test('extensionMaxLength counts digits, not separators', async () => {
      await render(
        <Field adapter={adapter} defaultCountry="US" extensionMaxLength={4} />,
      );
      await userEvent.type(page.getByLabelText('Extension', { exact: true }), '12-34');
      await expect.element(page.getByTestId('extension')).toHaveTextContent('1234');
    });
  });
}

test('base: an application error message wins over built-in validation', async () => {
  await render(
    <PhoneInput
      defaultValue="+1"
      error
      helperText="Server error"
      label="Phone"
      validationDisplay="always"
    />,
  );
  await expect.element(page.getByText('Server error')).toBeVisible();
});
