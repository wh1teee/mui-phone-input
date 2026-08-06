import { createTheme, ThemeProvider } from '@mui/material/styles';
import axe from 'axe-core';
import type { ComponentPropsWithRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  MuiPhoneInput,
  type PhoneCountryFlagProps,
  type PhoneCountrySelectorFlagOwnerState,
} from '../../packages/mui-phone-input/src';
import { be } from '../../packages/mui-phone-input/src/locales/be';

function FlagSlot({
  ownerState,
  country,
  external: _external,
  mode: _mode,
  placement: _placement,
  provider: _provider,
  ...props
}: ComponentPropsWithRef<'span'> &
  PhoneCountryFlagProps & {
    ownerState?: PhoneCountrySelectorFlagOwnerState;
  }) {
  return (
    <span
      {...props}
      data-custom-flag={country}
      data-flag-placement={ownerState?.placement}
    />
  );
}

describe('flags and localization', () => {
  test('renders pinned local SVG flags by default without runtime network APIs', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const resolveUrl = vi.fn(() => 'https://example.invalid/flag.svg');

    await render(
      <MuiPhoneInput
        defaultCountry="BY"
        label="Phone"
        slotProps={{ countrySelector: { externalFlag: { resolveUrl } } }}
      />,
    );

    const localFlag = document.querySelector<HTMLElement>(
      '.MuiPhoneInput-countrySelectorFlag',
    );
    expect(localFlag).not.toBeNull();
    expect(localFlag?.querySelector('span')?.classList.contains('flag:BY')).toBe(true);
    expect(localFlag?.querySelector('img')).toBeNull();
    expect(resolveUrl).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrOpenSpy.mockRestore();
  });

  test('external mode is explicit and forwards URL, CORS, referrer and lazy policy', async () => {
    await render(
      <MuiPhoneInput
        defaultCountry="BY"
        label="Phone"
        slotProps={{
          countrySelector: {
            externalFlag: {
              crossOrigin: 'anonymous',
              fallback: '?',
              referrerPolicy: 'no-referrer',
              resolveUrl: (country) =>
                `data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%203%202'%3E%3C/svg%3E#${country}`,
            },
            flagMode: 'external',
          },
        }}
      />,
    );

    const image = document.querySelector<HTMLImageElement>(
      '.MuiPhoneInput-countrySelectorFlag img',
    );
    expect(image?.getAttribute('src')).toContain('data:image/svg+xml');
    expect(image?.getAttribute('src')).toContain('#BY');
    expect(image?.crossOrigin).toBe('anonymous');
    expect(image?.loading).toBe('lazy');
    expect(image?.referrerPolicy).toBe('no-referrer');

    image?.dispatchEvent(new Event('error'));
    await vi.waitFor(() => {
      expect(
        document.querySelector('.MuiPhoneInput-countrySelectorFlag')?.textContent,
      ).toBe('?');
    });
  });

  test('supports emoji, none, provider and custom flag slot semantics', async () => {
    const provider = vi.fn(({ country }) => <strong data-provider={country}>P</strong>);
    const resolveUrl = vi.fn(() => 'https://example.invalid/unused.svg');
    const emoji = await render(
      <MuiPhoneInput
        defaultCountry="BY"
        slotProps={{ countrySelector: { flagMode: 'emoji' } }}
      />,
    );
    expect(
      document.querySelector('.MuiPhoneInput-countrySelectorFlag')?.textContent,
    ).toBe('🇧🇾');
    await emoji.unmount();

    const none = await render(
      <MuiPhoneInput
        defaultCountry="BY"
        slotProps={{ countrySelector: { flagMode: 'none' } }}
      />,
    );
    expect(document.querySelector('.MuiPhoneInput-countrySelectorFlag')).toBeNull();
    await none.unmount();

    const custom = await render(
      <MuiPhoneInput
        defaultCountry="BY"
        slotProps={{
          countrySelector: {
            externalFlag: { resolveUrl },
            flagMode: 'external',
            flagProvider: provider,
          },
        }}
      />,
    );
    expect(document.querySelector('[data-provider="BY"]')).not.toBeNull();
    expect(provider).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'BY', placement: 'trigger' }),
    );
    expect(resolveUrl).not.toHaveBeenCalled();
    await custom.unmount();

    await render(
      <MuiPhoneInput
        defaultCountry="BY"
        slotProps={{
          countrySelector: {
            slots: { flag: FlagSlot },
          },
        }}
      />,
    );
    expect(document.querySelector('[data-custom-flag="BY"]')).toHaveAttribute(
      'data-flag-placement',
      'trigger',
    );
  });

  test('never fabricates a country or flag for a non-geographic numbering plan', async () => {
    await render(<MuiPhoneInput defaultValue="+80012345678" />);

    expect(document.querySelector('.MuiPhoneInput-countrySelectorFlag')).toBeNull();
    expect(
      document.querySelector<HTMLInputElement>('input[data-phone-input-plan]')?.dataset
        .phoneInputPlan,
    ).toBe('non-geographic');
  });

  test('uses locale packs, Intl.DisplayNames and consumer overrides in the existing selector', async () => {
    await render(
      <MuiPhoneInput
        defaultCountry="BY"
        slotProps={{
          countrySelector: {
            ...be,
            mode: 'desktop',
            resolveCountryName: (country, locale) =>
              country === 'BY' && locale === 'be' ? 'Беларусь — override' : undefined,
          },
        }}
      />,
    );

    await userEvent.click(page.getByRole('button', { name: /Беларусь — override/u }));
    expect(page.getByRole('combobox', { name: be.messages.searchLabel })).toBeVisible();
    expect(page.getByRole('option', { name: /Беларусь — override/u })).toBeVisible();
  });

  test('keeps phone notation LTR inside an RTL interface', async () => {
    const theme = createTheme({ direction: 'rtl' });
    await render(
      <ThemeProvider theme={theme}>
        <div dir="rtl">
          <MuiPhoneInput defaultCountry="BY" defaultValue="+375291234567" />
        </div>
      </ThemeProvider>,
    );

    const input = document.querySelector<HTMLInputElement>(
      'input[data-phone-input-plan]',
    );
    expect(input?.dir).toBe('ltr');
    expect(input?.value).toBe('+375 29 123 45 67');
    expect(input?.closest('[dir="rtl"]')).not.toBeNull();
  });

  test('keeps the default flag selector axe-clean', async () => {
    await render(<MuiPhoneInput defaultCountry="BY" label="Phone number" />);
    const results = await axe.run(document.body, {
      rules: { region: { enabled: false } },
    });

    expect(results.violations.map(({ id }) => id)).toEqual([]);
  });
});
