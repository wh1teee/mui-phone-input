import { Dialog } from '@base-ui/react/dialog';
import { type ReactNode, useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { MuiPhoneInput } from '../../packages/mui-phone-input/src';
import {
  type PhoneCountryAutoFocusSearch,
  type PhoneCountryChangeDetails,
  PhoneCountryList,
  PhoneCountryTrigger,
  type PhoneCountryTriggerContent,
  PhoneInput,
  type PhoneInputDisplayMode,
  type UsePhoneInputParameters,
  type UsePhoneInputReturn,
  usePhoneInput,
} from '../../packages/mui-phone-input/src/base-ui';
import { ja } from '../../packages/mui-phone-input/src/locales/ja';
import { ru } from '../../packages/mui-phone-input/src/locales/ru';
import '../../packages/mui-phone-input/src/shadcn.css';

const originalMatchMedia = window.matchMedia;

function usePointer(fine: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: query === '(pointer: fine)' ? fine : false,
    media: query,
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  })) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function countryName(country: string, locale = 'en'): string {
  return new Intl.DisplayNames([locale], { type: 'region' }).of(country) ?? country;
}

function TriggerHarness({
  displayMode,
  label,
  parameters = { defaultCountry: 'BY' },
  triggerContent,
  ...rest
}: {
  displayMode: PhoneInputDisplayMode;
  label?: string;
  locale?: string;
  messages?: typeof ru.messages;
  parameters?: UsePhoneInputParameters;
  triggerContent?: PhoneCountryTriggerContent;
}) {
  const phone = usePhoneInput({ ...parameters, displayMode });
  return (
    <PhoneCountryTrigger
      {...rest}
      {...(label === undefined ? {} : { 'aria-label': label })}
      {...(triggerContent === undefined ? {} : { triggerContent })}
      data-testid="trigger"
      phone={phone}
    />
  );
}

describe('PhoneCountryTrigger content', () => {
  const cases: Array<[PhoneCountryTriggerContent, PhoneInputDisplayMode, string]> = [
    ['auto', 'international', 'BY'],
    ['auto', 'international-fixed-calling-code', 'BY'],
    ['auto', 'national', 'BY+375'],
    // The input already starts with +375: the trigger must not repeat it.
    ['calling-code', 'international', ''],
    ['calling-code', 'international-fixed-calling-code', ''],
    ['calling-code', 'national', '+375'],
    ['country-code', 'international', 'BY'],
    ['country-code', 'national', 'BY'],
    ['both', 'international', 'BY+375'],
    ['both', 'national', 'BY+375'],
  ];
  for (const [content, displayMode, text] of cases) {
    test(`${content} in ${displayMode} draws "${text}"`, async () => {
      await render(
        <TriggerHarness displayMode={displayMode} triggerContent={content} />,
      );
      const trigger = page.getByTestId('trigger');
      await expect.element(trigger).toHaveTextContent(text === '' ? /^$/u : text);
      // Whatever is drawn, the name carries the country and calling code.
      await expect
        .element(trigger)
        .toHaveAccessibleName(`Select country. ${countryName('BY')}, BY, +375`);
      // The chevron is always drawn.
      expect(trigger.element().querySelector('svg')).not.toBeNull();
    });
  }

  test('a render function receives the selection state', async () => {
    const content = vi.fn(
      ({
        callingCode,
        country,
      }: {
        callingCode: string | null;
        country: string | null;
      }) => `${country}:${callingCode}`,
    );
    await render(<TriggerHarness displayMode="national" triggerContent={content} />);
    await expect.element(page.getByTestId('trigger')).toHaveTextContent('BY:375');
    expect(content).toHaveBeenLastCalledWith({
      callingCode: '375',
      country: 'BY',
      countryName: countryName('BY'),
      displayMode: 'national',
    });
  });

  test('without a country every mode keeps the neutral glyph and the bare label', async () => {
    for (const content of ['auto', 'calling-code', 'country-code', 'both'] as const) {
      const view = await render(
        <TriggerHarness
          displayMode="international"
          label="Страна"
          parameters={{}}
          triggerContent={content}
        />,
      );
      const trigger = page.getByTestId('trigger');
      await expect.element(trigger).toHaveTextContent('+');
      await expect.element(trigger).toHaveAccessibleName('Страна');
      await view.unmount();
    }
  });
});

