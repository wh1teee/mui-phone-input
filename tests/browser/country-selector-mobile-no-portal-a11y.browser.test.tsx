import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Drawer from '@mui/material/Drawer';
import axe from 'axe-core';
import { StrictMode, useEffect, useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { MuiPhoneInput } from '../../packages/mui-phone-input/src';

type MatchMediaController = Readonly<{
  install(matches: boolean): void;
  setMatches(matches: boolean): void;
}>;

const originalMatchMedia = window.matchMedia;
const unmountSelectorEvent = 'mpi-caz-unmount-selector';

function createMatchMediaController(): MatchMediaController {
  let currentMatches = false;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  return {
    install(matches) {
      currentMatches = matches;
      window.matchMedia = vi.fn((query: string) => ({
        addEventListener: (
          _type: 'change',
          listener: (event: MediaQueryListEvent) => void,
        ) => listeners.add(listener),
        addListener: (listener: (event: MediaQueryListEvent) => void) =>
          listeners.add(listener),
        dispatchEvent: () => true,
        get matches() {
          return currentMatches;
        },
        media: query,
        onchange: null,
        removeEventListener: (
          _type: 'change',
          listener: (event: MediaQueryListEvent) => void,
        ) => listeners.delete(listener),
        removeListener: (listener: (event: MediaQueryListEvent) => void) =>
          listeners.delete(listener),
      })) as typeof window.matchMedia;
    },
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

function MobilePlacementHarness({
  disablePortal,
}: Readonly<{ disablePortal: boolean }>) {
  return (
    <main data-testid="mobile-selector-host">
      <p data-testid="outside-page-content">Outside page content</p>
      <MuiPhoneInput
        defaultCountry="BY"
        label="Mobile country phone"
        slotProps={{
          countrySelector: {
            'data-testid': 'mobile-country-trigger',
            disablePortal,
            mode: 'mobile',
          },
        }}
      />
    </main>
  );
}

function CustomPortalContainerHarness() {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <main data-testid="custom-container-page">
        <MuiPhoneInput
          defaultCountry="BY"
          label="Custom container phone"
          slotProps={{
            countrySelector: {
              'data-testid': 'custom-container-trigger',
              mode: 'mobile',
              portalContainer,
            },
          }}
        />
      </main>
      <div data-testid="custom-portal-container" ref={setPortalContainer} />
    </>
  );
}

function NestedNoPortalHarness({
  context,
}: Readonly<{ context: 'bottom-sheet' | 'dialog' | 'drawer' }>) {
  const content = (
    <div data-testid={`${context}-selector-host`}>
      <p data-testid={`${context}-outside-content`}>Host content</p>
      <MuiPhoneInput
        defaultCountry="BY"
        label={`${context} mobile phone`}
        slotProps={{
          countrySelector: {
            'data-testid': `${context}-country-trigger`,
            disablePortal: true,
            mode: 'mobile',
          },
        }}
      />
    </div>
  );

  if (context === 'dialog') {
    return (
      <Dialog aria-label="Outer dialog" open>
        <DialogContent>{content}</DialogContent>
      </Dialog>
    );
  }

  if (context === 'drawer') {
    return (
      <Drawer open variant="permanent">
        {content}
      </Drawer>
    );
  }

  return (
    <section aria-label="Bottom sheet" role="dialog">
      {content}
    </section>
  );
}

function StrictUnmountHarness() {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const unmount = () => setMounted(false);
    window.addEventListener(unmountSelectorEvent, unmount);
    return () => window.removeEventListener(unmountSelectorEvent, unmount);
  }, []);

  return (
    <main data-testid="strict-unmount-host">
      <p data-testid="strict-unmount-outside">Persistent host content</p>
      {mounted ? (
        <MuiPhoneInput
          defaultCountry="BY"
          label="Strict unmount phone"
          slotProps={{
            countrySelector: {
              'data-testid': 'strict-unmount-trigger',
              disablePortal: true,
              mode: 'mobile',
            },
          }}
        />
      ) : null}
    </main>
  );
}

function AutoNoPortalHarness() {
  return (
    <main data-testid="auto-selector-host">
      <p data-testid="auto-outside-content">Auto host content</p>
      <MuiPhoneInput
        defaultCountry="BY"
        label="Auto country phone"
        slotProps={{
          countrySelector: {
            'data-testid': 'auto-country-trigger',
            disablePortal: true,
            mode: 'auto',
          },
        }}
      />
    </main>
  );
}

function expectNoHiddenAncestor(element: Element): void {
  expect(element.closest('[aria-hidden="true"]')).toBeNull();
}

