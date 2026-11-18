import { Dialog } from '@base-ui/react/dialog';
import axe from 'axe-core';
import type { CountryCode } from 'libphonenumber-js/core';
import { type ReactNode, useRef, useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { MuiPhoneInput } from '../../packages/mui-phone-input/src';
import {
  createPhoneCountryOptions,
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
import { en } from '../../packages/mui-phone-input/src/locales/en';
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
    // The input already starts with +375: no repeat, and no empty button.
    ['calling-code', 'international', 'BY'],
    ['calling-code', 'international-fixed-calling-code', 'BY'],
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

  test('a host render element on the popover trigger keeps the library content and name', async () => {
    await render(
      <PhoneInput
        countrySelector={{
          triggerContent: 'both',
          triggerProps: {
            'aria-label': 'Country',
            render: <button data-host-button="" type="button" />,
          },
        }}
        defaultCountry="BY"
        label="Phone"
      />,
    );
    const trigger = page.getByRole('combobox', {
      name: `Country. ${countryName('BY')}, BY, +375`,
    });
    await expect.element(trigger).toHaveAttribute('data-host-button');
    await expect.element(trigger).toHaveTextContent('BY+375');
  });

  test('MUI keeps its default name and a host label as the whole name', async () => {
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
    // As in 1.2.1: the MUI host label is not extended.
    await expect.element(trigger).toHaveAccessibleName('Country');
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
  // A wrapped option can exceed the host viewport at large text sizes. Require
  // its whole row or the whole available viewport, whichever can fit.
  const visibleHeight =
    Math.min(rowBox.bottom, listBox.bottom) - Math.max(rowBox.top, listBox.top);
  return visibleHeight >= Math.min(rowBox.height, listBox.height) - 1;
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
    // The key that moved focus is not lost.
    await expect.element(search).toHaveValue('japan');
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
  const picked = useRef(false);
  return (
    <>
      <Dialog.Root
        onOpenChange={(next) => {
          if (next) picked.current = false;
          setOpen(next);
        }}
        open={open}
      >
        <Dialog.Trigger
          render={<PhoneCountryTrigger phone={phone} triggerContent="calling-code" />}
        />
        <Dialog.Portal>
          <Dialog.Popup
            // The list decides focus itself (no keyboard on touch).
            finalFocus={() => (picked.current ? phone.inputElementRef.current : true)}
            initialFocus={false}
            style={{ display: 'flex', flexDirection: 'column', height: 320 }}
          >
            <Dialog.Title>Country</Dialog.Title>
            <PhoneCountryList
              autoFocusSearch="fine-pointer"
              onSelect={() => {
                picked.current = true;
                setOpen(false);
              }}
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
  await Promise.allSettled(
    document.getAnimations().map((animation) => animation.finished),
  );
  const audit = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  });
  expect(audit.violations.map(({ id, description }) => ({ id, description }))).toEqual(
    [],
  );
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  expect(triggerElement.getAttribute('aria-label')).not.toMatch(/Belarus/u);
  // After a pick the guest continues in the phone input, as in the README recipe.
  await expect.element(page.getByLabelText('Phone', { exact: true })).toHaveFocus();
});

function countryRow(country: CountryCode): HTMLElement | null {
  const code = Array.from(
    listElement().querySelectorAll('[data-slot="phone-country-code"]'),
  ).find((element) => element.textContent === country);
  return code?.closest<HTMLElement>('[role="option"]') ?? null;
}

async function expectActiveCountry(country: CountryCode, position: number) {
  await expect
    .poll(() => {
      const id = listElement().getAttribute('aria-activedescendant');
      const row = id ? document.getElementById(id) : null;
      return row?.querySelector('[data-slot="phone-country-code"]')?.textContent;
    })
    .toBe(country);
  const row = countryRow(country);
  expect(row?.hasAttribute('data-highlighted')).toBe(true);
  expect(row?.getAttribute('aria-posinset')).toBe(String(position));
  await expect.poll(() => isInsideList(countryRow(country))).toBe(true);
}

function LargeTextCountryList() {
  const phone = usePhoneInput({ defaultCountry: 'ZW' });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        fontSize: '200%',
        height: 340,
        width: 340,
      }}
    >
      <PhoneCountryList
        autoFocusSearch={false}
        phone={phone}
        preferredCountries={['BY', 'PL', 'GB']}
        resolveCountryName={(country) =>
          country === 'BY' ? 'Belarus with a longer country name' : undefined
        }
      />
    </div>
  );
}

