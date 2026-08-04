import { useState } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  MuiPhoneInput,
  type PhoneCountrySelectorMode,
} from '../../packages/mui-phone-input/src';

type MatchMediaController = Readonly<{
  install(matches: boolean): void;
  setMatches(matches: boolean): void;
}>;

const originalMatchMedia = window.matchMedia;
const roots: Root[] = [];

function createMatchMediaController(): MatchMediaController {
  let currentMatches = false;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const install = (matches: boolean): void => {
    currentMatches = matches;
    window.matchMedia = vi.fn((query: string) => ({
      addEventListener: (
        _type: 'change',
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        listeners.add(listener);
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      dispatchEvent: () => true,
      get matches() {
        return currentMatches;
      },
      media: query,
      onchange: null,
      removeEventListener: (
        _type: 'change',
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        listeners.delete(listener);
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
    })) as typeof window.matchMedia;
  };

  return {
    install,
    setMatches(matches) {
      currentMatches = matches;
      const event = new MediaQueryListEvent('change', {
        matches,
        media: '(max-width: 599.95px)',
      });
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

function HydrationHarness({
  disablePortal = false,
  filteredActive = false,
  mode = 'auto',
}: Readonly<{
  disablePortal?: boolean;
  filteredActive?: boolean;
  mode?: PhoneCountrySelectorMode;
}>) {
  const [value, setValue] = useState<`+${string}` | undefined>('+375');

  return (
    <MuiPhoneInput
      label="Hydrated phone"
      onChange={setValue}
      slotProps={{
        countrySelector: {
          'data-testid': 'hydrated-country-trigger',
          ...(filteredActive
            ? { countryFilter: (country: string) => country !== 'BY' }
            : {}),
          disablePortal,
          mode,
          slotProps: {
            searchInput: { 'data-testid': 'hydrated-country-search' },
          },
        },
      }}
      value={value}
    />
  );
}

function LocalizedSearchHydrationHarness() {
  const [value, setValue] = useState<`+${string}` | undefined>('+996');

  return (
    <MuiPhoneInput
      label="Localized hydrated phone"
      onChange={setValue}
      slotProps={{
        countrySelector: {
          'data-testid': 'localized-hydrated-country-trigger',
          countryFilter: (country) => country === 'BY' || country === 'KG',
          locale: 'tr',
          mode: 'desktop',
          resolveCountryName: (country, locale) => {
            if (country !== 'KG') {
              return undefined;
            }
            return locale === 'tr'
              ? 'Kırgızistan'
              : locale === 'en'
                ? 'Kyrgyzstan'
                : undefined;
          },
          slotProps: {
            searchInput: {
              'data-testid': 'localized-hydrated-country-search',
            },
          },
        },
      }}
      value={value}
    />
  );
}

function serverMarkup(
  mode: PhoneCountrySelectorMode,
  filteredActive = false,
  disablePortal = false,
): string {
  return renderToString(
    <HydrationHarness
      disablePortal={disablePortal}
      filteredActive={filteredActive}
      mode={mode}
    />,
  );
}

function hydrate(
  markup: string,
  mode: PhoneCountrySelectorMode,
  filteredActive = false,
  disablePortal = false,
): Root {
  const container = document.createElement('div');
  container.dataset.testid = 'hydration-container';
  container.innerHTML = markup;
  document.body.append(container);
  const root = hydrateRoot(
    container,
    <HydrationHarness
      disablePortal={disablePortal}
      filteredActive={filteredActive}
      mode={mode}
    />,
  );
  roots.push(root);
  return root;
}

function hydrateLocalizedSearch(markup: string): Root {
  const container = document.createElement('div');
  container.dataset.testid = 'hydration-container';
  container.innerHTML = markup;
  document.body.append(container);
  const root = hydrateRoot(container, <LocalizedSearchHydrationHarness />);
  roots.push(root);
  return root;
}

async function settleHydration(): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function activeOption(input: HTMLInputElement): HTMLElement | null {
  const id = input.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
}

function getOption(index: number): HTMLElement {
  const option = document.querySelector<HTMLElement>(
    `[role="option"][data-option-index="${index}"]`,
  );
  if (!option) {
    throw new Error(`Expected hydrated country option at index ${index}.`);
  }
  return option;
}

function movePointerToOption(option: HTMLElement): void {
  option.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      composed: true,
    }),
  );
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    root.unmount();
  }
  document.querySelectorAll('[data-testid="hydration-container"]').forEach((node) => {
    node.remove();
  });
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
  await Promise.resolve();
});

