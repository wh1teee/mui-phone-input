import {
  type ComponentPropsWithRef,
  StrictMode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  type PhoneCountrySelectorMode,
  type PhoneCountrySelectorOwnerState,
  PhoneInputCountrySelector,
  PhoneInputProvider,
  usePhoneInput,
} from '../../packages/mui-phone-input/src';

const removeSearchInputEvent = 'mpi-q19-remove-country-search-input';
const restoreSearchInputEvent = 'mpi-q19-restore-country-search-input';
const originalMatchMedia = window.matchMedia;

type RefTransition = 'attach' | 'cleanup';

type SelectorRefProbe = {
  listbox: HTMLUListElement | null;
  listboxTransitions: RefTransition[];
  searchInput: HTMLInputElement | null;
  searchInputTransitions: RefTransition[];
};

type MatchMediaController = Readonly<{
  install(matches: boolean): void;
  setMatches(matches: boolean): void;
}>;

function createRefProbe(): SelectorRefProbe {
  return {
    listbox: null,
    listboxTransitions: [],
    searchInput: null,
    searchInputTransitions: [],
  };
}

function createMatchMediaController(): MatchMediaController {
  let currentMatches = false;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const install = (matches: boolean): void => {
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

function RemovableSearchInputSlot({
  ownerState: _ownerState,
  ...props
}: ComponentPropsWithRef<'input'> & {
  ownerState: PhoneCountrySelectorOwnerState;
}) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const remove = () => setMounted(false);
    const restore = () => setMounted(true);
    window.addEventListener(removeSearchInputEvent, remove);
    window.addEventListener(restoreSearchInputEvent, restore);
    return () => {
      window.removeEventListener(removeSearchInputEvent, remove);
      window.removeEventListener(restoreSearchInputEvent, restore);
    };
  }, []);

  return mounted ? <input {...props} data-ref-handoff-search-input="true" /> : null;
}

function ObservedSearchInputSlot({
  ownerState: _ownerState,
  ...props
}: ComponentPropsWithRef<'input'> & {
  ownerState: PhoneCountrySelectorOwnerState;
}) {
  return <input {...props} data-ref-handoff-search-input="true" />;
}

function SelectorRefHandoffHarness({
  disablePortal,
  mode,
  probe,
  removableSearchInput = false,
}: Readonly<{
  disablePortal: boolean;
  mode: PhoneCountrySelectorMode;
  probe: SelectorRefProbe;
  removableSearchInput?: boolean;
}>) {
  const phone = usePhoneInput({ defaultCountry: 'US' });
  const setSearchInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      probe.searchInput = input;
      probe.searchInputTransitions.push(input ? 'attach' : 'cleanup');
    },
    [probe],
  );
  const setListboxRef = useCallback(
    (listbox: HTMLUListElement | null) => {
      probe.listbox = listbox;
      probe.listboxTransitions.push(listbox ? 'attach' : 'cleanup');
    },
    [probe],
  );

  return (
    <div data-testid="ref-handoff-host">
      <PhoneInputProvider value={phone}>
        <PhoneInputCountrySelector
          data-testid="ref-handoff-trigger"
          disablePortal={disablePortal}
          mode={mode}
          slotProps={{
            listbox: {
              'data-testid': 'ref-handoff-listbox',
              ref: setListboxRef,
            },
            searchInput: {
              'data-testid': 'ref-handoff-search-input',
              ref: setSearchInputRef,
            },
          }}
          slots={{
            searchInput: removableSearchInput
              ? RemovableSearchInputSlot
              : ObservedSearchInputSlot,
          }}
        />
      </PhoneInputProvider>
    </div>
  );
}