describe('country trigger accessible name', () => {
  test('a host label prefixes the selection in the message template', async () => {
    await render(
      <TriggerHarness
        displayMode="international"
        label="Страна"
        locale="ru"
        messages={ru.messages}
      />,
    );
    await expect
      .element(page.getByTestId('trigger'))
      .toHaveAccessibleName(`Страна. ${countryName('BY', 'ru')}, BY, +375`);
  });

  test('the Japanese template localizes the punctuation', async () => {
    await render(
      <TriggerHarness displayMode="international" locale="ja" messages={ja.messages} />,
    );
    await expect
      .element(page.getByTestId('trigger'))
      .toHaveAccessibleName(`国・地域を選択。${countryName('BY', 'ja')}、BY、+375`);
  });

  test('the built-in popover trigger appends the selection to triggerProps aria-label', async () => {
    await render(
      <PhoneInput
        countrySelector={{
          triggerContent: 'calling-code',
          triggerProps: { 'aria-label': 'Country' },
        }}
        defaultCountry="BY"
        displayMode="national"
        label="Phone"
      />,
    );
    const trigger = page.getByRole('combobox', {
      name: `Country. ${countryName('BY')}, BY, +375`,
    });
    await expect.element(trigger).toHaveTextContent('+375');
    await expect.element(trigger).not.toHaveTextContent('BY');
  });

  test('MUI keeps its default name and appends the selection to a host label', async () => {
    const view = await render(<MuiPhoneInput defaultCountry="BY" label="Phone" />);
    await expect
      .element(page.getByRole('button', { name: /^Select country/u }))
      .toHaveAccessibleName(`Select country. ${countryName('BY')}, BY, +375`);
    await view.rerender(
      <MuiPhoneInput
        defaultCountry="BY"
        displayMode="national"
        label="Phone"
        slotProps={{
          countrySelector: { 'aria-label': 'Country', triggerContent: 'calling-code' },
        }}
      />,
    );
    const trigger = page.getByRole('button', { name: /^Country/u });
    await expect
      .element(trigger)
      .toHaveAccessibleName(`Country. ${countryName('BY')}, BY, +375`);
    await expect.element(trigger).toHaveTextContent('+375');
    await expect.element(trigger).not.toHaveTextContent('BY');
  });
});

function ListHarness({
  autoFocusSearch,
  children,
  onSelect,
  parameters = { defaultCountry: 'BY' },
}: {
  autoFocusSearch?: PhoneCountryAutoFocusSearch;
  children?: (phone: UsePhoneInputReturn) => ReactNode;
  onSelect?: (country: string) => void;
  parameters?: UsePhoneInputParameters;
}) {
  const phone = usePhoneInput(parameters);
  return (
    <>
      <input {...phone.getInputProps({ 'aria-label': 'Phone' })} />
      <output data-testid="country">{phone.state.selectedCountry ?? ''}</output>
      <output data-testid="value">{phone.state.value ?? ''}</output>
      <div style={{ display: 'flex', flexDirection: 'column', height: '240px' }}>
        <PhoneCountryList
          {...(autoFocusSearch === undefined ? {} : { autoFocusSearch })}
          {...(onSelect === undefined ? {} : { onSelect })}
          phone={phone}
        />
      </div>
      {children?.(phone)}
    </>
  );
}

function listElement(): HTMLElement {
  const list = document.querySelector<HTMLElement>('[data-slot="phone-country-list"]');
  if (!list) throw new Error('country list is not rendered');
  return list;
}

function isInsideList(row: Element | null): boolean {
  if (!row) return false;
  const listBox = listElement().getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  return rowBox.top >= listBox.top - 1 && rowBox.bottom <= listBox.bottom + 1;
}

