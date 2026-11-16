'use client';

import { Combobox } from '@base-ui/react/combobox';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import type { CountryCode } from 'libphonenumber-js/core';
import {
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type CreatePhoneCountryOptionsParameters,
  createPhoneCountryOptions,
  type FilterPhoneCountryOptionsParameters,
  filterPhoneCountryOptions,
  type PhoneCountryNameResolver,
  type PhoneCountryOption,
  resolveDisplayedPhoneCountry,
} from '../country-selector';
import type { PhoneCountrySelectorMessages } from '../country-selector-messages';
import {
  createPhoneCountryTriggerState,
  formatPhoneCountryTriggerLabel,
  type PhoneCountryTriggerContent,
  resolvePhoneCountryTriggerParts,
} from '../country-selector-trigger';
import { PhoneCountryFlag, type PhoneCountryFlagProps } from '../flags';
import { en } from '../locales/en';
import type { UsePhoneInputReturn } from '../usePhoneInput';

export type PhoneCountryFlagOptions = Pick<
  PhoneCountryFlagProps,
  'external' | 'mode' | 'provider'
>;

/**
 * Where focus lands when the country list appears.
 * - `true`: the search field.
 * - `false`: the list itself (no on-screen keyboard; arrows still work).
 * - `'fine-pointer'`: the search field when `(pointer: fine)` matches,
 *   otherwise the list.
 */
export type PhoneCountryAutoFocusSearch = boolean | 'fine-pointer';

export interface PhoneCountryListClassNames {
  empty?: string;
  flag?: string;
  group?: string;
  groupLabel?: string;
  list?: string;
  option?: string;
  search?: string;
}

/** Options shared by every country part. */
export interface PhoneCountryPartOptions
  extends Omit<CreatePhoneCountryOptionsParameters, 'metadata'> {
  flags?: PhoneCountryFlagOptions;
  messages?: Partial<PhoneCountrySelectorMessages>;
  phone: UsePhoneInputReturn;
}

// A type alias (not an interface) satisfies Base UI's indexed Group shape.
type CountryOptionGroup = {
  items: readonly PhoneCountryOption[];
  key: 'all' | 'preferred' | 'results';
};

function groupCountryOptions(
  options: readonly PhoneCountryOption[],
  searching: boolean,
): CountryOptionGroup[] {
  // Ranked search results stay flat; grouping them would split relevance order.
  const groups: CountryOptionGroup[] = searching
    ? [{ items: options, key: 'results' }]
    : [
        { items: options.filter((option) => option.preferred), key: 'preferred' },
        { items: options.filter((option) => !option.preferred), key: 'all' },
      ];
  // Empty groups are dropped so Combobox.Empty can report "no matches".
  return groups.filter((group) => group.items.length > 0);
}

/** English, then the messages given to `usePhoneInput`, then the part's own prop. */
export function resolveCountryMessages(
  phone: UsePhoneInputReturn,
  messages: Partial<PhoneCountrySelectorMessages> | undefined,
): PhoneCountrySelectorMessages {
  return { ...en.messages, ...phone.state.messages, ...messages };
}

/** The country the trigger and list show as selected, outside any filter. */
export function useSelectedCountryOption(
  phone: UsePhoneInputReturn,
  locale: string,
  resolveCountryName: PhoneCountryNameResolver | undefined,
  options?: readonly PhoneCountryOption[],
): PhoneCountryOption | null {
  const country = resolveDisplayedPhoneCountry(
    phone.state.selectedCountry,
    phone.state.numberingPlan,
    phone.state.metadata,
  );
  // A filter limits available choices, not the identity of an existing value.
  return useMemo(
    () =>
      options?.find((option) => option.country === country) ??
      (country
        ? (createPhoneCountryOptions({
            locale,
            metadata: phone.state.metadata,
            countryFilter: (code: CountryCode) => code === country,
            resolveCountryName,
          } as CreatePhoneCountryOptionsParameters)[0] ?? null)
        : null),
    [country, locale, options, phone.state.metadata, resolveCountryName],
  );
}

interface CountryComboboxModelParameters extends PhoneCountryPartOptions {
  resultLimit?: number | undefined;
}