function installNullAttributeErrorProbe(): Readonly<{
  errors: string[];
  restore(): void;
}> {
  const errors: string[] = [];
  const record = (reason: unknown): boolean => {
    const message =
      reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
    if (
      /Cannot read properties of null.*(?:removeAttribute|setAttribute)/s.test(message)
    ) {
      errors.push(message);
      return true;
    }
    return false;
  };
  const onError = (event: ErrorEvent) => {
    if (record(event.error ?? event.message)) {
      event.preventDefault();
    }
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (record(event.reason)) {
      event.preventDefault();
    }
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  return {
    errors,
    restore() {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    },
  };
}

function getHiddenFallback(): HTMLInputElement {
  const host = page.getByTestId('ref-handoff-host').element();
  const hiddenInput = host.querySelector<HTMLInputElement>(
    'input[aria-hidden="true"][hidden][tabindex="-1"]',
  );
  if (!hiddenInput) {
    throw new Error('Expected the country selector hidden input fallback.');
  }
  return hiddenInput;
}

function getOption(index: number): HTMLElement {
  const option = document.querySelector<HTMLElement>(
    `[role="option"][data-option-index="${index}"]`,
  );
  if (!option) {
    throw new Error(`Expected country option at index ${index}.`);
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

function activeOption(input: HTMLInputElement): HTMLElement | null {
  const id = input.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
}

function containsStrictRefCycle(transitions: RefTransition[]): boolean {
  return transitions.join(',').includes('attach,cleanup,attach');
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe('country selector autocomplete ref handoff', () => {
  test.each([
    { disablePortal: false, mode: 'desktop' as const },
    { disablePortal: true, mode: 'desktop' as const },
    { disablePortal: false, mode: 'mobile' as const },
    { disablePortal: true, mode: 'mobile' as const },
  ])(
    'keeps MUI input synchronization on the hidden fallback in $mode mode with disablePortal=$disablePortal',
    async ({ disablePortal, mode }) => {
      const probe = createRefProbe();
      const runtimeErrors = installNullAttributeErrorProbe();
      const view = await render(
        <StrictMode>
          <SelectorRefHandoffHarness
            disablePortal={disablePortal}
            mode={mode}
            probe={probe}
            removableSearchInput
          />
        </StrictMode>,
      );
      const trigger = page.getByTestId('ref-handoff-trigger');

      try {
        await userEvent.click(trigger);
        const search = page.getByTestId('ref-handoff-search-input');
        await expect.element(search).toHaveFocus();
        await userEvent.fill(search, 'a');
        await expect
          .poll(() => document.querySelectorAll('[role="option"]').length)
          .toBeGreaterThan(2);

        expect(containsStrictRefCycle(probe.searchInputTransitions)).toBe(true);
        expect(containsStrictRefCycle(probe.listboxTransitions)).toBe(true);

        const hiddenInput = getHiddenFallback();
        expect(hiddenInput.hidden).toBe(true);
        expect(hiddenInput.getAttribute('aria-hidden')).toBe('true');
        expect(hiddenInput.tabIndex).toBe(-1);
        expect(hiddenInput.getAttribute('role')).toBeNull();
        expect(document.activeElement).not.toBe(hiddenInput);

        const originalListbox = probe.listbox;
        const handoffOption = getOption(1);
        window.dispatchEvent(new Event(removeSearchInputEvent));

        await expect.element(search).not.toBeInTheDocument();
        expect(probe.searchInput).toBeNull();
        expect(probe.listbox).toBe(originalListbox);
        expect(probe.listbox?.isConnected).toBe(true);
        expect(
          page.getByRole('combobox', { name: 'Search countries' }).query(),
        ).toBeNull();

        movePointerToOption(handoffOption);
        await expect
          .poll(() => hiddenInput.getAttribute('aria-activedescendant'))
          .toBe(handoffOption.id);
        expect(activeOption(hiddenInput)).toBe(handoffOption);
        expect(handoffOption).toHaveClass('Mui-focused');
        expect(runtimeErrors.errors).toEqual([]);

        window.dispatchEvent(new Event(restoreSearchInputEvent));
        const restoredSearch = page.getByTestId('ref-handoff-search-input');
        await expect.element(restoredSearch).toHaveValue('a');
        const restoredInput = restoredSearch.element();
        if (!(restoredInput instanceof HTMLInputElement)) {
          throw new TypeError('Expected the restored country search input.');
        }
        restoredInput.focus();
        await userEvent.keyboard('{ArrowDown}{ArrowUp}');
        await expect.element(restoredSearch).toHaveFocus();
        await expect
          .element(restoredSearch)
          .toHaveAttribute('aria-activedescendant', handoffOption.id);
        expect(activeOption(restoredInput)).toBe(handoffOption);
        expect(runtimeErrors.errors).toEqual([]);

        await userEvent.keyboard('{Escape}');
        await expect.element(trigger).toHaveFocus();
        await expect.element(restoredSearch).not.toBeInTheDocument();
        await expect.poll(() => probe.searchInput).toBeNull();
        await expect.poll(() => probe.listbox).toBeNull();
        expect(hiddenInput.isConnected).toBe(true);

        await userEvent.click(trigger);
        const reopenedSearch = page.getByTestId('ref-handoff-search-input');
        await expect.element(reopenedSearch).toHaveValue('a');
        await expect.element(reopenedSearch).toHaveFocus();
        const reopenedInput = reopenedSearch.element();
        if (!(reopenedInput instanceof HTMLInputElement)) {
          throw new TypeError('Expected the reopened country search input.');
        }
        const reopenedActiveOption = activeOption(reopenedInput);
        expect(reopenedActiveOption).toBeInstanceOf(HTMLElement);
        expect(reopenedActiveOption).toHaveAttribute('role', 'option');
        expect(runtimeErrors.errors).toEqual([]);

        await view.unmount();
        expect(probe.searchInput).toBeNull();
        expect(probe.listbox).toBeNull();
        expect(probe.searchInputTransitions.at(-1)).toBe('cleanup');
        expect(probe.listboxTransitions.at(-1)).toBe('cleanup');
        expect(hiddenInput.isConnected).toBe(false);
        expect(runtimeErrors.errors).toEqual([]);
      } finally {
        runtimeErrors.restore();
        if (page.getByTestId('ref-handoff-host').query()) {
          await view.unmount();
        }
      }
    },
  );

  test.each([false, true])(
    'preserves the effective input, query, highlight, and focus across an open auto presentation switch with disablePortal=%s',
    async (disablePortal) => {
      const media = createMatchMediaController();
      media.install(false);
      const probe = createRefProbe();
      const runtimeErrors = installNullAttributeErrorProbe();
      const view = await render(
        <StrictMode>
          <SelectorRefHandoffHarness
            disablePortal={disablePortal}
            mode="auto"
            probe={probe}
          />
        </StrictMode>,
      );
      const trigger = page.getByTestId('ref-handoff-trigger');

      try {
        await userEvent.click(trigger);
        const desktopSearch = page.getByTestId('ref-handoff-search-input');
        await userEvent.fill(desktopSearch, 'a');
        await expect
          .poll(() => document.querySelectorAll('[role="option"]').length)
          .toBeGreaterThan(2);
        await expect.element(desktopSearch).toHaveFocus();
        const desktopInput = desktopSearch.element();
        if (!(desktopInput instanceof HTMLInputElement)) {
          throw new TypeError('Expected the desktop country search input.');
        }
        await expect.poll(() => activeOption(desktopInput)).not.toBeNull();
        const initiallyHighlighted = activeOption(desktopInput);
        const initialIndex = Number(initiallyHighlighted?.dataset.optionIndex);
        const optionCount = document.querySelectorAll('[role="option"]').length;
        const highlighted = getOption((initialIndex + 1) % optionCount);
        const highlightedCountry = highlighted.dataset.country;
        await userEvent.keyboard('{ArrowDown}');
        await expect
          .element(desktopSearch)
          .toHaveAttribute('aria-activedescendant', highlighted.id);
        await expect.element(desktopSearch).toHaveFocus();
        expect(highlighted).toHaveClass('Mui-focused', 'Mui-focusVisible');

        const desktopListbox = probe.listbox;
        media.setMatches(true);

        await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        const dialogId = trigger.element().getAttribute('aria-controls');
        expect(dialogId).not.toBeNull();
        await expect.poll(() => document.getElementById(dialogId ?? '')).not.toBeNull();
        const dialog = document.getElementById(dialogId ?? '');
        expect(dialog).toHaveAttribute('role', 'dialog');
        const mobileSearch = page.getByTestId('ref-handoff-search-input');
        await expect.element(mobileSearch).toHaveValue('a');
        await expect.element(mobileSearch).toHaveFocus();
        await expect
          .element(mobileSearch)
          .toHaveAttribute('aria-activedescendant', highlighted.id);
        expect(desktopInput.isConnected).toBe(false);
        expect(desktopListbox?.isConnected).toBe(false);
        const mobileActiveOption = activeOption(
          mobileSearch.element() as HTMLInputElement,
        );
        expect(mobileActiveOption).toBeInstanceOf(HTMLElement);
        expect(mobileActiveOption).not.toBe(highlighted);
        expect(mobileActiveOption).toHaveAttribute('id', highlighted.id);
        expect(mobileActiveOption).toHaveAttribute('data-country', highlightedCountry);
        expect(mobileActiveOption).toHaveClass('Mui-focused', 'Mui-focusVisible');
        expect(runtimeErrors.errors).toEqual([]);

        const mobileInput = mobileSearch.element();
        const mobileListbox = probe.listbox;
        media.setMatches(false);

        const restoredDesktopSearch = page.getByTestId('ref-handoff-search-input');
        await expect.poll(() => document.getElementById(dialogId ?? '')).toBeNull();
        await expect.element(restoredDesktopSearch).toHaveValue('a');
        await expect.element(restoredDesktopSearch).toHaveFocus();
        await expect
          .element(restoredDesktopSearch)
          .toHaveAttribute('aria-activedescendant', highlighted.id);
        expect(mobileInput.isConnected).toBe(false);
        expect(mobileListbox?.isConnected).toBe(false);
        const restoredActiveOption = activeOption(
          restoredDesktopSearch.element() as HTMLInputElement,
        );
        expect(restoredActiveOption).toBeInstanceOf(HTMLElement);
        expect(restoredActiveOption).not.toBe(mobileActiveOption);
        expect(restoredActiveOption).toHaveAttribute('id', highlighted.id);
        expect(restoredActiveOption).toHaveAttribute(
          'data-country',
          highlightedCountry,
        );
        expect(restoredActiveOption).toHaveClass('Mui-focused', 'Mui-focusVisible');
        expect(runtimeErrors.errors).toEqual([]);

        await userEvent.keyboard('{Escape}');
        await expect.element(trigger).toHaveFocus();
        await userEvent.click(trigger);
        const reopenedDesktopSearch = page.getByTestId('ref-handoff-search-input');
        await expect.element(reopenedDesktopSearch).toHaveValue('a');
        await expect.element(reopenedDesktopSearch).toHaveFocus();
        const reopenedDesktopActive = activeOption(
          reopenedDesktopSearch.element() as HTMLInputElement,
        );
        expect(reopenedDesktopActive).toBeInstanceOf(HTMLElement);
        expect(reopenedDesktopActive).not.toHaveAttribute(
          'data-country',
          highlightedCountry,
        );
        const reopenedCountry = reopenedDesktopActive?.dataset.country;

        media.setMatches(true);
        await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        const reopenedMobileSearch = page.getByTestId('ref-handoff-search-input');
        await expect.element(reopenedMobileSearch).toHaveValue('a');
        await expect.element(reopenedMobileSearch).toHaveFocus();
        const reopenedMobileActive = activeOption(
          reopenedMobileSearch.element() as HTMLInputElement,
        );
        expect(reopenedMobileActive).toBeInstanceOf(HTMLElement);
        expect(reopenedMobileActive).toHaveAttribute('data-country', reopenedCountry);
        expect(runtimeErrors.errors).toEqual([]);

        await view.unmount();
        expect(probe.searchInput).toBeNull();
        expect(probe.listbox).toBeNull();
        expect(runtimeErrors.errors).toEqual([]);
      } finally {
        runtimeErrors.restore();
        if (page.getByTestId('ref-handoff-host').query()) {
          await view.unmount();
        }
      }
    },
  );
});