describe('PhoneCountryList in a plain container', () => {
  test('search, arrows and Enter select a country; onSelect runs after it is applied', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    await render(
      <ListHarness
        onSelect={onSelect}
        parameters={{ defaultCountry: 'BY', onChange }}
      />,
    );
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await expect.element(search).toHaveFocus();
    await userEvent.keyboard('canad');
    await expect.element(page.getByRole('option').first()).toHaveTextContent(/Canada/u);
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByTestId('country')).toHaveTextContent('CA');
    expect(onSelect).toHaveBeenCalledWith('CA');
    // The selection transaction is committed before onSelect runs.
    expect(onChange).toHaveBeenCalledWith(
      '+1',
      expect.objectContaining({ reason: 'country-selection' }),
    );
    expect(onChange.mock.invocationCallOrder[0]).toBeLessThan(
      onSelect.mock.invocationCallOrder[0] ?? 0,
    );

    await search.clear();
    await search.click();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const highlighted = document.querySelector('[role="option"][data-highlighted]');
    expect(highlighted).not.toBeNull();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  test('the selected row is marked, checked and scrolled into view on mount', async () => {
    await render(<ListHarness parameters={{ defaultCountry: 'ZW' }} />);
    const row = page.getByRole('option', { name: /Zimbabwe/u });
    await expect.element(row).toHaveAttribute('aria-selected', 'true');
    expect(
      row.element().querySelector('[data-slot="phone-country-indicator"] svg'),
    ).not.toBeNull();
    await expect.poll(() => isInsideList(row.element())).toBe(true);
    expect(listElement().scrollTop).toBeGreaterThan(0);
  });

  test('a focused list navigates with arrows, mirrors aria-activedescendant and selects', async () => {
    await render(<ListHarness autoFocusSearch={false} />);
    await expect.poll(() => document.activeElement === listElement()).toBe(true);
    await userEvent.keyboard('{ArrowDown}');
    await expect
      .poll(() => listElement().getAttribute('aria-activedescendant'))
      .toBeTruthy();
    const activeId = listElement().getAttribute('aria-activedescendant') ?? '';
    const active = document.getElementById(activeId);
    expect(active?.getAttribute('role')).toBe('option');
    expect(active?.hasAttribute('data-highlighted')).toBe(true);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect.element(page.getByTestId('country')).not.toHaveTextContent('BY');
  });

  test('printable keys on the focused list go to the search field', async () => {
    await render(<ListHarness autoFocusSearch={false} />);
    await expect.poll(() => document.activeElement === listElement()).toBe(true);
    await userEvent.keyboard('j');
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await expect.element(search).toHaveFocus();
    await userEvent.keyboard('apan');
    await expect.element(page.getByRole('option').first()).toHaveTextContent(/Japan/u);
  });

  test('Escape bubbles to the host and leaves the selection alone', async () => {
    const onKeyDown = vi.fn();
    await render(
      // biome-ignore lint/a11y/noStaticElementInteractions: the host container listens for Escape.
      <div onKeyDown={(event) => onKeyDown(event.key)}>
        <ListHarness />
      </div>,
    );
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onKeyDown).toHaveBeenCalledWith('Escape');
    await expect.element(page.getByTestId('country')).toHaveTextContent('BY');
    await expect
      .element(page.getByRole('option', { name: /Belarus/u }))
      .toHaveAttribute('aria-selected', 'true');
  });
});

describe('autoFocusSearch', () => {
  const cases: Array<[PhoneCountryAutoFocusSearch, boolean, 'search' | 'list']> = [
    [true, false, 'search'],
    [false, true, 'list'],
    ['fine-pointer', true, 'search'],
    ['fine-pointer', false, 'list'],
  ];
  for (const [mode, fine, target] of cases) {
    test(`${String(mode)} with a ${fine ? 'fine' : 'coarse'} pointer focuses the ${target}`, async () => {
      usePointer(fine);
      await render(<ListHarness autoFocusSearch={mode} />);
      const search = document.querySelector('[data-slot="phone-country-search"]');
      await expect
        .poll(() => document.activeElement)
        .toBe(target === 'search' ? search : listElement());
    });
  }
});

function HostSheet() {
  const phone = usePhoneInput({ defaultCountry: 'BY' });
  const [open, setOpen] = useState(false);
  return (
    <>
      <Dialog.Root onOpenChange={setOpen} open={open}>
        <Dialog.Trigger
          render={<PhoneCountryTrigger phone={phone} triggerContent="calling-code" />}
        />
        <Dialog.Portal>
          <Dialog.Popup
            // The list decides focus itself (no keyboard on touch).
            initialFocus={false}
            style={{ display: 'flex', flexDirection: 'column', height: 320 }}
          >
            <Dialog.Title>Country</Dialog.Title>
            <PhoneCountryList
              autoFocusSearch="fine-pointer"
              onSelect={() => setOpen(false)}
              phone={phone}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <input {...phone.getInputProps({ 'aria-label': 'Phone' })} />
    </>
  );
}