describe('opening cost of the full list', () => {
  test('virtualized popover keeps every country reachable by scroll, search and keyboard', async () => {
    const countries = createPhoneCountryOptions();
    expect(countries.length).toBeGreaterThan(200);
    const firstCountry = countries[0]?.country;
    const lastCountry = countries.at(-1)?.country;
    if (!firstCountry || !lastCountry)
      throw new Error('The complete country dataset is required.');
    // No selection, so nothing is highlighted when the list opens.
    await render(<PhoneInput label="Phone" />);
    await page.getByRole('combobox', { name: /^Select country/u }).click();
    await expect
      .element(page.getByRole('option').first())
      .toHaveAttribute('aria-setsize', String(countries.length));
    expect(document.querySelectorAll('[role="option"]').length).toBeLessThan(48);
    // From the search field ArrowUp wraps to the last, far-away row.
    await userEvent.keyboard('{ArrowUp}');
    await expect
      .poll(() => countryRow(lastCountry)?.hasAttribute('data-highlighted'))
      .toBe(true);
    await expect.poll(() => isInsideList(countryRow(lastCountry))).toBe(true);
    expect(countryRow(lastCountry)?.getAttribute('aria-posinset')).toBe(
      String(countries.length),
    );
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => isInsideList(countryRow(firstCountry))).toBe(true);
    // The active row is pinned before the scroll-driven window commits. Observe
    // the painted first viewport before starting a separate manual traversal.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );

    // A small DOM must represent the complete dataset, not a truncated list.
    const seen = new Set<string>();
    const list = listElement();
    for (let step = 0; step < 120; step += 1) {
      for (const code of list.querySelectorAll('[data-slot="phone-country-code"]')) {
        if (code.textContent) seen.add(code.textContent);
      }
      expect(list.querySelectorAll('[role="option"]').length).toBeLessThan(48);
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 1) break;
      list.scrollTop += list.clientHeight * 0.75;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    }
    expect([...seen].sort()).toEqual(countries.map(({ country }) => country).sort());
    expect(list.scrollTop).toBeGreaterThan(0);
    const search = page.getByRole('combobox', { name: 'Search countries' });
    // Filtering from the deepest scroll must expose the result immediately.
    await search.fill('New Zealand');
    await expect.poll(() => isInsideList(countryRow('NZ'))).toBe(true);
    await expect
      .element(page.getByRole('option').first())
      .toHaveAttribute('aria-setsize', '1');
    await search.fill('+44');
    await expect
      .element(page.getByRole('option').first())
      .toHaveTextContent(/United Kingdom/u);
  });

  test('virtualized inline list preserves groups, variable heights and mounted active descendants', async () => {
    const countries = createPhoneCountryOptions({
      preferredCountries: ['BY', 'PL', 'GB'],
    });
    const firstAllCountry = countries[3]?.country;
    const lastCountry = countries.at(-1)?.country;
    if (!firstAllCountry || !lastCountry)
      throw new Error('Both country groups are required.');
    await render(<LargeTextCountryList />);
    await expect.poll(() => document.activeElement === listElement()).toBe(true);
    await expect.poll(() => isInsideList(countryRow('ZW'))).toBe(true);
    await expect
      .element(page.getByRole('group', { name: en.messages.preferredCountries }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('group', { name: en.messages.allCountries }))
      .toBeInTheDocument();
    await userEvent.keyboard('{Home}');
    await expectActiveCountry('BY', 1);
    expect(countryRow('BY')?.getBoundingClientRect().height).toBeGreaterThan(44);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    await expectActiveCountry(firstAllCountry, 4);
    await userEvent.keyboard('{End}');
    await expectActiveCountry(lastCountry, countries.length);
    expect(listElement().querySelectorAll('[role="option"]').length).toBeLessThan(48);
    // The mounted owner must remeasure a later text/layout change, including
    // group spacing above this far-away active row, without losing its target.
    const lastHeight = countryRow(lastCountry)?.getBoundingClientRect().height ?? 0;
    listElement().style.fontSize = '48px';
    await expect
      .poll(() => countryRow(lastCountry)?.getBoundingClientRect().height ?? 0)
      .toBeGreaterThan(lastHeight);
    await expectActiveCountry(lastCountry, countries.length);
    // Manual scrolling owns the viewport after keyboard navigation. Two separate
    // natural resize deliveries above it must preserve the visible country and
    // its intra-row offset, including while the native scroll is settling.
    const list = listElement();
    // The saved viewport offset must remain in layout units under a host transform.
    list.style.transform = 'scale(0.8)';
    list.scrollTop = list.scrollHeight / 2;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    const visibleCountry = () => {
      const bounds = list.getBoundingClientRect();
      const row = Array.from(
        list.querySelectorAll<HTMLElement>('[role="option"]'),
      ).find((option) => {
        const box = option.getBoundingClientRect();
        return box.bottom > bounds.top + 1 && box.top < bounds.bottom;
      });
      const country = row?.querySelector(
        '[data-slot="phone-country-code"]',
      )?.textContent;
      if (!row || !country) throw new Error('A visible country row is required.');
      return { country, offset: row.getBoundingClientRect().top - bounds.top };
    };
    const label = page
      .getByRole('group', { name: en.messages.allCountries })
      .element()
      .querySelector<HTMLElement>('[data-slot="phone-country-group-label"]');
    if (!label) throw new Error('The group label above the viewport is required.');
    const firstHeight = label.offsetHeight + 16;
    const secondHeight = firstHeight + 16;
    let deliveries = 0;
    let frame = 0;
    let retained: ReturnType<typeof visibleCountry> | undefined;
    const resize = new ResizeObserver((entries) => {
      const entry = entries[0];
      const height = entry?.borderBoxSize[0]?.blockSize ?? label.offsetHeight;
      if (deliveries === 0 && height >= firstHeight) {
        deliveries = 1;
        frame = requestAnimationFrame(() => {
          label.style.height = `${secondHeight}px`;
        });
      } else if (deliveries === 1 && height >= secondHeight) {
        deliveries = 2;
      }
    });
    const beginResize = () => {
      retained = visibleCountry();
      label.style.height = `${firstHeight}px`;
    };
    try {
      resize.observe(label, { box: 'border-box' });
      list.addEventListener('scroll', beginResize, { once: true });
      list.scrollTop += 7;
      await expect.poll(() => deliveries).toBe(2);
      if (!retained) throw new Error('The manual scroll must precede both resizes.');
      const before = retained;
      await expect.poll(() => visibleCountry().country).toBe(before.country);
      await expect
        .poll(() => Math.abs(visibleCountry().offset - before.offset))
        .toBeLessThan(1);
    } finally {
      resize.disconnect();
      cancelAnimationFrame(frame);
      list.removeEventListener('scroll', beginResize);
      list.style.transform = '';
    }
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await search.fill('New Zealand');
    await expect.poll(() => isInsideList(countryRow('NZ'))).toBe(true);
    await expectActiveCountry('NZ', 1);
    await search.clear();
    listElement().focus();
    await userEvent.keyboard('{Home}');
    await expectActiveCountry('BY', 1);
    // Firefox's wrapped label can be taller than this host. Its remaining text
    // must stay reachable by manual scroll without changing the active country.
    const wrappedRow = countryRow('BY');
    if (!wrappedRow) throw new Error('The active first country must remain mounted.');
    if (wrappedRow.offsetHeight > listElement().clientHeight) {
      await expect
        .poll(() =>
          Math.abs(
            wrappedRow.getBoundingClientRect().top -
              listElement().getBoundingClientRect().top,
          ),
        )
        .toBeLessThan(1);
      listElement().scrollTop += wrappedRow.offsetHeight - listElement().clientHeight;
      await expect
        .poll(
          () =>
            wrappedRow.getBoundingClientRect().bottom <=
            listElement().getBoundingClientRect().bottom + 1,
        )
        .toBe(true);
      await expectActiveCountry('BY', 1);
    }
    await expect
      .element(page.getByRole('group', { name: en.messages.preferredCountries }))
      .toBeInTheDocument();
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

  test('a missing, empty, mis-cased or unknown late default is ignored without throwing', async () => {
    const view = await render(<DefaultCountryHarness defaultCountry="BY" />);
    await expect.element(page.getByTestId('country')).toHaveTextContent('BY');
    for (const late of ['by', '', 'XX'] as unknown as CountryCode[]) {
      await view.rerender(<DefaultCountryHarness defaultCountry={late} />);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await expect.element(page.getByTestId('country')).toHaveTextContent('BY');
    }
    // A refetch that clears the default keeps the last applied country.
    await view.rerender(<DefaultCountryHarness />);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await expect.element(page.getByTestId('country')).toHaveTextContent('BY');
    await view.rerender(<DefaultCountryHarness defaultCountry="PL" />);
    await expect.element(page.getByTestId('country')).toHaveTextContent('PL');
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

describe('the list part has an accessible name', () => {
  test('the focused listbox is named', async () => {
    await render(<ListHarness autoFocusSearch={false} />);
    await expect.poll(() => document.activeElement === listElement()).toBe(true);
    // axe's aria-input-field-name rule does not apply to this listbox (it
    // reports no node), so the audit alone cannot catch a missing name.
    await expect
      .element(page.getByRole('listbox', { name: 'Select country' }))
      .toBeInTheDocument();
    expect(listElement().getAttribute('aria-label')).toBe('Select country');
  });
});

function LocalizedPhoneParts() {
  const phone = usePhoneInput({
    defaultCountry: 'BY',
    locale: 'ru',
    messages: ru.messages,
  });
  return (
    <>
      <PhoneCountryTrigger data-testid="trigger" phone={phone} />
      <div style={{ display: 'flex', flexDirection: 'column', height: 200 }}>
        <PhoneCountryList autoFocusSearch={false} phone={phone} />
      </div>
    </>
  );
}

test('parts take locale and messages from phone unless their props override them', async () => {
  await render(<LocalizedPhoneParts />);
  await expect
    .element(page.getByTestId('trigger'))
    .toHaveAccessibleName(
      `${ru.messages.selectCountry}. ${countryName('BY', 'ru')}, BY, +375`,
    );
  await expect
    .element(page.getByRole('combobox', { name: ru.messages.searchLabel }))
    .toBeInTheDocument();
  await expect
    .element(
      page.getByRole('option', { name: new RegExp(countryName('BY', 'ru'), 'u') }),
    )
    .toBeInTheDocument();
});

function ResponsivePhone({ wide }: { wide: boolean }) {
  const [open, setOpen] = useState(false);
  const picked = useRef(false);
  return (
    <PhoneInput
      countrySelector={{
        triggerContent: 'calling-code',
        triggerProps: { className: 'host-trigger', 'data-host': 'yes' } as never,
      }}
      defaultCountry="BY"
      displayMode="national"
      helperText="We text the code"
      label="Phone"
      renderCountrySelector={({ defaultSelector, listProps, phone, triggerProps }) =>
        wide ? (
          defaultSelector
        ) : (
          <Dialog.Root
            onOpenChange={(next) => {
              if (next) picked.current = false;
              setOpen(next);
            }}
            open={open}
          >
            <Dialog.Trigger render={<PhoneCountryTrigger {...triggerProps} />} />
            <Dialog.Portal>
              <Dialog.Popup
                finalFocus={() =>
                  picked.current ? phone.inputElementRef.current : true
                }
                initialFocus={false}
              >
                <PhoneCountryList
                  {...listProps}
                  autoFocusSearch="fine-pointer"
                  onSelect={() => {
                    picked.current = true;
                    setOpen(false);
                  }}
                />
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        )
      }
    />
  );
}

describe('PhoneInput renderCountrySelector', () => {
  test('a narrow screen puts the parts in a host dialog and keeps the field', async () => {
    usePointer(false);
    await render(<ResponsivePhone wide={false} />);
    await expect.element(page.getByText('We text the code')).toBeVisible();
    const trigger = page.getByRole('button', {
      name: `Select country. ${countryName('BY')}, BY, +375`,
    });
    await expect.element(trigger).toHaveTextContent('+375');
    await trigger.click();
    await expect.element(page.getByRole('dialog')).toBeInTheDocument();
    await expect.poll(() => document.activeElement === listElement()).toBe(true);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
    await expect.element(page.getByLabelText('Phone', { exact: true })).toHaveFocus();
  });

  test('dismissing the host sheet returns focus to the trigger', async () => {
    usePointer(false);
    await render(<ResponsivePhone wide={false} />);
    const trigger = page.getByRole('button', { name: /^Select country/u });
    const triggerElement = trigger.element();
    // The host's countrySelector.triggerProps reach the trigger part.
    expect(triggerElement.classList.contains('host-trigger')).toBe(true);
    expect(triggerElement.getAttribute('data-host')).toBe('yes');
    await trigger.click();
    await expect.poll(() => document.activeElement === listElement()).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
    await expect.poll(() => document.activeElement).toBe(triggerElement);
  });

  test('the shadcn chevron turns for a plain trigger that reports aria-expanded', async () => {
    function PlainTrigger() {
      const phone = usePhoneInput({ defaultCountry: 'BY' });
      const [open, setOpen] = useState(false);
      return (
        <PhoneCountryTrigger
          aria-expanded={open}
          data-testid="plain"
          onClick={() => setOpen(true)}
          phone={phone}
        />
      );
    }
    await render(<PlainTrigger />);
    const chevron = () =>
      getComputedStyle(
        page.getByTestId('plain').element().querySelector('svg') as Element,
      ).transform;
    expect(chevron()).toBe('none');
    await page.getByTestId('plain').click();
    await expect.poll(chevron).not.toBe('none');
  });

  test('a wide screen keeps the built-in popover', async () => {
    await render(<ResponsivePhone wide />);
    await page.getByRole('combobox', { name: /^Select country/u }).click();
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
  });
});
