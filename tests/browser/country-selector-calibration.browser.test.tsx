import { type ComponentProps, Profiler } from 'react';
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  createPhoneCountryOptions,
  MuiPhoneInput,
  type PhoneCountrySelectorMode,
} from '../../packages/mui-phone-input/src';

type ProfilerCallback = NonNullable<ComponentProps<typeof Profiler>['onRender']>;

interface RenderMeasurement {
  commits: number;
  maxMs: number;
  totalMs: number;
}

function browserName(): 'chromium' | 'firefox' | 'webkit' {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Firefox/')) {
    return 'firefox';
  }
  if (userAgent.includes('AppleWebKit/') && !userAgent.includes('Chrome/')) {
    return 'webkit';
  }
  return 'chromium';
}

function createRenderRecorder() {
  const durations: number[] = [];
  const onRender: ProfilerCallback = (_id, _phase, actualDuration) => {
    durations.push(actualDuration);
  };

  return {
    onRender,
    reset() {
      durations.length = 0;
    },
    take(): RenderMeasurement {
      const values = durations.splice(0);
      return {
        commits: values.length,
        maxMs: Number(Math.max(0, ...values).toFixed(3)),
        totalMs: Number(values.reduce((sum, value) => sum + value, 0).toFixed(3)),
      };
    },
  };
}

function SelectorCalibrationHarness({
  mode,
  onRender,
  resultLimit,
}: {
  mode: PhoneCountrySelectorMode;
  onRender: ProfilerCallback;
  resultLimit: number;
}) {
  return (
    <Profiler id={`${mode}-${resultLimit}`} onRender={onRender}>
      <div data-calibration-shell="true" style={{ maxWidth: 360 }}>
        <MuiPhoneInput
          defaultCountry="BY"
          label="Calibration phone"
          slotProps={{
            countrySelector: {
              locale: 'de',
              mode,
              preferredCountries: ['BY', 'DE', 'PL', 'LT', 'BY'],
              resultLimit,
            },
          }}
        />
      </div>
    </Profiler>
  );
}

async function nextPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function activeOptionGeometry() {
  const search = document.querySelector<HTMLInputElement>('[role="combobox"]');
  const activeId = search?.getAttribute('aria-activedescendant');
  const listbox = document.querySelector<HTMLElement>('[role="listbox"]');
  const option = activeId ? document.getElementById(activeId) : null;
  if (!listbox || !option) {
    return {
      activeId,
      listbox: null,
      option: null,
      visible: false,
    };
  }

  const listboxRect = listbox.getBoundingClientRect();
  const optionRect = option.getBoundingClientRect();
  return {
    activeId,
    listbox: {
      bottom: Number(listboxRect.bottom.toFixed(3)),
      clientHeight: listbox.clientHeight,
      scrollHeight: listbox.scrollHeight,
      scrollTop: listbox.scrollTop,
      top: Number(listboxRect.top.toFixed(3)),
    },
    option: {
      bottom: Number(optionRect.bottom.toFixed(3)),
      height: Number(optionRect.height.toFixed(3)),
      top: Number(optionRect.top.toFixed(3)),
    },
    visible:
      optionRect.top >= listboxRect.top - 1 &&
      optionRect.bottom <= listboxRect.bottom + 1,
  };
}

function visibleActiveOption(): boolean {
  return activeOptionGeometry().visible;
}

function horizontalOverflowGeometry(listbox: HTMLElement) {
  return {
    clientWidth: listbox.clientWidth,
    overflowingOptions: [...listbox.querySelectorAll<HTMLElement>('[role="option"]')]
      .map((option) => ({
        clientWidth: option.clientWidth,
        country: option.dataset.country,
        scrollWidth: option.scrollWidth,
      }))
      .filter(({ clientWidth, scrollWidth }) => scrollWidth > clientWidth + 1)
      .slice(0, 5),
    scrollWidth: listbox.scrollWidth,
  };
}