test('host-owned sheet recipe: dialog trigger part, list part, close on select', async () => {
  usePointer(false);
  await render(<HostSheet />);
  const trigger = page.getByRole('button', {
    name: `Select country. ${countryName('BY')}, BY, +375`,
  });
  await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  // The modal dialog hides the page, so keep the element itself.
  const triggerElement = trigger.element();
  await trigger.click();
  await expect.poll(() => triggerElement.getAttribute('aria-expanded')).toBe('true');
  expect(triggerElement.hasAttribute('data-popup-open')).toBe(true);
  // Coarse pointer: focus lands on the list, so no on-screen keyboard opens.
  await expect.poll(() => document.activeElement === listElement()).toBe(true);
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  expect(triggerElement.getAttribute('aria-label')).not.toMatch(/Belarus/u);
});

describe('opening cost of the full list', () => {
  test('option rows skip off-screen rendering and stay reachable by keyboard', async () => {
    // No selection, so nothing is highlighted when the list opens.
    await render(<PhoneInput label="Phone" />);
    await page.getByRole('combobox', { name: /^Select country/u }).click();
    await expect
      .poll(() => document.querySelectorAll('[role="option"]').length)
      .toBeGreaterThan(200);
    const first = document.querySelector('[data-slot="phone-country-option"]');
    expect(first && getComputedStyle(first).contentVisibility).toBe('auto');
    // From the search field ArrowUp wraps to the last, far-away row.
    await userEvent.keyboard('{ArrowUp}');
    const options = document.querySelectorAll('[role="option"]');
    const last = options[options.length - 1] ?? null;
    await expect.poll(() => last?.hasAttribute('data-highlighted')).toBe(true);
    await expect.poll(() => isInsideList(last)).toBe(true);
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => isInsideList(options[0] ?? null)).toBe(true);
  });

  test('the selected far-away row is visible when the popover opens', async () => {
    await render(<PhoneInput defaultCountry="ZW" label="Phone" />);
    await page.getByRole('combobox', { name: /^Select country/u }).click();
    const row = page.getByRole('option', { name: /Zimbabwe/u });
    await expect.element(row).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => isInsideList(row.element())).toBe(true);
  });
});

function DefaultCountryHarness({
  defaultCountry,
}: {
  defaultCountry?: UsePhoneInputParameters['defaultCountry'];
}) {
  const [events, setEvents] = useState<PhoneCountryChangeDetails[]>([]);
  const phone = usePhoneInput({
    ...(defaultCountry === undefined ? {} : { defaultCountry }),
    displayMode: 'national',
    onCountryChange: (_country, details) => setEvents((list) => [...list, details]),
  });
  return (
    <>
      <input {...phone.getInputProps({ 'aria-label': 'Phone' })} />
      <output data-testid="country">{phone.state.selectedCountry ?? ''}</output>
      <output data-testid="last-reason">{events.at(-1)?.reason ?? ''}</output>
      <button onClick={() => phone.actions.selectCountry('LT')} type="button">
        Pick Lithuania
      </button>
    </>
  );
}

describe('defaultCountry follows while the field is untouched', () => {
  test('a late default replaces the country and reports reason default', async () => {
    const view = await render(<DefaultCountryHarness />);
    await expect.element(page.getByTestId('country')).toHaveTextContent(/^$/u);
    await view.rerender(<DefaultCountryHarness defaultCountry="BY" />);
    await expect.element(page.getByTestId('country')).toHaveTextContent('BY');
    await expect.element(page.getByTestId('last-reason')).toHaveTextContent('default');
    await view.rerender(<DefaultCountryHarness defaultCountry="PL" />);
    await expect.element(page.getByTestId('country')).toHaveTextContent('PL');
  });

  test('after typing, even when cleared again, the default no longer moves the country', async () => {
    const view = await render(<DefaultCountryHarness defaultCountry="BY" />);
    const input = page.getByLabelText('Phone', { exact: true });
    await input.click();
    await userEvent.keyboard('2');
    await input.clear();
    await view.rerender(<DefaultCountryHarness defaultCountry="PL" />);
    // Give a stale follow a render to land before asserting it did not.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await expect.element(page.getByTestId('country')).toHaveTextContent('BY');
  });

  test('after an explicit pick the default no longer moves the country', async () => {
    const view = await render(<DefaultCountryHarness defaultCountry="BY" />);
    await page.getByRole('button', { name: 'Pick Lithuania' }).click();
    await expect.element(page.getByTestId('country')).toHaveTextContent('LT');
    await view.rerender(<DefaultCountryHarness defaultCountry="PL" />);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await expect.element(page.getByTestId('country')).toHaveTextContent('LT');
  });
});
