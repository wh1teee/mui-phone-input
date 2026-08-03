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
  mode = 'auto',
}: Readonly<{ mode?: PhoneCountrySelectorMode }>) {
  const [value, setValue] = useState<`+${string}` | undefined>('+375');

  return (
    <MuiPhoneInput
      label="Hydrated phone"
      onChange={setValue}
      slotProps={{
        countrySelector: {
          'data-testid': 'hydrated-country-trigger',
          mode,
        },
      }}
      value={value}
    />
  );
}

function serverMarkup(mode: PhoneCountrySelectorMode): string {
  return renderToString(<HydrationHarness mode={mode} />);
}

function hydrate(markup: string, mode: PhoneCountrySelectorMode): Root {
  const container = document.createElement('div');
  container.dataset.testid = 'hydration-container';
  container.innerHTML = markup;
  document.body.append(container);
  const root = hydrateRoot(container, <HydrationHarness mode={mode} />);
  roots.push(root);
  return root;
}

async function settleHydration(): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
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

  test('preserves an open search draft and focus when auto mode switches after hydration', async () => {
    const media = createMatchMediaController();
    media.install(false);
    const markup = serverMarkup('auto');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    hydrate(markup, 'auto');
    await settleHydration();
    await userEvent.click(page.getByTestId('hydrated-country-trigger'));
    const desktopSearch = page.getByRole('combobox', { name: 'Search countries' });
    await userEvent.type(desktopSearch, 'bel');

    media.setMatches(true);

    const dialog = page.getByRole('dialog', { name: 'Select country' });
    await expect.element(dialog).toBeInTheDocument();
    const mobileSearch = dialog.getByRole('combobox', { name: 'Search countries' });
    await expect.element(mobileSearch).toHaveValue('bel');
    await expect.element(mobileSearch).toHaveFocus();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
