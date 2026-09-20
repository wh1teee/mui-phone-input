import { useForm } from 'react-hook-form';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { PhoneInputController } from '../../packages/mui-phone-input/src/base-ui-react-hook-form';
import type {
  PhoneExtension,
  PhoneValue,
} from '../../packages/mui-phone-input/src/headless';

type Contact = { phone: PhoneValue; extension: PhoneExtension };

test('RHF binds phone and extension, preserves zeros, resets and focuses native refs', async () => {
  const submitted = vi.fn();
  function Form() {
    const { control, handleSubmit, reset, setFocus, setError } = useForm<Contact>({
      defaultValues: { phone: '+375291234567', extension: '007' },
    });
    return (
      <form onSubmit={handleSubmit(submitted)}>
        <PhoneInputController
          control={control}
          name="phone"
          label="Phone"
          extensionName="extension"
          extensionLabel="Extension"
        />
        <button type="submit">Submit</button>
        <button
          type="button"
          onClick={() => reset({ phone: '+442079460018', extension: '0008' })}
        >
          Reset
        </button>
        <button type="button" onClick={() => setFocus('phone')}>
          Focus phone
        </button>
        <button type="button" onClick={() => setFocus('extension')}>
          Focus extension
        </button>
        <button
          type="button"
          onClick={() => setError('extension', { message: 'Extension unavailable' })}
        >
          Server error
        </button>
      </form>
    );
  }
  await render(<Form />);
  await page.getByLabelText('Phone', { exact: true }).fill('+12133734253');
  await page.getByLabelText('Extension', { exact: true }).fill('0012');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect
    .poll(() => submitted.mock.calls[0]?.[0])
    .toEqual({ phone: '+12133734253', extension: '0012' });
  await page.getByRole('button', { name: 'Focus phone', exact: true }).click();
  await expect.element(page.getByLabelText('Phone', { exact: true })).toHaveFocus();
  await page.getByRole('button', { name: 'Focus extension', exact: true }).click();
  await expect.element(page.getByLabelText('Extension', { exact: true })).toHaveFocus();
  await page.getByRole('button', { name: 'Server error', exact: true }).click();
  await expect
    .element(page.getByLabelText('Extension', { exact: true }))
    .toHaveAttribute('aria-invalid', 'true');
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('Extension unavailable');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect
    .element(page.getByLabelText('Extension', { exact: true }))
    .toHaveValue('0008');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect
    .poll(() => submitted.mock.calls.at(-1)?.[0])
    .toEqual({ phone: '+442079460018', extension: '0008' });
});

test('RHF required errors keep the number and focus on the native phone input', async () => {
  const submitted = vi.fn();
  function Form() {
    const { control, handleSubmit } = useForm<Contact>({
      defaultValues: { phone: undefined, extension: undefined },
    });
    return (
      <form onSubmit={handleSubmit(submitted)}>
        <PhoneInputController
          control={control}
          name="phone"
          label="Phone"
          rules={{ required: 'Enter a phone number' }}
        />
        <button type="submit">Submit</button>
      </form>
    );
  }
  await render(<Form />);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect.element(page.getByLabelText('Phone', { exact: true })).toHaveFocus();
  await expect.element(page.getByText('Enter a phone number')).toBeVisible();
  expect(submitted).not.toHaveBeenCalled();
});
