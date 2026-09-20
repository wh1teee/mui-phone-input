import axe from 'axe-core';
import { useRef, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { MuiPhoneInput } from '../../packages/mui-phone-input/src';
import {
  PhoneInput,
  PhoneInputCountrySelector,
  type PhoneValue,
  usePhoneInput,
} from '../../packages/mui-phone-input/src/base-ui';
import { ru } from '../../packages/mui-phone-input/src/locales/ru';
import '../../packages/mui-phone-input/src/shadcn.css';

function Controlled({ adapter }: { adapter: 'base' | 'mui' }) {
  const [value, setValue] = useState<PhoneValue>();
  const [reason, setReason] = useState('');
  const props = {
    defaultCountry: 'BY' as const,
    label: 'Phone',
    onChange: (next: PhoneValue, details: { reason: string }) => {
      setValue(next);
      setReason(details.reason);
    },
    value,
  };
  return (
    <>
      {adapter === 'base' ? <PhoneInput {...props} /> : <MuiPhoneInput {...props} />}
      <output data-testid="value">{value ?? ''}</output>
      <output data-testid="reason">{reason}</output>
      <button onClick={() => setValue(undefined)} type="button">
        Reset externally
      </button>
    </>
  );
}

for (const adapter of ['base', 'mui'] as const) {
  describe(`${adapter} shared editing contract`, () => {
    test('national input, mid-string replacement, clear and controlled reset', async () => {
      await render(<Controlled adapter={adapter} />);
      const input = page.getByLabelText('Phone', { exact: true });
      // Exercise actual incremental typing. Playwright's fill() emits different
      // replacement metadata across engines and is not a native autofill proof.
      await input.click();
      await userEvent.keyboard('291234567');
      await expect
        .element(page.getByTestId('value'))
        .toHaveTextContent('+375291234567');
      const element = input.element() as HTMLInputElement;
      const firstDigit = element.value.indexOf('123');
      element.focus();
      element.setSelectionRange(firstDigit, firstDigit + 1);
      await userEvent.keyboard('9');
      await expect
        .element(page.getByTestId('value'))
        .toHaveTextContent('+375299234567');
      await page.getByRole('button', { name: 'Reset externally' }).click();
      await expect.element(input).toHaveValue('');
      await input.fill('+442079460018');
      await expect
        .element(page.getByTestId('value'))
        .toHaveTextContent('+442079460018');
      await input.clear();
      await expect.element(page.getByTestId('value')).toHaveTextContent('');
    });

    test('native form reset restores uncontrolled initial value', async () => {
      const props = {
        label: 'Phone',
        defaultCountry: 'BY' as const,
        defaultValue: '+375291234567' as PhoneValue,
      };
      await render(
        <form>
          {adapter === 'base' ? (
            <PhoneInput {...props} />
          ) : (
            <MuiPhoneInput {...props} />
          )}
          <button type="reset">Reset form</button>
        </form>,
      );
      const input = page.getByLabelText('Phone', { exact: true });
      const initial = (input.element() as HTMLInputElement).value;
      await input.fill('+442079460018');
      await page.getByRole('button', { name: 'Reset form' }).click();
      await expect.element(input).toHaveValue(initial);
    });
  });
}

describe('Base UI country selector and field', () => {
  test('search by calling code, choose a country, and return focus to phone', async () => {
    const changed = vi.fn();
    await render(<PhoneInput label="Phone" defaultCountry="BY" onChange={changed} />);
    const trigger = page.getByLabelText('Select country', { exact: true });
    await trigger.click();
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await search.fill('+44');
    await page.getByRole('option', { name: /United Kingdom/ }).click();
    await expect.element(trigger).toHaveTextContent('GB');
    await expect.element(page.getByLabelText('Phone', { exact: true })).toHaveFocus();
    expect(changed).toHaveBeenLastCalledWith(
      '+44',
      expect.objectContaining({ reason: 'country-selection' }),
    );
  });

  test('Escape returns focus to the trigger and opening starts with a fresh search', async () => {
    await render(<PhoneInput label="Phone" defaultCountry="BY" />);
    const trigger = page.getByLabelText('Select country', { exact: true });
    await trigger.click();
    await page.getByRole('combobox', { name: 'Search countries' }).fill('zzzzzzzz');
    await expect.element(page.getByText('No matching countries')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveFocus();
    await trigger.click();
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveValue('');
    await page.getByRole('button', { name: 'Close country selector' }).click();
    await expect.element(trigger).toHaveFocus();
  });

  test('keyboard search uses the shared filter and does not submit the form', async () => {
    const submitted = vi.fn((event: React.FormEvent) => event.preventDefault());
    await render(
      <form onSubmit={submitted}>
        <PhoneInput label="Phone" defaultCountry="US" />
      </form>,
    );
    await page.getByLabelText('Select country', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Search countries' }).fill('Canada');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect
      .element(page.getByLabelText('Select country', { exact: true }))
      .toHaveTextContent('CA');
    expect(submitted).not.toHaveBeenCalled();
  });

  test('shared calling code selection preserves digits and explicit country', async () => {
    const changed = vi.fn();
    await render(
      <PhoneInput
        label="Phone"
        defaultCountry="US"
        defaultValue="+12133734253"
        onChange={changed}
      />,
    );
    await page.getByLabelText('Select country', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Search countries' }).fill('Canada');
    await page.getByRole('option', { name: /Canada/ }).click();
    await expect
      .element(page.getByLabelText('Select country', { exact: true }))
      .toHaveTextContent('CA');
    expect(changed).toHaveBeenLastCalledWith(
      '+12133734253',
      expect.objectContaining({ reason: 'country-selection' }),
    );
  });

  for (const state of ['disabled', 'readOnly'] as const) {
    test(`${state} locks both number and country selection`, async () => {
      const changed = vi.fn();
      await render(
        <PhoneInput
          label="Phone"
          defaultCountry="BY"
          {...{ [state]: true }}
          onChange={changed}
        />,
      );
      await expect
        .element(page.getByLabelText('Select country', { exact: true }))
        .toBeDisabled();
      await expect
        .element(page.getByLabelText('Phone', { exact: true }))
        .toHaveAttribute(state === 'disabled' ? 'disabled' : 'readonly');
      expect(changed).not.toHaveBeenCalled();
    });
  }

  test('non-geographic value stays neutral and an existing filtered country is not relabeled', async () => {
    const view = await render(<PhoneInput label="Phone" value="+80012345678" />);
    await expect
      .element(page.getByLabelText('Select country', { exact: true }))
      .toHaveTextContent('+');
    expect(document.querySelector('img')).toBeNull();
    await view.rerender(
      <PhoneInput
        label="Phone"
        value="+442079460018"
        countrySelector={{ countryFilter: (country) => country === 'BY' }}
      />,
    );
    await expect
      .element(page.getByLabelText('Select country', { exact: true }))
      .toHaveTextContent('GB');
    await page.getByLabelText('Select country', { exact: true }).click();
    await expect.element(page.getByRole('option', { name: /Belarus/ })).toBeVisible();
    await expect
      .element(page.getByRole('option', { name: /United Kingdom/ }))
      .not.toBeInTheDocument();
  });

  test('localization, independent extension and external native ref', async () => {
    const changed = vi.fn();
    function Field() {
      const input = useRef<HTMLInputElement>(null);
      return (
        <>
          <PhoneInput
            label="Телефон"
            countrySelector={{ ...ru }}
            defaultCountry="BY"
            extensionLabel="Добавочный"
            defaultExtension="007"
            onExtensionChange={changed}
            ref={input}
          />
          <button type="button" onClick={() => input.current?.focus()}>
            Focus ref
          </button>
        </>
      );
    }
    await render(<Field />);
    await page.getByRole('button', { name: 'Focus ref' }).click();
    await expect.element(page.getByLabelText('Телефон')).toHaveFocus();
    await expect.element(page.getByLabelText('Добавочный')).toHaveValue('007');
    await page.getByLabelText('Добавочный').fill('0012');
    expect(changed).toHaveBeenLastCalledWith('0012', expect.any(Object));
    await page.getByLabelText(ru.messages.selectCountry, { exact: true }).click();
    await page
      .getByRole('combobox', { name: ru.messages.searchLabel })
      .fill('Беларусь');
    await expect.element(page.getByRole('option', { name: /Беларусь/ })).toBeVisible();
  });

  test('composes with an owned field and an explicitly scoped RTL portal', async () => {
    function ScopedField() {
      const [container, setContainer] = useState<HTMLDivElement | null>(null);
      const phone = usePhoneInput({ defaultCountry: 'BY' });
      return (
        <div dir="rtl">
          <label htmlFor={phone.state.inputId}>Owned phone</label>
          <PhoneInputCountrySelector
            phone={phone}
            dir="rtl"
            portalContainer={container}
          />
          <input {...phone.getInputProps({ type: 'tel' })} />
          <div data-testid="scoped-portal" ref={setContainer} />
        </div>
      );
    }
    await render(<ScopedField />);
    await page.getByLabelText('Select country', { exact: true }).click();
    await expect
      .poll(() =>
        page
          .getByTestId('scoped-portal')
          .element()
          .querySelector('[data-slot="phone-country-popup"]'),
      )
      .not.toBeNull();
    await expect
      .element(page.getByLabelText('Owned phone'))
      .toHaveAttribute('dir', 'ltr');
    expect(
      document.querySelector('[data-slot="phone-country-popup"]')?.getAttribute('dir'),
    ).toBe('rtl');
  });

  test('labels, descriptions, invalid state and open popup pass accessibility checks', async () => {
    await render(
      <main>
        <PhoneInput
          label="Phone"
          helperText="Include the country code"
          required
          defaultValue="+1"
          validationDisplay="always"
          validationMessage="Enter a complete phone number"
        />
      </main>,
    );
    const input = page.getByLabelText('Phone', { exact: true });
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    const descriptionId = input.element().getAttribute('aria-errormessage');
    expect(descriptionId && document.getElementById(descriptionId)?.textContent).toBe(
      'Enter a complete phone number',
    );
    await page.getByLabelText('Select country', { exact: true }).click();
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toBeVisible();
    const result = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    });
    expect(
      result.violations.map(({ id, description }) => ({ id, description })),
    ).toEqual([]);
  });
});