interface CountryComboboxModel {
  disabled: boolean;
  hasPreferred: boolean;
  resetQuery: () => void;
  rootProps: {
    autoHighlight: true;
    disabled: boolean;
    filteredItems: CountryOptionGroup[];
    inputValue: string;
    isItemEqualToValue: (
      item: PhoneCountryOption,
      value: PhoneCountryOption,
    ) => boolean;
    itemToStringLabel: (item: PhoneCountryOption) => string;
    itemToStringValue: (item: PhoneCountryOption) => string;
    items: CountryOptionGroup[];
    onInputValueChange: (value: string) => void;
    value: PhoneCountryOption | null;
  };
  selected: PhoneCountryOption | null;
}

/** One list model and Combobox.Root configuration for the popover and the inline list. */
export function useCountryComboboxModel({
  countryFilter,
  countryOrder,
  locale: localeProp,
  phone,
  preferredCountries,
  resolveCountryName,
  resultLimit,
  searchAliases,
}: CountryComboboxModelParameters): CountryComboboxModel {
  // The part's own locale wins; otherwise the language given to usePhoneInput.
  const locale = localeProp ?? phone.state.locale;
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const disabled = phone.state.disabled || phone.state.readOnly;
  const options = useMemo(
    () =>
      // Every option reads undefined as "not given".
      createPhoneCountryOptions({
        countryFilter,
        countryOrder,
        locale,
        metadata: phone.state.metadata,
        preferredCountries,
        resolveCountryName,
        searchAliases,
      } as CreatePhoneCountryOptionsParameters),
    [
      countryFilter,
      countryOrder,
      locale,
      phone.state.metadata,
      preferredCountries,
      resolveCountryName,
      searchAliases,
    ],
  );
  const selected = useSelectedCountryOption(phone, locale, resolveCountryName, options);
  const selectedCountry = selected?.country ?? null;
  const hasPreferred = options.some((option) => option.preferred);
  const groups = useMemo(() => groupCountryOptions(options, false), [options]);
  // The shared authority ranks matches; Base UI only renders the result.
  const filteredGroups = useMemo(
    () =>
      groupCountryOptions(
        filterPhoneCountryOptions(options, query, {
          limit: resultLimit,
          selectedCountry,
        } as FilterPhoneCountryOptionsParameters),
        searching,
      ),
    [options, query, resultLimit, searching, selectedCountry],
  );
  return {
    disabled,
    hasPreferred,
    resetQuery: () => setQuery(''),
    rootProps: {
      autoHighlight: true,
      disabled,
      filteredItems: filteredGroups,
      inputValue: query,
      isItemEqualToValue: (item: PhoneCountryOption, value: PhoneCountryOption) =>
        item.country === value.country,
      itemToStringLabel: (item: PhoneCountryOption) => item.localizedName,
      itemToStringValue: (item: PhoneCountryOption) => item.country,
      items: groups,
      onInputValueChange: setQuery,
      value: selected,
    },
    selected,
  };
}

export function withDirection(
  dir: 'ltr' | 'rtl' | undefined,
  node: ReactNode,
): ReactNode {
  return dir ? <DirectionProvider direction={dir}>{node}</DirectionProvider> : node;
}

// Effects only, so window exists.
function matchesFinePointer(): boolean {
  return window.matchMedia?.('(pointer: fine)').matches ?? false;
}

/** Read at focus time, never during render, so SSR and hydration agree. */
export function shouldFocusCountrySearch(mode: PhoneCountryAutoFocusSearch): boolean {
  return mode === 'fine-pointer' ? matchesFinePointer() : mode;
}