async function expectHiddenAncestorCleanup(element: Element): Promise<void> {
  await expect.poll(() => element.closest('[aria-hidden="true"]') === null).toBe(true);
}

function summarizeAxeViolations(
  violations: axe.Result[],
): ReadonlyArray<Readonly<{ help: string; id: string; targets: string[] }>> {
  return violations.map((violation) => ({
    help: violation.help,
    id: violation.id,
    targets: violation.nodes.map((node) => JSON.stringify(node.target)),
  }));
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe('mobile no-portal accessibility', () => {
  test.each([
    { disablePortal: false, expectedInsideHost: false },
    { disablePortal: true, expectedInsideHost: true },
  ])(
    'keeps the mobile Dialog discoverable with disablePortal=$disablePortal',
    async ({ disablePortal, expectedInsideHost }) => {
      const view = await render(
        <MobilePlacementHarness disablePortal={disablePortal} />,
      );
      const trigger = page.getByTestId('mobile-country-trigger');

      await userEvent.click(trigger);

      const dialog = page.getByRole('dialog', { name: 'Select country' });
      const combobox = dialog.getByRole('combobox', { name: 'Search countries' });
      await expect.element(dialog).toBeInTheDocument();
      await expect.element(combobox).toHaveFocus();
      expectNoHiddenAncestor(dialog.element());
      expectNoHiddenAncestor(combobox.element());
      expect(
        page.getByTestId('mobile-selector-host').element().contains(dialog.element()),
      ).toBe(expectedInsideHost);
      expect(
        page
          .getByTestId('outside-page-content')
          .element()
          .closest('[aria-hidden="true"]'),
      ).not.toBeNull();

      await userEvent.keyboard('{Escape}');
      await expect.element(trigger).toHaveFocus();
      await expect.element(dialog).not.toBeInTheDocument();
      await expectHiddenAncestorCleanup(
        page.getByTestId('outside-page-content').element(),
      );
      await view.unmount();
    },
  );

  test('preserves an explicit mobile portalContainer', async () => {
    const view = await render(<CustomPortalContainerHarness />);

    await userEvent.click(page.getByTestId('custom-container-trigger'));
    const dialog = page.getByRole('dialog', { name: 'Select country' });
    const combobox = dialog.getByRole('combobox', { name: 'Search countries' });

    expect(
      page.getByTestId('custom-portal-container').element().contains(dialog.element()),
    ).toBe(true);
    expectNoHiddenAncestor(dialog.element());
    expectNoHiddenAncestor(combobox.element());
    await view.unmount();
  });

  test('contains forward and reverse Tab in the no-portal Dialog', async () => {
    const view = await render(<MobilePlacementHarness disablePortal />);
    await userEvent.click(page.getByTestId('mobile-country-trigger'));

    const dialog = page.getByRole('dialog', { name: 'Select country' });
    const search = dialog.getByRole('combobox', { name: 'Search countries' });
    const close = dialog.getByRole('button', { name: 'Close country selector' });
    await expect.element(search).toHaveFocus();

    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.element(close).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    await expect.element(search).toHaveFocus();
    await expect.element(dialog).toBeInTheDocument();
    expectNoHiddenAncestor(dialog.element());
    await view.unmount();
  });

  test.each(['dialog', 'drawer', 'bottom-sheet'] as const)(
    'keeps a no-portal mobile Dialog coherent inside a %s host',
    async (context) => {
      const view = await render(<NestedNoPortalHarness context={context} />);
      const trigger = page.getByTestId(`${context}-country-trigger`);

      await userEvent.click(trigger);
      const dialog = page.getByRole('dialog', { name: 'Select country' });
      const combobox = dialog.getByRole('combobox', { name: 'Search countries' });

      expect(
        page
          .getByTestId(`${context}-selector-host`)
          .element()
          .contains(dialog.element()),
      ).toBe(true);
      expectNoHiddenAncestor(dialog.element());
      expectNoHiddenAncestor(combobox.element());
      expect(
        page
          .getByTestId(`${context}-outside-content`)
          .element()
          .closest('[aria-hidden="true"]'),
      ).not.toBeNull();

      await userEvent.keyboard('{Escape}');
      await expect.element(trigger).toHaveFocus();
      await expect.element(dialog).not.toBeInTheDocument();
      await expectHiddenAncestorCleanup(
        page.getByTestId(`${context}-outside-content`).element(),
      );
      await view.unmount();
    },
  );

  test('restores focus once across close, Escape, selection, and reopen cycles', async () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    const onCountrySelection = vi.fn();
    const onTriggerFocus = vi.fn();
    const view = await render(
      <main>
        <MuiPhoneInput
          defaultCountry="BY"
          label="Cardinality phone"
          onChange={onChange}
          onCountryChange={onCountryChange}
          onCountrySelection={onCountrySelection}
          slotProps={{
            countrySelector: {
              'data-testid': 'cardinality-trigger',
              disablePortal: true,
              mode: 'mobile',
              onFocus: onTriggerFocus,
            },
          }}
        />
      </main>,
    );
    const trigger = page.getByTestId('cardinality-trigger');
    trigger.element().focus();
    onTriggerFocus.mockClear();

    await userEvent.click(trigger);
    await userEvent.click(page.getByRole('button', { name: 'Close country selector' }));
    await expect.element(trigger).toHaveFocus();
    expect(onTriggerFocus).toHaveBeenCalledTimes(1);

    onTriggerFocus.mockClear();
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveFocus();
    expect(onTriggerFocus).toHaveBeenCalledTimes(1);

    onChange.mockClear();
    onCountryChange.mockClear();
    onCountrySelection.mockClear();
    onTriggerFocus.mockClear();
    await userEvent.click(trigger);
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await userEvent.fill(search, 'Canada');
    await userEvent.click(page.getByRole('option', { name: 'Canada, CA, +1' }));
    await expect.element(trigger).toHaveFocus();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onCountryChange).toHaveBeenCalledTimes(1);
    expect(onCountrySelection).toHaveBeenCalledTimes(1);
    expect(onTriggerFocus).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  test('cleans Modal isolation when a Strict Mode selector unmounts while open', async () => {
    const view = await render(
      <StrictMode>
        <StrictUnmountHarness />
      </StrictMode>,
    );

    await userEvent.click(page.getByTestId('strict-unmount-trigger'));
    await expect
      .element(page.getByRole('dialog', { name: 'Select country' }))
      .toBeInTheDocument();
    expect(
      page
        .getByTestId('strict-unmount-outside')
        .element()
        .closest('[aria-hidden="true"]'),
    ).not.toBeNull();

    window.dispatchEvent(new Event(unmountSelectorEvent));

    await expect
      .element(page.getByRole('dialog', { name: 'Select country' }))
      .not.toBeInTheDocument();
    expect(
      page
        .getByTestId('strict-unmount-outside')
        .element()
        .closest('[aria-hidden="true"]'),
    ).toBeNull();
    await view.unmount();
  });

  test('preserves semantics across auto desktop to mobile to desktop switching', async () => {
    const media = createMatchMediaController();
    media.install(false);
    const view = await render(<AutoNoPortalHarness />);
    const trigger = page.getByTestId('auto-country-trigger');

    await userEvent.click(trigger);
    const desktopSearch = page.getByRole('combobox', { name: 'Search countries' });
    await userEvent.fill(desktopSearch, 'Can');

    media.setMatches(true);

    const dialog = page.getByRole('dialog', { name: 'Select country' });
    const mobileSearch = dialog.getByRole('combobox', { name: 'Search countries' });
    await expect.element(mobileSearch).toHaveValue('Can');
    await expect.element(mobileSearch).toHaveFocus();
    expectNoHiddenAncestor(dialog.element());
    expectNoHiddenAncestor(mobileSearch.element());
    expect(
      page.getByTestId('auto-selector-host').element().contains(dialog.element()),
    ).toBe(true);

    media.setMatches(false);

    await expect.element(dialog).not.toBeInTheDocument();
    const restoredDesktopSearch = page.getByRole('combobox', {
      name: 'Search countries',
    });
    await expect.element(restoredDesktopSearch).toHaveValue('Can');
    await expect.element(restoredDesktopSearch).toHaveFocus();
    expect(
      page
        .getByTestId('auto-outside-content')
        .element()
        .closest('[aria-hidden="true"]'),
    ).toBeNull();
    await view.unmount();
  });

  test('has no WCAG 2.2 A/AA violations on the visible no-portal surface', async () => {
    const view = await render(<MobilePlacementHarness disablePortal />);
    await userEvent.click(page.getByTestId('mobile-country-trigger'));

    const dialog = page.getByRole('dialog', { name: 'Select country' });
    const combobox = dialog.getByRole('combobox', { name: 'Search countries' });
    await expect.element(combobox).toHaveFocus();
    expectNoHiddenAncestor(dialog.element());
    expectNoHiddenAncestor(combobox.element());

    const results = await axe.run(document.body, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
      },
    });
    const violations = summarizeAxeViolations(results.violations);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    await view.unmount();
  });
});
