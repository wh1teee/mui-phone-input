'use client';

import ButtonBase from '@mui/material/ButtonBase';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Popper, { type PopperProps } from '@mui/material/Popper';
import { type Breakpoint, styled, useTheme } from '@mui/material/styles';
import useAutocomplete, {
  type AutocompleteHighlightChangeReason,
} from '@mui/material/useAutocomplete';
import useMediaQuery from '@mui/material/useMediaQuery';
import { mergeSlotProps, type SlotProps, useForkRef } from '@mui/material/utils';
import type { CountryCode } from 'libphonenumber-js/max';
import {
  type ComponentPropsWithRef,
  type ElementType,
  type Key,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { tabbable } from 'tabbable';

import {
  createPhoneCountryOptions,
  filterPhoneCountryOptions,
  type PhoneCountryNameResolver,
  type PhoneCountryOption,
} from './country-selector';
import type { MuiPhoneInputOwnerState } from './MuiPhoneInput/MuiPhoneInput';
import type { MuiPhoneInputClasses } from './MuiPhoneInput/muiPhoneInputClasses';
import { muiPhoneInputClasses } from './MuiPhoneInput/muiPhoneInputClasses';
import type { PhoneMetadata } from './phone-metadata';
import { usePhoneInputContext } from './PhoneInputPrimitives';
import type { PhoneInputDataAttributes } from './usePhoneInput';

const presentationHighlightRestoreMarker = Symbol(
  'PhoneInputCountrySelector.presentationHighlightRestore',
);

type PresentationHighlightRestoreMouseEvent = globalThis.MouseEvent & {
  [presentationHighlightRestoreMarker]?: true;
};

export type PhoneCountrySelectorMode = 'auto' | 'desktop' | 'mobile';

export type PhoneCountrySelectorClasses = Pick<
  MuiPhoneInputClasses,
  | 'countrySelector'
  | 'countrySelectorCallingCode'
  | 'countrySelectorCloseButton'
  | 'countrySelectorCountryCode'
  | 'countrySelectorEmpty'
  | 'countrySelectorGroup'
  | 'countrySelectorGroupLabel'
  | 'countrySelectorListbox'
  | 'countrySelectorOption'
  | 'countrySelectorOptionLabel'
  | 'countrySelectorPopup'
  | 'countrySelectorSearchInput'
>;

export interface PhoneCountrySelectorMessages {
  allCountries: string;
  close: string;
  dialogTitle: string;
  noOptions: string;
  preferredCountries: string;
  searchLabel: string;
  selectCountry: string;
}

export type PhoneCountrySelectorPresentation = 'desktop' | 'mobile';

export interface PhoneCountrySelectorOwnerState extends MuiPhoneInputOwnerState {
  open: boolean;
  presentation: PhoneCountrySelectorPresentation;
  query: string;
}

export interface PhoneCountrySelectorGroupOwnerState
  extends PhoneCountrySelectorOwnerState {
  groupLabel: string;
  preferred: boolean;
}

export interface PhoneCountrySelectorOptionOwnerState
  extends PhoneCountrySelectorOwnerState {
  option: Readonly<PhoneCountryOption>;
  selected: boolean;
}

export interface PhoneCountrySelectorIndicatorOwnerState
  extends PhoneCountrySelectorOwnerState {
  option: Readonly<PhoneCountryOption> | null;
  placement: 'option' | 'trigger';
}

export interface PhoneCountrySelectorSlots {
  callingCode?: ElementType;
  closeButton?: ElementType;
  countryCode?: ElementType;
  empty?: ElementType;
  group?: ElementType;
  groupLabel?: ElementType;
  listbox?: ElementType;
  option?: ElementType;
  optionLabel?: ElementType;
  popup?: ElementType;
  searchInput?: ElementType;
  trigger?: ElementType;
}

type PhoneCountrySelectorDataAttributes = {
  [key: `data-${string}`]: boolean | number | string | undefined;
};

type MuiKeyboardEvent<T extends HTMLElement> = KeyboardEvent<T> & {
  defaultMuiPrevented?: boolean;
};

export interface PhoneCountrySelectorSlotProps {
  callingCode?: SlotProps<
    'span',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorIndicatorOwnerState
  >;
  closeButton?: SlotProps<
    typeof ButtonBase,
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorOwnerState
  >;
  countryCode?: SlotProps<
    'span',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorIndicatorOwnerState
  >;
  empty?: SlotProps<
    'div',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorOwnerState
  >;
  group?: SlotProps<
    'li',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorGroupOwnerState
  >;
  groupLabel?: SlotProps<
    'div',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorGroupOwnerState
  >;
  listbox?: SlotProps<
    'ul',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorOwnerState
  >;
  option?: SlotProps<
    'li',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorOptionOwnerState
  >;
  optionLabel?: SlotProps<
    'span',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorOptionOwnerState
  >;
  popup?: SlotProps<
    typeof Paper,
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorOwnerState
  >;
  searchInput?: SlotProps<
    'input',
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorOwnerState
  >;
  trigger?: SlotProps<
    typeof ButtonBase,
    PhoneCountrySelectorDataAttributes,
    PhoneCountrySelectorOwnerState
  >;
}

export type PhoneInputCountrySelectorProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'onChange'
> &
  PhoneInputDataAttributes & {
    classes?: Partial<PhoneCountrySelectorClasses>;
    countryFilter?: (country: CountryCode) => boolean;
    countryOrder?: (
      left: Readonly<PhoneCountryOption>,
      right: Readonly<PhoneCountryOption>,
    ) => number;
    disablePortal?: boolean;
    locale?: string;
    messages?: Partial<PhoneCountrySelectorMessages>;
    metadata?: PhoneMetadata;
    mobileBreakpoint?: Breakpoint;
    mode?: PhoneCountrySelectorMode;
    portalContainer?: PopperProps['container'];
    preferredCountries?: readonly CountryCode[];
    resolveCountryName?: PhoneCountryNameResolver;
    resultLimit?: number;
    slotProps?: PhoneCountrySelectorSlotProps;
    slots?: PhoneCountrySelectorSlots;
  };

const DEFAULT_MESSAGES: PhoneCountrySelectorMessages = {
  allCountries: 'All countries',
  close: 'Close country selector',
  dialogTitle: 'Select country',
  noOptions: 'No matching countries',
  preferredCountries: 'Preferred countries',
  searchLabel: 'Search countries',
  selectCountry: 'Select country',
};

const CountrySelectorTrigger = styled(ButtonBase, {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelector,
  slot: 'CountrySelector',
})<{ ownerState: PhoneCountrySelectorOwnerState }>(({ theme }) => ({
  alignItems: 'center',
  borderRadius: theme.shape.borderRadius,
  display: 'inline-flex',
  font: 'inherit',
  gap: theme.spacing(0.5),
  minHeight: 32,
  minWidth: 54,
  paddingInline: theme.spacing(0.75),
  whiteSpace: 'nowrap',
}));

const CountrySelectorPaper = styled(Paper, {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorPopup,
  slot: 'CountrySelectorPopup',
})<{ ownerState: PhoneCountrySelectorOwnerState }>(({ theme }) => ({
  maxWidth: 'min(360px, calc(100vw - 32px))',
  minWidth: 280,
  padding: theme.spacing(1),
}));

const CountrySelectorCloseButton = styled(ButtonBase, {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorCloseButton,
  slot: 'CountrySelectorCloseButton',
})<{ ownerState: PhoneCountrySelectorOwnerState }>({
  float: 'inline-end',
  minHeight: 32,
  minWidth: 32,
});

const CountrySelectorSearchInput = styled('input', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorSearchInput,
  slot: 'CountrySelectorSearchInput',
})<{ ownerState: PhoneCountrySelectorOwnerState }>(({ theme }) => ({
  background: 'transparent',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  color: 'inherit',
  font: 'inherit',
  inlineSize: '100%',
  marginBlockEnd: theme.spacing(1),
  minHeight: 40,
  paddingInline: theme.spacing(1.5),
}));

