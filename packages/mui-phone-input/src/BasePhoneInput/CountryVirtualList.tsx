'use client';

import { Combobox } from '@base-ui/react/combobox';
import type { CountryCode } from 'libphonenumber-js/core';
import {
  Fragment,
  type ReactNode,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import type { PhoneCountrySelectorMessages } from '../country-selector-messages';
import { PhoneCountryFlag } from '../flags';
import type {
  CountryHighlight,
  CountryOptionGroup,
  PhoneCountryFlagOptions,
  PhoneCountryListClassNames,
} from './PhoneCountryParts';

interface CountryWindowModel {
  keys: readonly string[];
  indices: ReadonlyMap<string, number>;
  estimates: ReadonlyMap<string, number>;
}

interface VirtualGroup {
  optionOffset: number;
  end: number;
  group: CountryOptionGroup;
  start: number;
}

interface CountryVirtualListProps {
  classNames: PhoneCountryListClassNames;
  flags: PhoneCountryFlagOptions | undefined;
  groups: readonly CountryOptionGroup[];
  hasPreferred: boolean;
  highlighted: CountryHighlight | null;
  inline: boolean;
  listProps: Omit<Combobox.List.Props, 'children'> | undefined;
  listRef: RefObject<HTMLDivElement | null>;
  messages: PhoneCountrySelectorMessages;
  query: string;
  selectedCountry: CountryCode | null;
}

const CHECK_ICON = (
  <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14">
    <path
      d="m3 7.5 2.5 2.5L11 4.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

function spacing(style: CSSStyleDeclaration, edge: 'Top' | 'Bottom'): number {
  return (
    (Number.parseFloat(style[`margin${edge}`]) || 0) +
    (Number.parseFloat(style[`padding${edge}`]) || 0) +
    (Number.parseFloat(style[`border${edge}Width`]) || 0)
  );
}

interface CountryGeometry {
  sizes: ReadonlyMap<string, number>;
  offset: number;
  height: number;
  padding: number;
}
type CountryPosition =
  | { key: string; align: 'auto' | 'center'; model: CountryWindowModel }
  | { key: string; align: 'anchor'; offset: number; scroll: number };

function windowRange(offsets: readonly number[], offset: number, height: number) {
  const last = offsets.length - 2;
  let start = 0;
  while (start < last && (offsets[start + 1] ?? 0) <= offset) start += 1;
  let end = start;
  while (end < last && (offsets[end] ?? 0) < offset + height) end += 1;
  return [Math.max(0, start - 4), Math.min(last, end + 4)] as const;
}

/** One measured prefix/window; Base UI retains the complete item model. */
function useCountryWindow(
  model: CountryWindowModel,
  listRef: RefObject<HTMLDivElement | null>,
) {
  const [geometry, setGeometry] = useState<CountryGeometry>(() => ({
    sizes: new Map(),
    offset: 0,
    height: 320,
    padding: 0,
  }));
  const observer = useRef<ResizeObserver | null>(null);
  const position = useRef<CountryPosition | null>(null);
  const ownOffset = useRef<number | null>(null);
  const scrolling = useRef(false);
  const layout = useMemo(() => {
    const offsets = [geometry.padding];
    for (const key of model.keys) {
      const size =
        (geometry.sizes.get(key) ?? model.estimates.get(key) ?? 44) +
        (geometry.sizes.get(key + ':spacing') ?? 0);
      offsets.push((offsets.at(-1) ?? 0) + size);
    }
    return {
      model,
      offsets,
      geometry,
      range: windowRange(offsets, geometry.offset, geometry.height),
    };
  }, [geometry, model]);
  const committed = useRef(layout);
  const publishOffset = useCallback((offset: number, sync: boolean) => {
    const current = committed.current;
    const range = windowRange(current.offsets, offset, current.geometry.height);
    if (range[0] === current.range[0] && range[1] === current.range[1]) return;
    const update = () => setGeometry((value) => ({ ...value, offset }));
    if (sync) flushSync(update);
    else update();
  }, []);
  const writeOffset = useCallback(
    (offset: number) => {
      const node = listRef.current;
      if (!node) return;
      const next = Math.max(0, Math.min(offset, node.scrollHeight - node.clientHeight));
      if (Math.abs(node.scrollTop - next) > 0.5) {
        ownOffset.current = next;
        node.scrollTop = next;
      }
      publishOffset(node.scrollTop, false);
    },
    [listRef, publishOffset],
  );
  const alignTarget = useCallback(() => {
    const node = listRef.current;
    const pending = position.current;
    if (!node?.clientHeight || !pending) return;
    const current = committed.current;
    const index = current.model.indices.get(pending.key);
    if (index === undefined) {
      position.current = null;
      return;
    }
    const start = current.offsets[index] ?? 0;
    const end = current.offsets[index + 1] ?? start;
    const offset = node.scrollTop;
    if (pending.align === 'anchor') {
      if (scrolling.current) return;
      position.current = null;
      if (Math.abs(offset - pending.scroll) < 1) writeOffset(start + pending.offset);
    } else {
      writeOffset(
        pending.align === 'center'
          ? (start + end - node.clientHeight) / 2
          : start < offset
            ? start
            : end > offset + node.clientHeight
              ? end - node.clientHeight
              : offset,
      );
    }
  }, [listRef, writeOffset]);
  const measureElement = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const key = node.dataset.countryRow;
    if (!key) throw new Error('A measured country row must have its stable key.');
    observer.current?.observe(node, { box: 'border-box' });
    return () => {
      observer.current?.unobserve(node);
    };
  }, []);
  const setListElement = useCallback(
    (list: HTMLDivElement | null) => {
      listRef.current = list;
      if (!list) return;
      let live = true;
      let idle = 0;
      const resize = new ResizeObserver((entries) => {
        if (!live || !list.isConnected) return;
        const current = committed.current;
        const deltas = new Map<string, number>();
        for (const entry of entries) {
          const node = entry.target as HTMLDivElement;
          const key = node.dataset.countryRow;
          if (key && current.model.indices.has(key) && list.contains(node)) {
            const size = entry.borderBoxSize[0]?.blockSize ?? node.offsetHeight;
            if (size > 0 || node.dataset.countryGroupEdge) deltas.set(key, size);
          }
        }
        // Group spacing can change without resizing either zero-height edge.
        // Snapshot it with each delivery; only these few boundaries need a scan.
        const styles = new Map<Element, CSSStyleDeclaration>();
        for (const node of list.querySelectorAll<HTMLDivElement>(
          '[data-country-group-edge]',
        )) {
          const key = node.dataset.countryRow;
          const parent = node.parentElement;
          if (!key || !parent || !current.model.indices.has(key)) continue;
          let style = styles.get(parent);
          if (!style) {
            style = getComputedStyle(parent);
            styles.set(parent, style);
          }
          deltas.set(
            key + ':spacing',
            spacing(
              style,
              node.dataset.countryGroupEdge === 'start' ? 'Top' : 'Bottom',
            ),
          );
        }
        const padding = Number.parseFloat(getComputedStyle(list).paddingTop) || 0;
        const height = list.clientHeight || 320;
        const offset = list.scrollTop;
        if (
          padding !== current.geometry.padding ||
          [...deltas].some(([key, size]) => current.geometry.sizes.get(key) !== size)
        ) {
          const index =
            current.offsets.findIndex((end, index) => index > 0 && end > offset) - 1;
          const key = current.model.keys[index];
          if (!position.current && key && offset > 0) {
            position.current = {
              key,
              align: 'anchor',
              offset: offset - (current.offsets[index] ?? 0),
              scroll: offset,
            };
          }
        }
        // Merge queued deliveries in order, including those preceding a commit.
        // The updater consumes snapshots only: no DOM reads or ref mutations.
        setGeometry((previous) => {
          let sizes: Map<string, number> | undefined;
          for (const [key, size] of deltas) {
            if (previous.sizes.get(key) !== size) {
              sizes ??= new Map(previous.sizes);
              sizes.set(key, size);
            }
          }
          return sizes ||
            padding !== previous.padding ||
            height !== previous.height ||
            offset !== previous.offset
            ? { sizes: sizes ?? previous.sizes, padding, height, offset }
            : previous;
        });
      });
      observer.current = resize;
      resize.observe(list);
      for (const node of list.querySelectorAll('[data-country-row]'))
        resize.observe(node, { box: 'border-box' });
      const onScroll = () => {
        const offset = list.scrollTop;
        const own =
          ownOffset.current !== null && Math.abs(offset - ownOffset.current) < 1;
        if (!own) {
          ownOffset.current = null;
          position.current = null;
          scrolling.current = true;
          clearTimeout(idle);
          idle = window.setTimeout(() => {
            scrolling.current = false;
            alignTarget();
          }, 150);
        }
        publishOffset(offset, !own);
      };
      list.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        live = false;
        resize.disconnect();
        if (observer.current === resize) {
          observer.current = null;
          scrolling.current = false;
        }
        if (listRef.current === list) listRef.current = null;
        list.removeEventListener('scroll', onScroll);
        clearTimeout(idle);
      };
    },
    [alignTarget, listRef, publishOffset],
  );
  useLayoutEffect(() => {
    if (
      position.current?.align === 'center' &&
      position.current.model !== layout.model
    ) {
      position.current = null;
    }
    committed.current = layout;
    if (layout.model.keys.length > 0 && layout.geometry.height > 0) alignTarget();
  }, [alignTarget, layout]);
  const cancelAlignment = useCallback(() => {
    position.current = null;
  }, []);
  const scrollToOffset = useCallback(
    (offset: number) => {
      cancelAlignment();
      writeOffset(offset);
    },
    [cancelAlignment, writeOffset],
  );
  const scrollToIndex = useCallback(
    (index: number, align: 'auto' | 'center') => {
      const current = committed.current;
      const key = current.model.keys[index];
      if (!key) return;
      position.current = { key, align, model: current.model };
      alignTarget();
    },
    [alignTarget],
  );
  return {
    offsets: layout.offsets,
    range: layout.range,
    measureElement,
    cancelAlignment,
    scrollToIndex,
    scrollToOffset,
    setListElement,
  };
}

