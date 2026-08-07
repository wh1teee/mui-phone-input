import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import type { PhoneExtension } from '../../packages/mui-phone-input/src/phone-extension';
import type { PhoneValue } from '../../packages/mui-phone-input/src/phone-value';
import { MuiPhoneInputController } from '../../packages/mui-phone-input/src/react-hook-form';

type PhoneFormValues = {
  extension: PhoneExtension;
  phone: PhoneValue;
};

function BasicControllerHarness() {
  const [phoneCallbackCount, setPhoneCallbackCount] = useState(0);
  const {
    control,
    formState: { dirtyFields, touchedFields },
    setValue,
  } = useForm<PhoneFormValues>({
    defaultValues: { extension: '12', phone: '+12025550123' },
  });
  const values = useWatch({ control });

  return (
    <>
      <MuiPhoneInputController
        control={control}
        extensionLabel="Extension"
        extensionName="extension"
        extensionPresentation="separate"
        label="Phone"
        name="phone"
        onChange={() => setPhoneCallbackCount((count) => count + 1)}
        slotProps={{
          extension: { htmlInput: { 'data-testid': 'rhf-extension' } },
          htmlInput: { 'data-testid': 'rhf-phone' },
        }}
      />
      <output data-testid="rhf-values">{JSON.stringify(values)}</output>
      <output data-testid="rhf-phone-dirty">
        {String(Boolean(dirtyFields.phone))}
      </output>
      <output data-testid="rhf-extension-dirty">
        {String(Boolean(dirtyFields.extension))}
      </output>
      <output data-testid="rhf-phone-touched">
        {String(Boolean(touchedFields.phone))}
      </output>
      <output data-testid="rhf-extension-touched">
        {String(Boolean(touchedFields.extension))}
      </output>
      <output data-testid="rhf-phone-callback-count">{phoneCallbackCount}</output>
      <button
        onClick={() =>
          setValue('phone', '+80012345678', {
            shouldDirty: false,
            shouldTouch: false,
          })
        }
        type="button"
      >
        Apply external phone
      </button>
    </>
  );
}

function DisabledRequiredHarness() {
  const { control } = useForm<PhoneFormValues>({
    defaultValues: { extension: '42', phone: '+375291234567' },
  });

  return (
    <MuiPhoneInputController
      control={control}
      disabled
      extensionLabel="Required extension"
      extensionName="extension"
      extensionPresentation="separate"
      extensionRequired
      label="Required phone"
      name="phone"
      required
      slotProps={{ htmlInput: { 'data-testid': 'disabled-required-phone' } }}
    />
  );
}

function AsyncResetHarness() {
  const {
    control,
    formState: { isDirty, isLoading },
    reset,
  } = useForm<PhoneFormValues>({
    defaultValues: async () => ({
      extension: '7',
      phone: '+375291234567',
    }),
  });
  const values = useWatch({ control });

  return (
    <>
      <MuiPhoneInputController
        control={control}
        extensionLabel="Async extension"
        extensionName="extension"
        extensionPresentation="separate"
        label="Async phone"
        name="phone"
        slotProps={{ htmlInput: { 'data-testid': 'async-phone' } }}
      />
      <output data-testid="async-values">{JSON.stringify(values)}</output>
      <output data-testid="async-dirty">{String(isDirty)}</output>
      <output data-testid="async-loading">{String(isLoading)}</output>
      <button
        onClick={() => reset({ extension: '9', phone: '+12025550123' })}
        type="button"
      >
        Reset async form
      </button>
    </>
  );
}