const CountrySelectorListbox = styled('ul', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorListbox,
  slot: 'CountrySelectorListbox',
})<{ ownerState: PhoneCountrySelectorOwnerState }>(({ theme }) => ({
  listStyle: 'none',
  margin: 0,
  maxHeight: 320,
  overflowY: 'auto',
  padding: 0,
  position: 'relative',
  scrollbarGutter: 'stable',
}));

const CountrySelectorGroup = styled('li', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorGroup,
  slot: 'CountrySelectorGroup',
})<{ ownerState: PhoneCountrySelectorGroupOwnerState }>({
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const CountrySelectorGroupLabel = styled('div', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorGroupLabel,
  slot: 'CountrySelectorGroupLabel',
})<{ ownerState: PhoneCountrySelectorGroupOwnerState }>(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: theme.typography.pxToRem(12),
  fontWeight: theme.typography.fontWeightMedium,
  padding: theme.spacing(1, 1, 0.5),
}));

const CountrySelectorOption = styled('li', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorOption,
  slot: 'CountrySelectorOption',
})<{ ownerState: PhoneCountrySelectorOptionOwnerState }>(({ theme }) => ({
  alignItems: 'center',
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  display: 'grid',
  gap: theme.spacing(1),
  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
  minHeight: 40,
  padding: theme.spacing(0.75, 1),
  '&.Mui-focused': {
    backgroundColor: theme.palette.action.focus,
  },
  '&[aria-selected="true"]': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const CountrySelectorOptionLabel = styled('span', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorOptionLabel,
  slot: 'CountrySelectorOptionLabel',
})<{ ownerState: PhoneCountrySelectorOptionOwnerState }>({});

const CountrySelectorCountryCode = styled('span', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorCountryCode,
  slot: 'CountrySelectorCountryCode',
})<{ ownerState: PhoneCountrySelectorIndicatorOwnerState }>({});

const CountrySelectorCallingCode = styled('span', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorCallingCode,
  slot: 'CountrySelectorCallingCode',
})<{ ownerState: PhoneCountrySelectorIndicatorOwnerState }>({});