describe('country selector calibration', () => {
  test('records standard-list rendering, filtering, memory proxy and reflow evidence', async () => {
    const authorityOptionCount = createPhoneCountryOptions({
      locale: 'de',
      preferredCountries: ['BY', 'DE', 'PL', 'LT', 'BY'],
    }).length;
    const boundedRecorder = createRenderRecorder();
    const bounded = await render(
      <SelectorCalibrationHarness
        mode="desktop"
        onRender={boundedRecorder.onRender}
        resultLimit={50}
      />,
    );
    await nextPaint();
    boundedRecorder.reset();
    await userEvent.click(page.getByRole('button', { name: /Select country/u }));
    await nextPaint();
    const boundedOpen = boundedRecorder.take();
    const boundedOptionCount = document.querySelectorAll('[role="option"]').length;
    expect(boundedOptionCount).toBe(50);

    const search = page.getByRole('combobox', { name: 'Search countries' });
    const filtered: Record<string, RenderMeasurement & { options: number }> = {};
    for (const query of ['united', '+375', 'Deutschland']) {
      boundedRecorder.reset();
      await userEvent.fill(search, query);
      await nextPaint();
      filtered[query] = {
        ...boundedRecorder.take(),
        options: document.querySelectorAll('[role="option"]').length,
      };
    }
    expect(page.getByRole('option', { name: /Deutschland, DE, \+49/u })).toBeVisible();
    await bounded.unmount();

    const fullRecorder = createRenderRecorder();
    const full = await render(
      <SelectorCalibrationHarness
        mode="desktop"
        onRender={fullRecorder.onRender}
        resultLimit={300}
      />,
    );
    await nextPaint();
    const nodesBeforeFullOpen = document.querySelectorAll('*').length;
    fullRecorder.reset();
    await userEvent.click(page.getByRole('button', { name: /Select country/u }));
    await nextPaint();
    const fullOpen = fullRecorder.take();
    const fullOptionCount = document.querySelectorAll('[role="option"]').length;
    const nodesAfterFullOpen = document.querySelectorAll('*').length;
    expect(fullOptionCount).toBe(authorityOptionCount);
    expect(
      new Set(
        [...document.querySelectorAll<HTMLElement>('[role="option"]')].map(
          (option) => option.dataset.country,
        ),
      ).size,
    ).toBe(authorityOptionCount);
    const preferredGroup = [
      ...document.querySelectorAll<HTMLElement>('[role="group"]'),
    ].find((group) => {
      const labelId = group.getAttribute('aria-labelledby');
      return (
        labelId &&
        document.getElementById(labelId)?.textContent === 'Preferred countries'
      );
    });
    const preferredOptionCount =
      preferredGroup?.querySelectorAll('[role="option"]').length ?? 0;
    const localFlagCount = document.querySelectorAll(
      '.MuiPhoneInput-countrySelectorFlag',
    ).length;
    expect(preferredOptionCount).toBe(4);
    expect(localFlagCount).toBeGreaterThanOrEqual(fullOptionCount);

    const fullSearch = document.querySelector<HTMLInputElement>('[role="combobox"]');
    expect(fullSearch).not.toBeNull();
    const keyboardStartedAt = performance.now();
    fullSearch?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'End' }),
    );
    await nextPaint();
    const keyboardSettleMs = Number((performance.now() - keyboardStartedAt).toFixed(3));
    expect(visibleActiveOption()).toBe(true);
    const beforeReflowGeometry = activeOptionGeometry();

    const originalFontSize = document.documentElement.style.fontSize;
    const reflowStartedAt = performance.now();
    document.documentElement.style.fontSize = '200%';
    window.dispatchEvent(new Event('resize'));
    await nextPaint();
    const reflowSettleMs = Number((performance.now() - reflowStartedAt).toFixed(3));
    const fullListbox = document.querySelector<HTMLElement>('[role="listbox"]');
    expect(fullListbox).not.toBeNull();
    if (!fullListbox) {
      throw new TypeError('Country selector calibration listbox is missing.');
    }
    const overflowGeometry = horizontalOverflowGeometry(fullListbox);
    expect(
      overflowGeometry.scrollWidth <= overflowGeometry.clientWidth + 1,
      JSON.stringify(overflowGeometry),
    ).toBe(true);
    const afterReflowGeometry = activeOptionGeometry();
    expect(afterReflowGeometry.visible, JSON.stringify(afterReflowGeometry)).toBe(true);
    document.documentElement.style.fontSize = originalFontSize;
    await full.unmount();

    const mobileBoundedRecorder = createRenderRecorder();
    const mobileBounded = await render(
      <SelectorCalibrationHarness
        mode="mobile"
        onRender={mobileBoundedRecorder.onRender}
        resultLimit={50}
      />,
    );
    await nextPaint();
    mobileBoundedRecorder.reset();
    await userEvent.click(page.getByRole('button', { name: /Select country/u }));
    await nextPaint();
    const mobileBoundedOpen = mobileBoundedRecorder.take();
    expect(page.getByRole('dialog', { name: 'Select country' })).toBeVisible();
    expect(document.querySelectorAll('[role="option"]').length).toBe(50);
    await mobileBounded.unmount();

    const mobileRecorder = createRenderRecorder();
    const mobile = await render(
      <SelectorCalibrationHarness
        mode="mobile"
        onRender={mobileRecorder.onRender}
        resultLimit={300}
      />,
    );
    await nextPaint();
    mobileRecorder.reset();
    await userEvent.click(page.getByRole('button', { name: /Select country/u }));
    await nextPaint();
    const mobileOpen = mobileRecorder.take();
    expect(page.getByRole('dialog', { name: 'Select country' })).toBeVisible();
    expect(document.querySelectorAll('[role="option"]').length).toBe(
      authorityOptionCount,
    );
    await mobile.unmount();

    const measurements = {
      authorityOptionCount,
      boundedOptionCount,
      browser: browserName(),
      desktop: {
        boundedOpen,
        filtered,
        fullOpen,
        fullOptionCount,
        keyboardSettleMs,
        localFlagCount,
        nodesAddedByFullOpen: nodesAfterFullOpen - nodesBeforeFullOpen,
        preferredOptionCount,
        reflowGeometry: { after: afterReflowGeometry, before: beforeReflowGeometry },
        reflowSettleMs,
        zoomOverflow: overflowGeometry,
      },
      mobile: { boundedOpen: mobileBoundedOpen, fullOpen: mobileOpen },
    };
    console.info(`COUNTRY_SELECTOR_CALIBRATION ${JSON.stringify(measurements)}`);
  });
});