function UnregisterHarness() {
  const [mounted, setMounted] = useState(true);
  const [snapshot, setSnapshot] = useState('');
  const { control, getValues } = useForm<PhoneFormValues>({
    defaultValues: { extension: '5', phone: '+12025550123' },
  });

  return (
    <>
      {mounted ? (
        <MuiPhoneInputController
          control={control}
          extensionLabel="Unregister extension"
          extensionName="extension"
          extensionPresentation="separate"
          label="Unregister phone"
          name="phone"
          shouldUnregister
        />
      ) : null}
      <output data-testid="unregister-snapshot">{snapshot}</output>
      <button onClick={() => setMounted(false)} type="button">
        Unmount fields
      </button>
      <button onClick={() => setSnapshot(JSON.stringify(getValues()))} type="button">
        Snapshot values
      </button>
    </>
  );
}

type ContactValues = {
  contacts: Array<{
    extension: PhoneExtension;
    phone: PhoneValue;
  }>;
};

function FieldArrayHarness() {
  const { control } = useForm<ContactValues>({
    defaultValues: {
      contacts: [{ extension: '1', phone: '+12025550123' }],
    },
  });
  const { append, fields } = useFieldArray({ control, name: 'contacts' });
  const contacts = useWatch({ control, name: 'contacts' });

  return (
    <>
      {fields.map((field, index) => (
        <MuiPhoneInputController
          control={control}
          extensionLabel={`Extension ${index + 1}`}
          extensionName={`contacts.${index}.extension` as const}
          extensionPresentation="separate"
          key={field.id}
          label={`Phone ${index + 1}`}
          name={`contacts.${index}.phone` as const}
          slotProps={{
            extension: {
              htmlInput: { 'data-testid': `array-extension-${index}` },
            },
            htmlInput: { 'data-testid': `array-phone-${index}` },
          }}
        />
      ))}
      <output data-testid="array-values">{JSON.stringify(contacts)}</output>
      <button
        onClick={() => append({ extension: '2', phone: '+441481123456' })}
        type="button"
      >
        Add contact
      </button>
    </>
  );
}

function FocusAndServerErrorHarness() {
  const { control, handleSubmit, setError } = useForm<PhoneFormValues>({
    defaultValues: { extension: undefined, phone: '+375291234567' },
    shouldFocusError: true,
  });

  return (
    <form onSubmit={handleSubmit(() => undefined)}>
      <MuiPhoneInputController
        control={control}
        extensionLabel="Focus extension"
        extensionName="extension"
        extensionPresentation="separate"
        extensionRules={{ required: 'Extension is required' }}
        label="Focus phone"
        name="phone"
        slotProps={{ htmlInput: { 'data-testid': 'focus-phone' } }}
      />
      <button type="submit">Submit form</button>
      <button
        onClick={() =>
          setError(
            'phone',
            { message: 'Server rejected phone', type: 'server' },
            { shouldFocus: true },
          )
        }
        type="button"
      >
        Set phone server error
      </button>
      <button
        onClick={() =>
          setError(
            'extension',
            { message: 'Server rejected extension', type: 'server' },
            { shouldFocus: true },
          )
        }
        type="button"
      >
        Set extension server error
      </button>
    </form>
  );
}

function assertActiveElement(locator: ReturnType<typeof page.getByRole>): void {
  expect(locator.element()).toBe(document.activeElement);
}

