'use client';

import { Combobox } from '@base-ui/react/combobox';
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
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

import type { PhoneCountryOption } from '../country-selector';
import type { PhoneCountrySelectorMessages } from '../country-selector-messages';
import { PhoneCountryFlag } from '../flags';
import type {
  CountryHighlight,
  CountryOptionGroup,
  PhoneCountryFlagOptions,
  PhoneCountryListClassNames,
} from './PhoneCountryParts';

type CountryRow =
  | { group: CountryOptionGroup; key: string; kind: 'start' | 'end' }
  | { key: string; kind: 'option'; option: PhoneCountryOption; optionIndex: number };

interface VirtualGroup {
  end: number;
  group: CountryOptionGroup;
  start: number;
}

function rowAt(rows: readonly CountryRow[], index: number): CountryRow {
  const row = rows[index];
  if (!row) throw new RangeError('Country row is outside the complete model.');
  return row;
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

/** Group borders, padding and labels stay in normal flow, including custom skins. */
function measureRow(
  element: HTMLDivElement,
  entry: ResizeObserverEntry | undefined,
): number {
  // ResizeObserver keeps fractional sizes without including an animating
  // container's transform. offsetHeight seeds the first synchronous measure.
  let size = entry?.borderBoxSize[0]?.blockSize ?? element.offsetHeight;
  const edge = element.dataset.countryGroupEdge;
  if (edge && element.parentElement) {
    size += spacing(
      getComputedStyle(element.parentElement),
      edge === 'start' ? 'Top' : 'Bottom',
    );
  }
  return size;
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
  const [centered, setCentered] = useState(false);
  const [activeDescendant, setActiveDescendant] = useState<string | undefined>();
  const [padding, setPadding] = useState({ start: 0, end: 0 });
  const previousQuery = useRef(query);
  const model = useMemo(() => {
    const rows: CountryRow[] = [];
    const virtualGroups: VirtualGroup[] = [];
    const countryRows = new Map<CountryCode, number>();
    const edges: number[] = [];
    let optionIndex = 0;
    for (const group of groups) {
      const start = rows.length;
      rows.push({ group, key: `${group.key}:start`, kind: 'start' });
      edges.push(start);
      for (const option of group.items) {
        countryRows.set(option.country, rows.length);
        rows.push({ key: option.country, kind: 'option', option, optionIndex });
        optionIndex += 1;
      }
      const end = rows.length;
      rows.push({ group, key: `${group.key}:end`, kind: 'end' });
      edges.push(end);
      virtualGroups.push({ end, group, start });
    }
    return { countryRows, edges, optionCount: optionIndex, rows, virtualGroups };
  }, [groups]);
  const highlightedIndex = highlighted?.country
    ? (model.countryRows.get(highlighted.country) ?? -1)
    : -1;
  const initialIndex = initialCountry
    ? (model.countryRows.get(initialCountry) ?? -1)
    : -1;
  const selectedIndex = selectedCountry
    ? (model.countryRows.get(selectedCountry) ?? -1)
    : -1;
  const getItemKey = useCallback(
    (index: number) => rowAt(model.rows, index).key,
    [model.rows],
  );
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: model.rows.length,
    getScrollElement: () => listRef.current,
    getItemKey,
    // Estimates seed the first window only. No option gets a fixed height.
    estimateSize: (index) => {
      const row = rowAt(model.rows, index);
      if (row.kind === 'option') return 44;
      return row.kind === 'start' && hasPreferred && row.group.key !== 'results'
        ? 28
        : 0;
    },
    initialRect: { height: 320, width: 0 },
    measureElement: measureRow,
    overscan: 4,
    paddingStart: padding.start,
    paddingEnd: padding.end,
    rangeExtractor: (range) => {
      const indexes = new Set([...defaultRangeExtractor(range), ...model.edges]);
      // Keyboard navigation uses the complete Base UI model. Keep its active
      // descendant mounted even when Home/End crosses the current window.
      if (highlightedIndex >= 0) indexes.add(highlightedIndex);
      if (selectedIndex >= 0) indexes.add(selectedIndex);
      return [...indexes].sort((a, b) => a - b);
    },
  });
  const virtualRows = virtualizer.getVirtualItems();
  const virtualRowsByIndex = new Map(virtualRows.map((row) => [row.index, row]));

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const style = getComputedStyle(list);
    const start = Number.parseFloat(style.paddingTop) || 0;
    const end = Number.parseFloat(style.paddingBottom) || 0;
    setPadding((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  });

  useLayoutEffect(() => {
    if (previousQuery.current === query) return;
    previousQuery.current = query;
    // A short result set must not inherit a deep scroll offset from all countries.
    virtualizer.scrollToOffset(0);
    setCentered(true);
  }, [query, virtualizer]);

  useLayoutEffect(() => {
    if (centered || !listRef.current?.clientHeight) return;
    const frame = window.requestAnimationFrame(() => {
      if (initialIndex >= 0) {
        virtualizer.scrollToIndex(initialIndex, { align: 'center' });
      }
      setCentered(true);
    });
    return () => window.cancelAnimationFrame(frame);
  });

  useLayoutEffect(() => {
    if (!highlighted || highlighted.reason === 'pointer' || highlightedIndex < 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      virtualizer.scrollToIndex(highlightedIndex, { align: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [highlighted, highlightedIndex, virtualizer]);

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
      ref={listRef}
    >
      {virtualRows.length === 0 ? (
        <Spacer size={virtualizer.getTotalSize() - padding.start - padding.end} />
      ) : (
        model.virtualGroups.map(({ end, group, start }) => {
          const header = virtualRowsByIndex.get(start);
          const footer = virtualRowsByIndex.get(end);
          if (!header || !footer)
            throw new Error('Country group boundaries must stay mounted.');
          let previousEnd = header.end;
          return (
            <Combobox.Group
              className={classNames.group}
              data-slot="phone-country-group"
              items={group.items}
              key={group.key}
            >
              <div
                data-country-group-edge="start"
                data-index={start}
                ref={virtualizer.measureElement}
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
              {virtualRows
                .filter((row) => row.index > start && row.index < end)
                .map((virtualRow) => {
                  const row = model.rows[virtualRow.index];
                  if (row?.kind !== 'option') return null;
                  const gap = virtualRow.start - previousEnd;
                  previousEnd = virtualRow.end;
                  const { option } = row;
                  return (
                    <Fragment key={option.country}>
                      <Spacer size={gap} />
                      <Combobox.Item
                        aria-posinset={row.optionIndex + 1}
                        aria-setsize={model.optionCount}
                        className={classNames.option}
                        data-index={virtualRow.index}
                        data-preferred={option.preferred || undefined}
                        data-slot="phone-country-option"
                        index={row.optionIndex}
                        ref={virtualizer.measureElement}
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
                        <span data-slot="phone-country-name">
                          {option.localizedName}
                        </span>
                        <span data-slot="phone-country-calling-code" dir="ltr">
                          +{option.callingCode}
                        </span>
                        <Combobox.ItemIndicator data-slot="phone-country-indicator">
                          {CHECK_ICON}
                        </Combobox.ItemIndicator>
                      </Combobox.Item>
                    </Fragment>
                  );
                })}
              <Spacer size={footer.start - previousEnd} />
              <div
                data-country-group-edge="end"
                data-index={end}
                ref={virtualizer.measureElement}
              />
            </Combobox.Group>
          );
        })
      )}
    </Combobox.List>
  );
}