describe('country selector hydration', () => {
  test('keeps Turkish localized and English fallback search stable through hydration', async () => {
    const media = createMatchMediaController();
    media.install(false);
    const markup = renderToString(<LocalizedSearchHydrationHarness />);
    expect(markup).toContain('Kırgızistan');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    hydrateLocalizedSearch(markup);
    await settleHydration();

    const trigger = page.getByTestId('localized-hydrated-country-trigger');
    await expect
      .element(trigger)
      .toHaveAccessibleName('Select country. Kırgızistan, KG, +996');
    await userEvent.click(trigger);
    const search = page.getByTestId('localized-hydrated-country-search');

    for (const query of ['KIRGIZİSTAN', 'KYRGYZSTAN']) {
      await userEvent.fill(search, query);
      await expect
        .element(page.getByRole('option', { name: /Kırgızistan/u }))
        .toBeInTheDocument();
    }

    expect(consoleError).not.toHaveBeenCalled();
  });

  test.each(['desktop', 'mobile'] as const)(
    'keeps a filtered resolved country coherent in %s server HTML and hydration',
    async (mode) => {
      const media = createMatchMediaController();
      media.install(mode === 'mobile');
      const markup = serverMarkup(mode, true);
      expect(markup).toContain('aria-label="Select country. Belarus, BY, +375"');
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      hydrate(markup, mode, true);
      await settleHydration();

      const trigger = page.getByTestId('hydrated-country-trigger');
      await expect
        .element(trigger)
        .toHaveAccessibleName('Select country. Belarus, BY, +375');
      await expect.element(trigger).toHaveTextContent('BY+375');
      await userEvent.click(trigger);
      expect(
        document.querySelectorAll('[role="option"][data-country="BY"]'),
      ).toHaveLength(0);
      expect(consoleError).not.toHaveBeenCalled();
    },
  );

  test('hydrates an auto selector on a mobile first load without stale ARIA', async () => {
    const media = createMatchMediaController();
    media.install(false);
    const markup = serverMarkup('auto');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    media.install(true);
    hydrate(markup, 'auto');
    await settleHydration();

    const trigger = page.getByTestId('hydrated-country-trigger');
    await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(consoleError).not.toHaveBeenCalled();
  });

  test.each([
    { expectedPopup: 'listbox', mode: 'desktop' as const },
    { expectedPopup: 'dialog', mode: 'mobile' as const },
  ])(
    'keeps explicit $mode semantics stable through hydration',
    async ({ expectedPopup, mode }) => {
      const media = createMatchMediaController();
      media.install(mode === 'mobile');
      const markup = serverMarkup(mode);
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      media.install(mode !== 'mobile');
      hydrate(markup, mode);
      await settleHydration();

      await expect
        .element(page.getByTestId('hydrated-country-trigger'))
        .toHaveAttribute('aria-haspopup', expectedPopup);
      expect(consoleError).not.toHaveBeenCalled();
    },
  );

  test.each([false, true])(
    'preserves an open search draft, highlight, focus, and ref safety across a post-hydration auto round trip with disablePortal=%s',
    async (disablePortal) => {
      const media = createMatchMediaController();
      media.install(false);
      const markup = serverMarkup('auto', false, disablePortal);
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      hydrate(markup, 'auto', false, disablePortal);
      await settleHydration();
      const trigger = page.getByTestId('hydrated-country-trigger');
      await userEvent.click(trigger);
      const desktopSearch = page.getByTestId('hydrated-country-search');
      await userEvent.fill(desktopSearch, 'a');
      await expect
        .poll(() => document.querySelectorAll('[role="option"]').length)
        .toBeGreaterThan(2);
      const highlighted = getOption(1);
      const highlightedCountry = highlighted.dataset.country;
      movePointerToOption(highlighted);
      await expect
        .element(desktopSearch)
        .toHaveAttribute('aria-activedescendant', highlighted.id);

      const container = page.getByTestId('hydration-container').element();
      const hiddenFallback = container.querySelector<HTMLInputElement>(
        'input[aria-hidden="true"][hidden][tabindex="-1"]',
      );
      expect(hiddenFallback).toBeInstanceOf(HTMLInputElement);
      expect(document.activeElement).not.toBe(hiddenFallback);

      media.setMatches(true);

      await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      const dialog = page.getByRole('dialog', { name: 'Select country' });
      const mobileSearch = page.getByTestId('hydrated-country-search');
      await expect.element(dialog).toBeInTheDocument();
      await expect.element(mobileSearch).toHaveValue('a');
      await expect.element(mobileSearch).toHaveFocus();
      await expect
        .element(mobileSearch)
        .toHaveAttribute('aria-activedescendant', highlighted.id);
      expect(dialog.element().closest('[aria-hidden="true"]')).toBeNull();
      expect(mobileSearch.element().closest('[aria-hidden="true"]')).toBeNull();
      expect(container.contains(dialog.element())).toBe(disablePortal);
      const mobileActive = activeOption(mobileSearch.element() as HTMLInputElement);
      expect(mobileActive).toBeInstanceOf(HTMLElement);
      expect(mobileActive).not.toBe(highlighted);
      expect(mobileActive).toHaveAttribute('data-country', highlightedCountry);

      media.setMatches(false);

      await expect.element(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      await expect.element(dialog).not.toBeInTheDocument();
      const restoredDesktopSearch = page.getByTestId('hydrated-country-search');
      await expect.element(restoredDesktopSearch).toHaveValue('a');
      await expect.element(restoredDesktopSearch).toHaveFocus();
      await expect
        .element(restoredDesktopSearch)
        .toHaveAttribute('aria-activedescendant', highlighted.id);
      const restoredActive = activeOption(
        restoredDesktopSearch.element() as HTMLInputElement,
      );
      expect(restoredActive).toBeInstanceOf(HTMLElement);
      expect(restoredActive).not.toBe(mobileActive);
      expect(restoredActive).toHaveAttribute('data-country', highlightedCountry);
      expect(container.closest('[aria-hidden="true"]')).toBeNull();
      expect(consoleError).not.toHaveBeenCalled();
    },
  );
});