function scrollSelectedRowIntoView(list: HTMLElement): void {
  const row = list.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
  if (!row) {
    return;
  }
  // Only the list scrolls: scrollIntoView would also move a host sheet or the page.
  // Centred on mount, so rows above and below it stay in view.
  const listBox = list.getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  list.scrollTop += rowBox.top - listBox.top - (list.clientHeight - rowBox.height) / 2;
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

interface CountryListBodyProps {
  classNames: PhoneCountryListClassNames;
  flags: PhoneCountryFlagOptions | undefined;
  hasPreferred: boolean;
  listProps?: Omit<Combobox.List.Props, 'children'> | undefined;
  listRef: RefObject<HTMLDivElement | null>;
  messages: PhoneCountrySelectorMessages;
  searchRef: RefObject<HTMLInputElement | null>;
  /** Rendered after the search field inside the search row. */
  searchRowEnd?: ReactNode;
}

/** Search field, empty state and grouped list inside any Combobox.Root. */
export function CountryListBody({
  classNames,
  flags,
  hasPreferred,
  listProps,
  listRef,
  messages,
  searchRef,
  searchRowEnd,
}: CountryListBodyProps): ReactNode {
  useEffect(() => {
    // Wait one frame so a portaled or animating container has layout.
    const frame = window.requestAnimationFrame(() => {
      if (listRef.current) {
        scrollSelectedRowIntoView(listRef.current);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [listRef]);
  return (
    <>
      <div data-slot="phone-country-search-row">
        <Combobox.Input
          aria-label={messages.searchLabel}
          autoComplete="off"
          className={classNames.search}
          data-slot="phone-country-search"
          placeholder={messages.searchLabel}
          ref={searchRef}
          type="search"
        />
        {searchRowEnd}
      </div>
      <Combobox.Empty className={classNames.empty} data-slot="phone-country-empty">
        {messages.noOptions}
      </Combobox.Empty>
      <Combobox.List
        {...listProps}
        // A focused list (touch path) needs its own name.
        aria-label={listProps?.['aria-label'] ?? messages.dialogTitle}
        className={listProps?.className ?? classNames.list}
        data-slot="phone-country-list"
        ref={listRef}
      >
        {(group: CountryOptionGroup) => (
          <Combobox.Group
            className={classNames.group}
            data-slot="phone-country-group"
            items={group.items}
            key={group.key}
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
            <Combobox.Collection>
              {(option: PhoneCountryOption) => (
                <Combobox.Item
                  className={classNames.option}
                  data-preferred={option.preferred || undefined}
                  data-slot="phone-country-option"
                  key={option.country}
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
              )}
            </Combobox.Collection>
          </Combobox.Group>
        )}
      </Combobox.List>
    </>
  );
}

export interface PhoneCountryTriggerProps
  extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Class of the trigger flag. */
  flagClassName?: string;
  flags?: PhoneCountryFlagOptions;
  locale?: string;
  messages?: Partial<PhoneCountrySelectorMessages>;
  phone: UsePhoneInputReturn;
  resolveCountryName?: PhoneCountryNameResolver;
  triggerContent?: PhoneCountryTriggerContent;
}

/**
 * The country button alone. The host wires opening through `onClick`,
 * `aria-expanded` and `aria-haspopup` (directly or via a Dialog/Drawer trigger).
 * A supplied `aria-label` becomes the prefix of the accessible name; the
 * selected country and calling code are always appended.
 */
interface CountryTriggerViewParameters {
  flagClassName?: string | undefined;
  flags?: PhoneCountryFlagOptions | undefined;
  hostLabel?: string | undefined;
  locale?: string | undefined;
  messages: PhoneCountrySelectorMessages;
  phone: UsePhoneInputReturn;
  resolveCountryName?: PhoneCountryNameResolver | undefined;
  triggerContent: PhoneCountryTriggerContent;
}

interface CountryTriggerView {
  children: ReactNode;
  label: string;
}

/** Accessible name and drawn content shared by every country trigger. */
export function useCountryTriggerView({
  flagClassName,
  flags,
  hostLabel,
  locale,
  messages,
  phone,
  resolveCountryName,
  triggerContent,
}: CountryTriggerViewParameters): CountryTriggerView {
  const selected = useSelectedCountryOption(
    phone,
    locale ?? phone.state.locale,
    resolveCountryName,
  );
  const displayMode = phone.state.displayMode;
  let content: ReactNode;
  if (typeof triggerContent === 'function') {
    content = triggerContent(createPhoneCountryTriggerState(selected, displayMode));
  } else if (selected) {
    const parts = resolvePhoneCountryTriggerParts(triggerContent, displayMode);
    content = (
      <>
        <PhoneCountryFlag
          {...flags}
          className={flagClassName}
          country={selected.country}
          data-slot="phone-country-flag"
          mode={flags?.mode ?? 'none'}
          placement="trigger"
        />
        {parts.countryCode ? <span>{selected.country}</span> : null}
        {/* International modes already start the input with the calling code. */}
        {parts.callingCode ? (
          <span data-slot="phone-country-trigger-calling-code" dir="ltr">
            +{selected.callingCode}
          </span>
        ) : null}
      </>
    );
  } else {
    content = <span aria-hidden="true">+</span>;
  }
  return {
    children: (
      <>
        {content}
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </>
    ),
    label: formatPhoneCountryTriggerLabel(messages, selected, hostLabel),
  };
}

export function PhoneCountryTrigger({
  'aria-label': hostLabel,
  disabled,
  flagClassName,
  flags,
  locale,
  messages: suppliedMessages,
  phone,
  resolveCountryName,
  triggerContent = 'auto',
  type = 'button',
  ...buttonProps
}: PhoneCountryTriggerProps): ReactNode {
  const view = useCountryTriggerView({
    flagClassName,
    flags,
    hostLabel,
    locale,
    messages: resolveCountryMessages(phone, suppliedMessages),
    phone,
    resolveCountryName,
    triggerContent,
  });
  return (
    <button
      data-slot="phone-country-trigger"
      {...buttonProps}
      aria-label={view.label}
      disabled={disabled || phone.state.disabled || phone.state.readOnly}
      type={type}
    >
      {view.children}
    </button>
  );
}

export interface PhoneCountryListProps extends PhoneCountryPartOptions {
  /** Default `true`: focus the search field when the list mounts. */
  autoFocusSearch?: PhoneCountryAutoFocusSearch;
  /** Class of the list's own root (`data-slot="phone-country-panel"`). */
  className?: string;
  classNames?: PhoneCountryListClassNames;
  dir?: 'ltr' | 'rtl';
  listProps?: Omit<Combobox.List.Props, 'children'>;
  /** Called after the selection is applied to `phone`. */
  onSelect?: (country: CountryCode) => void;
  /** Maximum rendered options, with or without a query. Omit to list every country. */
  resultLimit?: number;
}

/**
 * Search field, ranked grouped list and empty state for a host-owned container
 * (dialog, drawer, page). Owns its keyboard model and never closes anything:
 * close the container from `onSelect`.
 */
export function PhoneCountryList({
  autoFocusSearch = true,
  className,
  classNames = {},
  dir,
  flags,
  listProps,
  messages: suppliedMessages,
  onSelect,
  phone,
  resultLimit,
  ...modelOptions
}: PhoneCountryListProps): ReactNode {
  const messages = resolveCountryMessages(phone, suppliedMessages);
  const model = useCountryComboboxModel({
    ...modelOptions,
    phone,
    resultLimit,
  });
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [activeDescendant, setActiveDescendant] = useState<string | undefined>();
  const [highlighted, setHighlighted] = useState<string | undefined>();
  useEffect(() => {
    // After the host container's own initial focus, so this choice wins.
    const frame = window.requestAnimationFrame(() => {
      const target = shouldFocusCountrySearch(autoFocusSearch)
        ? searchRef.current
        : listRef.current;
      target?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocusSearch]);
  // Every render: a new query remounts rows in another group with new ids.
  useLayoutEffect(() => {
    // Base UI points aria-activedescendant from the search field only; mirror it
    // on the list so a focused list still announces the highlighted row.
    const id =
      highlighted === undefined
        ? undefined
        : listRef.current?.querySelector<HTMLElement>(
            '[role="option"][data-highlighted]',
          )?.id;
    // React skips the update when the id is unchanged.
    setActiveDescendant(id || undefined);
  });
  const handleListKeyDown: NonNullable<Combobox.List.Props['onKeyDown']> = (event) => {
    listProps?.onKeyDown?.(event);
    // Type-to-search: printable keys pressed on the focused list go to the search field.
    if (
      event.target === listRef.current &&
      // 'Process' is an IME keystroke; let the search field receive it too.
      (event.key.length === 1 || event.key === 'Process') &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      searchRef.current?.focus({ preventScroll: true });
    }
  };
  const content = (
    <div className={className} data-slot="phone-country-panel" dir={dir}>
      <Combobox.Root<PhoneCountryOption>
        {...model.rootProps}
        inline
        onItemHighlighted={(item) => setHighlighted(item?.country)}
        onValueChange={(option) => {
          if (!option || model.disabled) return;
          phone.actions.selectCountry(option.country);
          onSelect?.(option.country);
        }}
        open
      >
        <CountryListBody
          classNames={classNames}
          flags={flags}
          hasPreferred={model.hasPreferred}
          listProps={{
            ...listProps,
            'aria-activedescendant': activeDescendant,
            onKeyDown: handleListKeyDown,
          }}
          listRef={listRef}
          messages={messages}
          searchRef={searchRef}
        />
      </Combobox.Root>
    </div>
  );
  return withDirection(dir, content);
}