const CountrySelectorEmpty = styled('div', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorEmpty,
  slot: 'CountrySelectorEmpty',
})<{ ownerState: PhoneCountrySelectorOwnerState }>({});

const CountrySelectorGroupOptions = styled('ul')({
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const COUNTRY_SELECTOR_SURFACE_SELECTOR =
  '[data-phone-input-country-selector-surface="true"]';

function joinClassNames(...values: Array<string | undefined>): string | undefined {
  const joined = [...new Set(values.flatMap((value) => value?.split(/\s+/u) ?? []))]
    .filter(Boolean)
    .join(' ');
  return joined || undefined;
}

function optionLabel(option: Readonly<PhoneCountryOption>): string {
  return `${option.localizedName}, ${option.country}, +${option.callingCode}`;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

function isInsideCountrySelectorSurface(element: Element): boolean {
  let current: Element | null = element;

  while (current) {
    if (current.matches(COUNTRY_SELECTOR_SURFACE_SELECTOR)) {
      return true;
    }

    const root = current.getRootNode();
    current = current.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }

  return false;
}

function resolveInlineDialogContainer(anchor: HTMLElement | null): HTMLElement | null {
  const phoneInputRoot = anchor?.closest(`.${muiPhoneInputClasses.root}`);
  return phoneInputRoot?.parentElement ?? anchor?.parentElement ?? null;
}

function resolveSlotProps<TOwnerState, TProps extends object>(
  slotProps: TProps | ((ownerState: TOwnerState) => TProps) | undefined,
  ownerState: TOwnerState,
): TProps | undefined {
  return typeof slotProps === 'function' ? slotProps(ownerState) : slotProps;
}

function appendOwnerState<TProps extends object, TOwnerState extends object>(
  Slot: ElementType,
  props: TProps,
  ownerState: TOwnerState,
): TProps & { ownerState?: TOwnerState } {
  return typeof Slot === 'string' ? props : { ...props, ownerState };
}

export function PhoneInputCountrySelector({
  className,
  classes: classesProp,
  countryFilter,
  countryOrder,
  disablePortal = false,
  locale = 'en',
  messages: messagesProp,
  metadata,
  mobileBreakpoint = 'sm',
  mode = 'auto',
  portalContainer,
  preferredCountries,
  ref: triggerExternalRef,
  resolveCountryName,
  resultLimit = 50,
  slotProps,
  slots,
  ...triggerProps
}: PhoneInputCountrySelectorProps): ReactNode {
  const phone = usePhoneInputContext();
  const resolvedMetadata = metadata ?? phone.state.metadata;
  const theme = useTheme();
  const matchesMobile = useMediaQuery(theme.breakpoints.down(mobileBreakpoint));
  const mobile = mode === 'mobile' || (mode === 'auto' && matchesMobile);
  const presentation: PhoneCountrySelectorPresentation = mobile ? 'mobile' : 'desktop';
  const CallingCodeSlot = slots?.callingCode ?? CountrySelectorCallingCode;
  const CloseButtonSlot = slots?.closeButton ?? CountrySelectorCloseButton;
  const CountryCodeSlot = slots?.countryCode ?? CountrySelectorCountryCode;
  const EmptySlot = slots?.empty ?? CountrySelectorEmpty;
  const GroupSlot = slots?.group ?? CountrySelectorGroup;
  const GroupLabelSlot = slots?.groupLabel ?? CountrySelectorGroupLabel;
  const ListboxSlot = slots?.listbox ?? CountrySelectorListbox;
  const OptionSlot = slots?.option ?? CountrySelectorOption;
  const OptionLabelSlot = slots?.optionLabel ?? CountrySelectorOptionLabel;
  const PopupSlot = slots?.popup ?? CountrySelectorPaper;
  const SearchInputSlot = slots?.searchInput ?? CountrySelectorSearchInput;
  const TriggerSlot = slots?.trigger ?? CountrySelectorTrigger;
  const messages = useMemo(
    () => ({ ...DEFAULT_MESSAGES, ...messagesProp }),
    [messagesProp],
  );
  const classes = useMemo<PhoneCountrySelectorClasses>(
    () => ({
      countrySelector:
        joinClassNames(
          muiPhoneInputClasses.countrySelector,
          classesProp?.countrySelector,
        ) ?? '',
      countrySelectorCallingCode:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorCallingCode,
          classesProp?.countrySelectorCallingCode,
        ) ?? '',
      countrySelectorCloseButton:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorCloseButton,
          classesProp?.countrySelectorCloseButton,
        ) ?? '',
      countrySelectorCountryCode:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorCountryCode,
          classesProp?.countrySelectorCountryCode,
        ) ?? '',
      countrySelectorEmpty:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorEmpty,
          classesProp?.countrySelectorEmpty,
        ) ?? '',
      countrySelectorGroup:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorGroup,
          classesProp?.countrySelectorGroup,
        ) ?? '',
      countrySelectorGroupLabel:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorGroupLabel,
          classesProp?.countrySelectorGroupLabel,
        ) ?? '',
      countrySelectorListbox:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorListbox,
          classesProp?.countrySelectorListbox,
        ) ?? '',
      countrySelectorOption:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorOption,
          classesProp?.countrySelectorOption,
        ) ?? '',
      countrySelectorOptionLabel:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorOptionLabel,
          classesProp?.countrySelectorOptionLabel,
        ) ?? '',
      countrySelectorPopup:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorPopup,
          classesProp?.countrySelectorPopup,
        ) ?? '',
      countrySelectorSearchInput:
        joinClassNames(
          muiPhoneInputClasses.countrySelectorSearchInput,
          classesProp?.countrySelectorSearchInput,
        ) ?? '',
    }),
    [classesProp],
  );
  const options = useMemo(
    () =>
      createPhoneCountryOptions({
        locale,
        metadata: resolvedMetadata,
        ...(countryFilter === undefined ? {} : { countryFilter }),
        ...(countryOrder === undefined ? {} : { countryOrder }),
        ...(preferredCountries === undefined ? {} : { preferredCountries }),
        ...(resolveCountryName === undefined ? {} : { resolveCountryName }),
      }),
    [
      countryFilter,
      countryOrder,
      locale,
      resolvedMetadata,
      preferredCountries,
      resolveCountryName,
    ],
  );
  const displayCountry =
    phone.state.selectedCountry ?? phone.state.numberingPlan.resolvedCountry;
  const activeOption = useMemo(
    () =>
      displayCountry
        ? (createPhoneCountryOptions({
            countryFilter: (country) => country === displayCountry,
            locale,
            metadata: resolvedMetadata,
            ...(preferredCountries === undefined ? {} : { preferredCountries }),
            ...(resolveCountryName === undefined ? {} : { resolveCountryName }),
          })[0] ?? null)
        : null,
    [displayCountry, locale, preferredCountries, resolveCountryName, resolvedMetadata],
  );
  const triggerDisabled =
    phone.state.disabled || phone.state.readOnly || triggerProps.disabled === true;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ownerState = useMemo<PhoneCountrySelectorOwnerState>(
    () => ({
      controlled: phone.state.controlled,
      countryControlled: phone.state.countryControlled,
      disabled: triggerDisabled,
      empty: phone.state.empty,
      error: phone.state.error,
      numberingPlanKind: phone.state.numberingPlan.kind,
      open,
      presentation,
      query,
      readOnly: phone.state.readOnly,
      required: phone.state.required,
      selectedCountry: phone.state.selectedCountry,
      validationStatus: phone.state.validation.status,
    }),
    [open, phone.state, presentation, query, triggerDisabled],
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useCallback(() => {
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const resolveFocusTargetFromTrigger = useCallback((direction: -1 | 1) => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return undefined;
    }

    const documentTabOrder = tabbable(document.body, { getShadowRoot: true }).filter(
      (element) => !isInsideCountrySelectorSurface(element),
    );
    const triggerIndex = documentTabOrder.indexOf(trigger);
    return triggerIndex < 0 ? undefined : documentTabOrder[triggerIndex + direction];
  }, []);
  const closeSelector = useCallback(
    (restoreFocus = true) => {
      setOpen(false);
      if (restoreFocus) {
        returnFocus();
      }
    },
    [returnFocus],
  );
  const highlightedOptionRef = useRef<PhoneCountryOption | null>(null);
  const highlightedReasonRef = useRef<AutocompleteHighlightChangeReason | null>(null);
  const restoringPresentationHighlightRef = useRef(false);
  const autocomplete = useAutocomplete<PhoneCountryOption>({
    autoHighlight: true,
    clearOnBlur: false,
    componentName: 'PhoneInputCountrySelector',
    disabled: phone.state.disabled || phone.state.readOnly,
    filterOptions: (_options, state) => [
      ...filterPhoneCountryOptions(options, state.inputValue, {
        limit: resultLimit,
        selectedCountry: displayCountry,
      }),
    ],
    getOptionKey: (option) => option.country,
    getOptionLabel: (option) => optionLabel(option),
    groupBy: (option) =>
      option.preferred ? messages.preferredCountries : messages.allCountries,
    id: `${phone.state.inputId}-country-selector`,
    inputValue: query,
    isOptionEqualToValue: (option, selected) => option.country === selected.country,
    onHighlightChange: (_event, option, reason) => {
      if (restoringPresentationHighlightRef.current) {
        return;
      }
      highlightedOptionRef.current = option;
      highlightedReasonRef.current = reason;
    },
    onChange: (_event, option, reason) => {
      if (reason === 'selectOption' && option) {
        phone.actions.selectCountry(option.country);
        setQuery('');
        closeSelector();
      }
    },
    onClose: (_event, reason) => {
      if (reason !== 'selectOption') {
        if (reason === 'blur' && mobile) {
          return;
        }
        closeSelector(reason !== 'blur');
      }
    },
    onInputChange: (_event, value, reason) => {
      if (reason === 'input' || reason === 'clear') {
        setQuery(value);
      }
    },
    onOpen: () => setOpen(true),
    open,
    openOnFocus: true,
    options,
    value: activeOption,
  });
  const { ref: autocompleteListboxRef, ...listboxProps } =
    autocomplete.getListboxProps() as ComponentPropsWithRef<'ul'>;
  const listboxId = listboxProps.id ?? `${autocomplete.id}-listbox`;
  const dialogId = `${autocomplete.id}-dialog`;
  const dialogTitleId = `${autocomplete.id}-dialog-title`;
  const { ref: autocompleteInputRef, ...inputProps } = autocomplete.getInputProps();
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listboxElementRef = useRef<HTMLUListElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const inlineDialogContainer = useCallback(
    () => resolveInlineDialogContainer(hiddenInputRef.current),
    [],
  );
  const setHiddenInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      hiddenInputRef.current = input;
      if (!searchInputRef.current) {
        assignRef(autocompleteInputRef, input);
      }
    },
    [autocompleteInputRef],
  );
  const setSearchInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      searchInputRef.current = input;
      assignRef(autocompleteInputRef, input ?? hiddenInputRef.current);
    },
    [autocompleteInputRef],
  );
  const triggerLabel = activeOption
    ? `${messages.selectCountry}. ${optionLabel(activeOption)}`
    : messages.selectCountry;
  const previousOpenRef = useRef(open);
  const previousPresentationRef = useRef(presentation);
  const pendingPresentationHighlightRestoreRef = useRef(false);
  const restoreHighlightAfterPresentationChange =
    open && previousOpenRef.current && previousPresentationRef.current !== presentation;

  useEffect(() => {
    if (restoreHighlightAfterPresentationChange) {
      pendingPresentationHighlightRestoreRef.current = true;
    }
    previousOpenRef.current = open;
    previousPresentationRef.current = presentation;
    if (!open) {
      pendingPresentationHighlightRestoreRef.current = false;
      highlightedOptionRef.current = null;
      highlightedReasonRef.current = null;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (
        searchInputRef.current?.dataset.countrySelectorPresentation === presentation
      ) {
        searchInputRef.current.focus();
        if (pendingPresentationHighlightRestoreRef.current) {
          const highlightedOption = highlightedOptionRef.current;
          const highlightedReason = highlightedReasonRef.current;
          const optionElement = highlightedOption
            ? listboxElementRef.current?.querySelector<HTMLElement>(
                `[role="option"][data-country="${highlightedOption.country}"]`,
              )
            : null;

          if (optionElement) {
            // MUI synchronizes the newly attached listbox to the selected value.
            // Replay only its prepared option handler so a presentation-only
            // remount retains the user's highlight without notifying slot consumers.
            const restoreEvent = new globalThis.MouseEvent('mousemove', {
              bubbles: true,
              composed: true,
            }) as PresentationHighlightRestoreMouseEvent;
            Object.defineProperty(restoreEvent, presentationHighlightRestoreMarker, {
              value: true,
            });
            restoringPresentationHighlightRef.current = true;
            try {
              optionElement.dispatchEvent(restoreEvent);
            } finally {
              restoringPresentationHighlightRef.current = false;
            }
            if (highlightedReason === 'keyboard') {
              optionElement.classList.add('Mui-focusVisible');
            }
          }
          pendingPresentationHighlightRestoreRef.current = false;
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, presentation, restoreHighlightAfterPresentationChange]);

  const externalTriggerSlotProps = resolveSlotProps(slotProps?.trigger, ownerState);
  const triggerSlotRef = useForkRef(
    triggerRef,
    triggerExternalRef,
    externalTriggerSlotProps?.ref,
  );
  const triggerSlotProps = appendOwnerState(
    TriggerSlot,
    {
      ...mergeSlotProps(
        externalTriggerSlotProps,
        mergeSlotProps(triggerProps, {
          className: joinClassNames(classes.countrySelector, className),
          disabled: triggerDisabled,
          onClick: (event: MouseEvent<HTMLButtonElement>) => {
            if (!event.defaultPrevented) {
              setOpen((current) => !current);
            }
          },
          type: 'button' as const,
        }),
      ),
      'aria-controls': open ? (mobile ? dialogId : listboxId) : undefined,
      'aria-expanded': open,
      'aria-haspopup': mobile ? ('dialog' as const) : ('listbox' as const),
      'aria-label':
        externalTriggerSlotProps?.['aria-label'] ??
        triggerProps['aria-label'] ??
        triggerLabel,
      disabled: triggerDisabled || externalTriggerSlotProps?.disabled === true,
      ref: triggerSlotRef,
      type: 'button' as const,
    },
    ownerState,
  );

  const externalSearchInputSlotProps = resolveSlotProps(
    slotProps?.searchInput,
    ownerState,
  );
  const searchInputSlotRef = useForkRef(
    setSearchInputRef,
    externalSearchInputSlotProps?.ref,
  );
  const searchInputSlotProps = appendOwnerState(
    SearchInputSlot,
    {
      ...mergeSlotProps(externalSearchInputSlotProps, {
        ...inputProps,
        'aria-label': messages.searchLabel,
        className: classes.countrySelectorSearchInput,
        'data-country-selector-presentation': presentation,
        onKeyDown: (event: MuiKeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter' && event.nativeEvent.isComposing) {
            event.defaultMuiPrevented = true;
            return;
          }
          inputProps.onKeyDown?.(event);
          if (
            mobile &&
            !event.defaultPrevented &&
            event.key === 'Tab' &&
            closeButtonRef.current
          ) {
            event.preventDefault();
            closeButtonRef.current.focus();
            return;
          }
          if (!mobile && !event.defaultPrevented && event.key === 'Tab') {
            const focusTarget = resolveFocusTargetFromTrigger(event.shiftKey ? -1 : 1);
            closeSelector(false);
            if (focusTarget) {
              event.preventDefault();
              window.requestAnimationFrame(() => focusTarget.focus());
            }
          }
        },
        placeholder: messages.searchLabel,
      }),
      'aria-activedescendant': inputProps['aria-activedescendant'],
      'aria-autocomplete': inputProps['aria-autocomplete'],
      'aria-controls': inputProps['aria-controls'],
      'aria-expanded': inputProps['aria-expanded'],
      'aria-label': messages.searchLabel,
      autoComplete: inputProps.autoComplete,
      'data-country-selector-presentation': presentation,
      disabled: inputProps.disabled,
      id: inputProps.id,
      ref: searchInputSlotRef,
      role: inputProps.role,
      value: inputProps.value,
    },
    ownerState,
  );

  const externalListboxSlotProps = resolveSlotProps(slotProps?.listbox, ownerState);
  const listboxSlotRef = useForkRef(
    autocompleteListboxRef,
    listboxElementRef,
    externalListboxSlotProps?.ref,
  );
  const listboxSlotProps = appendOwnerState(
    ListboxSlot,
    {
      ...mergeSlotProps(externalListboxSlotProps, {
        ...listboxProps,
        className: classes.countrySelectorListbox,
      }),
      'aria-labelledby': listboxProps['aria-labelledby'],
      'aria-multiselectable': listboxProps['aria-multiselectable'],
      id: listboxId,
      ref: listboxSlotRef,
      role: listboxProps.role,
    },
    ownerState,
  );

  const externalEmptySlotProps = resolveSlotProps(slotProps?.empty, ownerState);
  const emptySlotProps = appendOwnerState(
    EmptySlot,
    {
      ...mergeSlotProps(externalEmptySlotProps, {
        'aria-live': 'polite' as const,
        className: classes.countrySelectorEmpty,
      }),
      'aria-live': 'polite' as const,
    },
    ownerState,
  );

  const externalPopupSlotProps = resolveSlotProps(slotProps?.popup, ownerState);
  const popupSlotProps = appendOwnerState(
    PopupSlot,
    {
      ...mergeSlotProps(externalPopupSlotProps, {
        className: classes.countrySelectorPopup,
        'data-phone-input-country-selector-surface': 'true',
        ...(PopupSlot === CountrySelectorPaper ? { elevation: 8 } : {}),
      }),
      'data-phone-input-country-selector-surface': 'true',
      ref: externalPopupSlotProps?.ref,
    },
    ownerState,
  );

  const externalCloseButtonSlotProps = resolveSlotProps(
    slotProps?.closeButton,
    ownerState,
  );
  const closeButtonSlotRef = useForkRef(
    closeButtonRef,
    externalCloseButtonSlotProps?.ref,
  );
  const closeButtonSlotProps = appendOwnerState(
    CloseButtonSlot,
    {
      ...mergeSlotProps(externalCloseButtonSlotProps, {
        'aria-label': messages.close,
        className: classes.countrySelectorCloseButton,
        onClick: () => closeSelector(),
        onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
          if (
            !event.defaultPrevented &&
            event.key === 'Tab' &&
            searchInputRef.current
          ) {
            event.preventDefault();
            searchInputRef.current.focus();
          }
        },
        type: 'button' as const,
      }),
      'aria-label': messages.close,
      ref: closeButtonSlotRef,
      type: 'button' as const,
    },
    ownerState,
  );

  const listbox = (
    <>
      {autocomplete.groupedOptions.length > 0 ? (
        <ListboxSlot {...listboxSlotProps}>
          {autocomplete.groupedOptions.map((group) => {
            const groupLabelId = `${autocomplete.id}-group-${group.key}`;
            const groupOwnerState: PhoneCountrySelectorGroupOwnerState = {
              ...ownerState,
              groupLabel: group.group,
              preferred: group.options[0]?.preferred ?? false,
            };
            const externalGroupSlotProps = resolveSlotProps(
              slotProps?.group,
              groupOwnerState,
            );
            const groupSlotProps = appendOwnerState(
              GroupSlot,
              {
                ...mergeSlotProps(externalGroupSlotProps, {
                  className: classes.countrySelectorGroup,
                  role: 'presentation' as const,
                }),
                role: 'presentation' as const,
                ref: externalGroupSlotProps?.ref,
              },
              groupOwnerState,
            );
            const externalGroupLabelSlotProps = resolveSlotProps(
              slotProps?.groupLabel,
              groupOwnerState,
            );
            const groupLabelSlotProps = appendOwnerState(
              GroupLabelSlot,
              {
                ...mergeSlotProps(externalGroupLabelSlotProps, {
                  className: classes.countrySelectorGroupLabel,
                  id: groupLabelId,
                }),
                id: groupLabelId,
                ref: externalGroupLabelSlotProps?.ref,
              },
              groupOwnerState,
            );

            return (
              <GroupSlot {...groupSlotProps} key={group.key}>
                <GroupLabelSlot {...groupLabelSlotProps}>{group.group}</GroupLabelSlot>
                <CountrySelectorGroupOptions
                  aria-labelledby={groupLabelId}
                  role="group"
                >
                  {group.options.map((option, optionIndex) => {
                    const preparedOptionProps = autocomplete.getOptionProps({
                      index: group.index + optionIndex,
                      option,
                    }) as ComponentPropsWithRef<'li'> & {
                      'data-option-index': number;
                      key: Key;
                    };
                    const { key, ...preparedOptionPropsWithoutKey } =
                      preparedOptionProps;
                    const optionOwnerState: PhoneCountrySelectorOptionOwnerState = {
                      ...ownerState,
                      option,
                      selected: option.country === displayCountry,
                    };
                    const externalOptionSlotProps = resolveSlotProps(
                      slotProps?.option,
                      optionOwnerState,
                    );
                    const mergedOptionSlotProps = mergeSlotProps(
                      externalOptionSlotProps,
                      {
                        ...preparedOptionPropsWithoutKey,
                        'aria-label': optionLabel(option),
                        className: joinClassNames(
                          classes.countrySelectorOption,
                          preparedOptionPropsWithoutKey.className,
                        ),
                        'data-country': option.country,
                      },
                    );
                    const mergedOptionMouseMove = mergedOptionSlotProps.onMouseMove;
                    const optionSlotProps = appendOwnerState(
                      OptionSlot,
                      {
                        ...mergedOptionSlotProps,
                        'aria-label': optionLabel(option),
                        'aria-disabled': preparedOptionPropsWithoutKey['aria-disabled'],
                        'aria-selected': preparedOptionPropsWithoutKey['aria-selected'],
                        'data-country': option.country,
                        'data-option-index':
                          preparedOptionPropsWithoutKey['data-option-index'],
                        id: preparedOptionPropsWithoutKey.id,
                        onMouseMove: (event: MouseEvent<HTMLLIElement>) => {
                          const nativeEvent =
                            event.nativeEvent as PresentationHighlightRestoreMouseEvent;
                          if (nativeEvent[presentationHighlightRestoreMarker]) {
                            preparedOptionPropsWithoutKey.onMouseMove?.(event);
                            event.stopPropagation();
                            return;
                          }
                          mergedOptionMouseMove?.(event);
                        },
                        ref: externalOptionSlotProps?.ref,
                        role: preparedOptionPropsWithoutKey.role,
                        tabIndex: preparedOptionPropsWithoutKey.tabIndex,
                      },
                      optionOwnerState,
                    );
                    const externalOptionLabelSlotProps = resolveSlotProps(
                      slotProps?.optionLabel,
                      optionOwnerState,
                    );
                    const optionLabelSlotProps = appendOwnerState(
                      OptionLabelSlot,
                      {
                        ...mergeSlotProps(externalOptionLabelSlotProps, {
                          className: classes.countrySelectorOptionLabel,
                        }),
                        ref: externalOptionLabelSlotProps?.ref,
                      },
                      optionOwnerState,
                    );
                    const indicatorOwnerState: PhoneCountrySelectorIndicatorOwnerState =
                      {
                        ...ownerState,
                        option,
                        placement: 'option',
                      };
                    const externalCountryCodeSlotProps = resolveSlotProps(
                      slotProps?.countryCode,
                      indicatorOwnerState,
                    );
                    const countryCodeSlotProps = appendOwnerState(
                      CountryCodeSlot,
                      {
                        ...mergeSlotProps(externalCountryCodeSlotProps, {
                          'aria-hidden': true,
                          className: classes.countrySelectorCountryCode,
                        }),
                        'aria-hidden': true,
                        ref: externalCountryCodeSlotProps?.ref,
                      },
                      indicatorOwnerState,
                    );
                    const externalCallingCodeSlotProps = resolveSlotProps(
                      slotProps?.callingCode,
                      indicatorOwnerState,
                    );
                    const callingCodeSlotProps = appendOwnerState(
                      CallingCodeSlot,
                      {
                        ...mergeSlotProps(externalCallingCodeSlotProps, {
                          'aria-hidden': true,
                          className: classes.countrySelectorCallingCode,
                        }),
                        'aria-hidden': true,
                        ref: externalCallingCodeSlotProps?.ref,
                      },
                      indicatorOwnerState,
                    );

                    return (
                      <OptionSlot {...optionSlotProps} key={key}>
                        <OptionLabelSlot {...optionLabelSlotProps}>
                          {option.localizedName}
                        </OptionLabelSlot>
                        <CountryCodeSlot {...countryCodeSlotProps}>
                          {option.country}
                        </CountryCodeSlot>
                        <CallingCodeSlot {...callingCodeSlotProps}>
                          +{option.callingCode}
                        </CallingCodeSlot>
                      </OptionSlot>
                    );
                  })}
                </CountrySelectorGroupOptions>
              </GroupSlot>
            );
          })}
        </ListboxSlot>
      ) : (
        <EmptySlot {...emptySlotProps}>{messages.noOptions}</EmptySlot>
      )}
    </>
  );

  const search = (
    <div {...autocomplete.getRootProps()} ref={autocomplete.setAnchorEl}>
      <SearchInputSlot {...searchInputSlotProps} />
    </div>
  );

  const triggerIndicatorOwnerState: PhoneCountrySelectorIndicatorOwnerState = {
    ...ownerState,
    option: activeOption,
    placement: 'trigger',
  };
  const externalTriggerCountryCodeSlotProps = resolveSlotProps(
    slotProps?.countryCode,
    triggerIndicatorOwnerState,
  );
  const triggerCountryCodeSlotProps = appendOwnerState(
    CountryCodeSlot,
    {
      ...mergeSlotProps(externalTriggerCountryCodeSlotProps, {
        'aria-hidden': true,
        className: classes.countrySelectorCountryCode,
      }),
      'aria-hidden': true,
      ref: externalTriggerCountryCodeSlotProps?.ref,
    },
    triggerIndicatorOwnerState,
  );
  const externalTriggerCallingCodeSlotProps = resolveSlotProps(
    slotProps?.callingCode,
    triggerIndicatorOwnerState,
  );
  const triggerCallingCodeSlotProps = appendOwnerState(
    CallingCodeSlot,
    {
      ...mergeSlotProps(externalTriggerCallingCodeSlotProps, {
        'aria-hidden': true,
        className: classes.countrySelectorCallingCode,
      }),
      'aria-hidden': true,
      ref: externalTriggerCallingCodeSlotProps?.ref,
    },
    triggerIndicatorOwnerState,
  );

  return (
    <>
      <TriggerSlot {...triggerSlotProps}>
        <CountryCodeSlot {...triggerCountryCodeSlotProps}>
          {activeOption?.country ?? '—'}
        </CountryCodeSlot>
        <CallingCodeSlot {...triggerCallingCodeSlotProps}>
          {activeOption ? `+${activeOption.callingCode}` : '▾'}
        </CallingCodeSlot>
      </TriggerSlot>

      <input aria-hidden="true" hidden ref={setHiddenInputRef} tabIndex={-1} />

      {mobile ? (
        <Dialog
          aria-labelledby={dialogTitleId}
          // ModalManager isolates only direct children of its container. A bounded
          // portal keeps requested no-portal DOM in the consumer host without hiding it.
          container={disablePortal ? inlineDialogContainer : portalContainer}
          disablePortal={false}
          disableRestoreFocus
          fullScreen
          onClose={() => closeSelector()}
          open={open}
          slotProps={{ paper: { id: dialogId } }}
        >
          <DialogTitle id={dialogTitleId}>
            {messages.dialogTitle}
            <CloseButtonSlot {...closeButtonSlotProps}>×</CloseButtonSlot>
          </DialogTitle>
          <DialogContent>
            {search}
            {listbox}
          </DialogContent>
        </Dialog>
      ) : (
        <Popper
          anchorEl={triggerRef.current}
          container={portalContainer}
          disablePortal={disablePortal}
          open={open}
          placement="bottom-start"
          sx={{ zIndex: (currentTheme) => currentTheme.zIndex.modal + 1 }}
        >
          <ClickAwayListener onClickAway={() => closeSelector(false)}>
            <div data-phone-input-country-selector-surface="true">
              <PopupSlot {...popupSlotProps}>
                {search}
                {listbox}
              </PopupSlot>
            </div>
          </ClickAwayListener>
        </Popper>
      )}
    </>
  );
}
