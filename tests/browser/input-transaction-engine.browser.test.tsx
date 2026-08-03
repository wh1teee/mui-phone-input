import {
  createRef,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { cleanup, render } from 'vitest-browser-react';

import type {
  InputEngineContext,
  InputSelection,
} from '../../packages/mui-phone-input/src/internal/input-transaction-engine';
import { useInputTransactionEngineBridge } from '../../packages/mui-phone-input/src/internal/use-input-transaction-engine';

const INPUT_CONTEXT = {
  fixedCallingCode: false,
  formatStrategyKey: 'international',
  locale: 'en',
} satisfies InputEngineContext;

const shadowHosts: HTMLElement[] = [];
const shadowRoots: Root[] = [];

type InputTransactionEngineHarnessHandle = Readonly<{
  reconcile(selection: InputSelection): void;
}>;

const InputTransactionEngineHarness = forwardRef<InputTransactionEngineHarnessHandle>(
  function InputTransactionEngineHarness(_props, ref) {
    const bridge = useInputTransactionEngineBridge();
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        reconcile(selection) {
          bridge.reconcileExternal(
            {
              displayValue: '+1202',
              selection,
            },
            INPUT_CONTEXT,
          );
        },
      }),
      [bridge],
    );

    useLayoutEffect(() => {
      const input = inputRef.current;
      if (!input) {
        throw new Error('Missing Input Transaction engine test input.');
      }

      return bridge.attach(input);
    }, [bridge]);

    return <input data-testid="engine-input" defaultValue="+1202" ref={inputRef} />;
  },
);

async function renderInputTransactionEngineHarness(): Promise<
  Readonly<{
    handle: InputTransactionEngineHarnessHandle;
    input: HTMLInputElement;
    otherControl: HTMLButtonElement;
  }>
> {
  const handleRef = createRef<InputTransactionEngineHarnessHandle>();
  render(
    <>
      <InputTransactionEngineHarness ref={handleRef} />
      <button data-testid="other-control" type="button">
        Other control
      </button>
    </>,
  );

  const inputLocator = page.getByTestId('engine-input');
  const otherControlLocator = page.getByTestId('other-control');
  await expect.element(inputLocator).toBeInTheDocument();
  await expect.element(otherControlLocator).toBeInTheDocument();
  const input = inputLocator.element();
  const otherControl = otherControlLocator.element();
  const handle = handleRef.current;

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected the Input Transaction engine test input.');
  }
  if (!(otherControl instanceof HTMLButtonElement)) {
    throw new Error('Expected the Input Transaction engine alternate control.');
  }
  if (!handle) {
    throw new Error('Missing Input Transaction engine test handle.');
  }

  return { handle, input, otherControl };
}

async function renderShadowInputTransactionEngineHarness(): Promise<
  Readonly<{
    handle: InputTransactionEngineHarnessHandle;
    host: HTMLElement;
    input: HTMLInputElement;
    shadowRoot: ShadowRoot;
  }>
> {
  const host = document.createElement('div');
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const handleRef = createRef<InputTransactionEngineHarnessHandle>();
  const root = createRoot(shadowRoot);
  document.body.append(host);
  shadowHosts.push(host);
  shadowRoots.push(root);

  flushSync(() => {
    root.render(<InputTransactionEngineHarness ref={handleRef} />);
  });

  const input = shadowRoot.querySelector('[data-testid="engine-input"]');
  const handle = handleRef.current;

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected the shadow-root Input Transaction engine test input.');
  }
  if (!handle) {
    throw new Error('Missing shadow-root Input Transaction engine test handle.');
  }

  return { handle, host, input, shadowRoot };
}

afterEach(async () => {
  for (const root of shadowRoots.splice(0)) {
    flushSync(() => root.unmount());
  }
  for (const host of shadowHosts.splice(0)) {
    host.remove();
  }
  await cleanup();
  vi.restoreAllMocks();
});

describe('Input Transaction engine bridge', () => {
  test('does not write selection or transfer focus during unfocused reconciliation', async () => {
    const { handle, input, otherControl } = await renderInputTransactionEngineHarness();
    input.focus();
    input.setSelectionRange(0, 0);
    otherControl.focus();
    const setSelectionRange = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');

    handle.reconcile([2, 2]);

    expect(setSelectionRange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(otherControl);
    expect(input.value).toBe('+1202');
  });

  test('restores requested selection during focused reconciliation', async () => {
    const { handle, input } = await renderInputTransactionEngineHarness();
    input.focus();
    input.setSelectionRange(0, 0);
    const setSelectionRange = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');

    handle.reconcile([2, 2]);

    expect(setSelectionRange).toHaveBeenCalledOnce();
    expect(setSelectionRange).toHaveBeenCalledWith(2, 2);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('+1202');
  });

  test('restores requested selection for an input focused inside an open shadow root', async () => {
    const { handle, host, input, shadowRoot } =
      await renderShadowInputTransactionEngineHarness();
    input.focus();
    input.setSelectionRange(0, 0);

    expect(document.activeElement).toBe(host);
    expect(shadowRoot.activeElement).toBe(input);
    expect(input.matches(':focus')).toBe(true);

    const setSelectionRange = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');

    handle.reconcile([2, 2]);

    expect(setSelectionRange).toHaveBeenCalledOnce();
    expect(setSelectionRange).toHaveBeenCalledWith(2, 2);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
    expect(document.activeElement).toBe(host);
    expect(shadowRoot.activeElement).toBe(input);
    expect(input.matches(':focus')).toBe(true);
    expect(input.value).toBe('+1202');
  });
});