describe('React Hook Form adapter', () => {
  test('binds canonical number and extension separately with dirty and touched state', async () => {
    render(<BasicControllerHarness />);

    const phone = page.getByTestId('rhf-phone');
    const extension = page.getByTestId('rhf-extension');

    await userEvent.fill(phone, '+375291234567');
    await userEvent.tab();
    await userEvent.fill(extension, '34');
    await userEvent.tab();

    await expect
      .element(page.getByTestId('rhf-values'))
      .toHaveTextContent('{"extension":"34","phone":"+375291234567"}');
    await expect.element(page.getByTestId('rhf-phone-dirty')).toHaveTextContent('true');
    await expect
      .element(page.getByTestId('rhf-extension-dirty'))
      .toHaveTextContent('true');
    await expect
      .element(page.getByTestId('rhf-phone-touched'))
      .toHaveTextContent('true');
    await expect
      .element(page.getByTestId('rhf-extension-touched'))
      .toHaveTextContent('true');
    await expect
      .element(page.getByTestId('rhf-phone-callback-count'))
      .toHaveTextContent('1');

    await userEvent.click(page.getByRole('button', { name: 'Apply external phone' }));

    await expect.element(phone).toHaveValue('+800 1234 5678');
    await expect
      .element(page.getByTestId('rhf-phone-callback-count'))
      .toHaveTextContent('1');
  });

  test('propagates disabled and required semantics to both fields', async () => {
    render(<DisabledRequiredHarness />);

    const phone = page.getByTestId('disabled-required-phone');
    const extension = page.getByRole('textbox', { name: 'Required extension' });

    await expect.element(phone).toBeDisabled();
    await expect.element(phone).toHaveAttribute('required');
    await expect.element(extension).toBeDisabled();
    await expect.element(extension).toHaveAttribute('required');
  });

  test('honors async defaults and reset without losing canonical values', async () => {
    render(<AsyncResetHarness />);

    const phone = page.getByTestId('async-phone');
    const extension = page.getByRole('textbox', { name: 'Async extension' });

    await expect.element(page.getByTestId('async-loading')).toHaveTextContent('false');
    await expect.element(phone).toHaveValue('+375 29 123 45 67');
    await expect.element(extension).toHaveValue('7');

    await userEvent.fill(extension, '77');
    await expect.element(page.getByTestId('async-dirty')).toHaveTextContent('true');
    await userEvent.click(page.getByRole('button', { name: 'Reset async form' }));

    await expect.element(phone).toHaveValue('+1 202 555 0123');
    await expect.element(extension).toHaveValue('9');
    await expect.element(page.getByTestId('async-dirty')).toHaveTextContent('false');
    await expect
      .element(page.getByTestId('async-values'))
      .toHaveTextContent('{"extension":"9","phone":"+12025550123"}');
  });

  test('unregisters both bound fields when the adapter unmounts', async () => {
    render(<UnregisterHarness />);

    await userEvent.click(page.getByRole('button', { name: 'Unmount fields' }));
    await userEvent.click(page.getByRole('button', { name: 'Snapshot values' }));

    await expect
      .element(page.getByTestId('unregister-snapshot'))
      .toHaveTextContent('{}');
  });

  test('supports phone and extension paths inside field arrays', async () => {
    render(<FieldArrayHarness />);

    await userEvent.click(page.getByRole('button', { name: 'Add contact' }));
    await userEvent.fill(page.getByTestId('array-phone-1'), '+375291234567');
    await userEvent.fill(page.getByTestId('array-extension-1'), '88');

    await expect
      .element(page.getByTestId('array-values'))
      .toHaveTextContent(
        '[{"extension":"1","phone":"+12025550123"},{"extension":"88","phone":"+375291234567"}]',
      );
  });

  test('focuses the failing field and composes RHF server errors into MUI errors', async () => {
    render(<FocusAndServerErrorHarness />);

    const phone = page.getByTestId('focus-phone');
    const extension = page.getByRole('textbox', { name: 'Focus extension' });

    await userEvent.click(page.getByRole('button', { name: 'Submit form' }));
    assertActiveElement(extension);
    await expect.element(page.getByText('Extension is required')).toBeInTheDocument();

    await userEvent.click(page.getByRole('button', { name: 'Set phone server error' }));
    assertActiveElement(phone);
    await expect.element(phone).toHaveAttribute('aria-invalid', 'true');
    await expect.element(page.getByText('Server rejected phone')).toBeInTheDocument();

    await userEvent.click(
      page.getByRole('button', { name: 'Set extension server error' }),
    );
    assertActiveElement(extension);
    await expect.element(extension).toHaveAttribute('aria-invalid', 'true');
    await expect
      .element(page.getByText('Server rejected extension'))
      .toBeInTheDocument();
  });
});