function Spacer({ size }: { size: number }): ReactNode {
  return size > 0 ? (
    <div
      aria-hidden="true"
      data-slot="phone-country-spacer"
      role="presentation"
      style={{ flex: 'none', height: size, pointerEvents: 'none' }}
    />
  ) : null;
}

/** One measured, grouped window for the inline list and the built-in popover. */
export function CountryVirtualList({
  classNames,
  flags,
  groups,
  hasPreferred,
  highlighted,
  inline,
  listProps,
  listRef,
  messages,
  query,
  selectedCountry,
}: CountryVirtualListProps): ReactNode {
  const [initialCountry] = useState(selectedCountry);
  const centered = useRef(false);
  const [activeDescendant, setActiveDescendant] = useState<string | undefined>();
  const previousQuery = useRef(query);
  const model = useMemo(() => {
    const keys: string[] = [];
    const indices = new Map<string, number>();
    const estimates = new Map<string, number>();
    const virtualGroups: VirtualGroup[] = [];
    const add = (key: string, estimate?: number) => {
      indices.set(key, keys.length);
      keys.push(key);
      if (estimate !== undefined) estimates.set(key, estimate);
    };
    let optionCount = 0;
    for (const group of groups) {
      const start = keys.length;
      add(group.key + ':start', hasPreferred && group.key !== 'results' ? 28 : 0);
      for (const option of group.items) add(option.country);
      const end = keys.length;
      add(group.key + ':end', 0);
      virtualGroups.push({ start, end, group, optionOffset: optionCount });
      optionCount += group.items.length;
    }
    return { keys, indices, estimates, optionCount, virtualGroups };
  }, [groups, hasPreferred]);
  const highlightedIndex = highlighted?.country
    ? (model.indices.get(highlighted.country) ?? -1)
    : -1;
  const initialIndex = initialCountry ? (model.indices.get(initialCountry) ?? -1) : -1;
  const selectedIndex = selectedCountry
    ? (model.indices.get(selectedCountry) ?? -1)
    : -1;
  const {
    cancelAlignment,
    offsets,
    range,
    measureElement,
    scrollToIndex,
    scrollToOffset,
    setListElement,
  } = useCountryWindow(model, listRef);

  useLayoutEffect(() => {
    if (previousQuery.current === query) return;
    previousQuery.current = query;
    // A short result set must not inherit a deep scroll offset from all countries.
    scrollToOffset(0);
    centered.current = true;
  }, [query, scrollToOffset]);

  useLayoutEffect(() => {
    if (centered.current || !listRef.current?.clientHeight) return;
    const frame = window.requestAnimationFrame(() => {
      if (initialIndex >= 0) {
        scrollToIndex(initialIndex, 'center');
      }
      centered.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  });

  useLayoutEffect(() => {
    if (highlighted?.reason === 'pointer') {
      cancelAlignment();
      return;
    }
    if (!highlighted || highlightedIndex < 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      scrollToIndex(highlightedIndex, 'auto');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [cancelAlignment, highlighted, highlightedIndex, scrollToIndex]);

  // Base UI owns the search input's active descendant. A host-focused inline
  // list needs the same mounted row id, including virtualizer-only renders.
  useLayoutEffect(() => {
    if (!inline) return;
    const id = listRef.current?.querySelector<HTMLElement>(
      '[role="option"][data-highlighted]',
    )?.id;
    setActiveDescendant(id || undefined);
  });

  return (
    <Combobox.List
      {...listProps}
      aria-activedescendant={
        inline ? activeDescendant : listProps?.['aria-activedescendant']
      }
      aria-label={listProps?.['aria-label'] ?? messages.dialogTitle}
      className={listProps?.className ?? classNames.list}
      data-slot="phone-country-list"
      ref={setListElement}
    >
      {model.virtualGroups.map(({ end, group, optionOffset, start }) => {
        const children: ReactNode[] = [];
        let previousEnd = offsets[start + 1] ?? 0;
        for (let item = 0; item < group.items.length; item += 1) {
          const index = start + item + 1;
          if (
            (index < range[0] || index > range[1]) &&
            index !== highlightedIndex &&
            index !== selectedIndex
          )
            continue;
          const option = group.items[item];
          if (!option) continue;
          const gap = (offsets[index] ?? 0) - previousEnd;
          previousEnd = offsets[index + 1] ?? 0;
          children.push(
            <Fragment key={option.country}>
              <Spacer size={gap} />
              <Combobox.Item
                aria-posinset={optionOffset + item + 1}
                aria-setsize={model.optionCount}
                className={classNames.option}
                data-index={index}
                data-country-row={option.country}
                data-preferred={option.preferred || undefined}
                data-slot="phone-country-option"
                index={optionOffset + item}
                ref={measureElement}
                value={option}
              >
                <PhoneCountryFlag
                  {...flags}
                  className={classNames.flag}
                  country={option.country}
                  data-slot="phone-country-flag"
                  mode={flags?.mode ?? 'none'}
                  placement="option"
                />
                <span data-slot="phone-country-code">{option.country}</span>
                <span data-slot="phone-country-name">{option.localizedName}</span>
                <span data-slot="phone-country-calling-code" dir="ltr">
                  +{option.callingCode}
                </span>
                <Combobox.ItemIndicator data-slot="phone-country-indicator">
                  {CHECK_ICON}
                </Combobox.ItemIndicator>
              </Combobox.Item>
            </Fragment>,
          );
        }
        return (
          <Combobox.Group
            className={classNames.group}
            data-slot="phone-country-group"
            items={group.items}
            key={group.key}
          >
            <div
              data-country-group-edge="start"
              data-country-row={group.key + ':start'}
              data-index={start}
              ref={measureElement}
            >
              {hasPreferred && group.key !== 'results' && (
                <Combobox.GroupLabel
                  className={classNames.groupLabel}
                  data-slot="phone-country-group-label"
                >
                  {group.key === 'preferred'
                    ? messages.preferredCountries
                    : messages.allCountries}
                </Combobox.GroupLabel>
              )}
            </div>
            {children}
            <Spacer size={(offsets[end] ?? 0) - previousEnd} />
            <div
              data-country-group-edge="end"
              data-country-row={group.key + ':end'}
              data-index={end}
              ref={measureElement}
            />
          </Combobox.Group>
        );
      })}
    </Combobox.List>
  );
}
