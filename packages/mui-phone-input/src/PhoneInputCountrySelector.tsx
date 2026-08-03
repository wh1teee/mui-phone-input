'use client';

import ButtonBase from '@mui/material/ButtonBase';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Popper, { type PopperProps } from '@mui/material/Popper';
import { type Breakpoint, styled, useTheme } from '@mui/material/styles';
import useAutocomplete from '@mui/material/useAutocomplete';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { CountryCode } from 'libphonenumber-js/max';
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createPhoneCountryOptions,
  filterPhoneCountryOptions,
  type PhoneCountryNameResolver,
  type PhoneCountryOption,
} from './country-selector';
import type { MuiPhoneInputOwnerState } from './MuiPhoneInput/MuiPhoneInput';
import type { MuiPhoneInputClasses } from './MuiPhoneInput/muiPhoneInputClasses';
import { muiPhoneInputClasses } from './MuiPhoneInput/muiPhoneInputClasses';
import { usePhoneInputContext } from './PhoneInputPrimitives';
import type { PhoneInputDataAttributes } from './usePhoneInput';

export type PhoneCountrySelectorMode = 'auto' | 'desktop' | 'mobile';

export type PhoneCountrySelectorClasses = Pick<
  MuiPhoneInputClasses,
  | 'countrySelector'
  | 'countrySelectorEmpty'
  | 'countrySelectorGroup'
  | 'countrySelectorGroupLabel'
  | 'countrySelectorListbox'
  | 'countrySelectorOption'
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

export type PhoneInputCountrySelectorProps = Omit<
  ComponentPropsWithoutRef<'button'>,
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
    mobileBreakpoint?: Breakpoint;
    mode?: PhoneCountrySelectorMode;
    portalContainer?: PopperProps['container'];
    preferredCountries?: readonly CountryCode[];
    resolveCountryName?: PhoneCountryNameResolver;
    resultLimit?: number;
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
})<{ ownerState: MuiPhoneInputOwnerState }>(({ theme }) => ({
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
})<{ ownerState: MuiPhoneInputOwnerState }>(({ theme }) => ({
  maxWidth: 'min(360px, calc(100vw - 32px))',
  minWidth: 280,
  padding: theme.spacing(1),
}));

const CountrySelectorSearchInput = styled('input', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorSearchInput,
  slot: 'CountrySelectorSearchInput',
})<{ ownerState: MuiPhoneInputOwnerState }>(({ theme }) => ({
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
})<{ ownerState: MuiPhoneInputOwnerState }>(({ theme }) => ({
  listStyle: 'none',
  margin: 0,
  maxHeight: 320,
  overflowY: 'auto',
  padding: 0,
  position: 'relative',
  scrollbarGutter: 'stable',
  [`& .${muiPhoneInputClasses.countrySelectorGroup}`]: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  [`& .${muiPhoneInputClasses.countrySelectorGroupLabel}`]: {
    color: theme.palette.text.secondary,
    fontSize: theme.typography.pxToRem(12),
    fontWeight: theme.typography.fontWeightMedium,
    padding: theme.spacing(1, 1, 0.5),
  },
}));

const CountrySelectorOption = styled('li', {
  name: 'MuiPhoneInput',
  overridesResolver: (_props, styles) => styles.countrySelectorOption,
  slot: 'CountrySelectorOption',
})<{ ownerState: MuiPhoneInputOwnerState }>(({ theme }) => ({
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

const CountrySelectorGroupOptions = styled('ul')({
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
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

export function PhoneInputCountrySelector({
  className,
  classes: classesProp,
  countryFilter,
  countryOrder,
  disablePortal = false,
  locale = 'en',
  messages: messagesProp,
  mobileBreakpoint = 'sm',
  mode = 'auto',
  portalContainer,
  preferredCountries,
  resolveCountryName,
  resultLimit = 50,
  ...triggerProps
}: PhoneInputCountrySelectorProps): ReactNode {
  const phone = usePhoneInputContext();
  const theme = useTheme();
  const matchesMobile = useMediaQuery(theme.breakpoints.down(mobileBreakpoint));
  const mobile = mode === 'mobile' || (mode === 'auto' && matchesMobile);
  const presentation = mobile ? 'mobile' : 'desktop';
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
        ...(countryFilter === undefined ? {} : { countryFilter }),
        ...(countryOrder === undefined ? {} : { countryOrder }),
        ...(preferredCountries === undefined ? {} : { preferredCountries }),
        ...(resolveCountryName === undefined ? {} : { resolveCountryName }),
      }),
    [countryFilter, countryOrder, locale, preferredCountries, resolveCountryName],
  );
  const displayCountry =
    phone.state.selectedCountry ?? phone.state.numberingPlan.resolvedCountry;
  const selectedOption = useMemo(
    () => options.find((option) => option.country === displayCountry) ?? null,
    [displayCountry, options],
  );
  const ownerState = useMemo<MuiPhoneInputOwnerState>(
    () => ({
      controlled: phone.state.controlled,
      countryControlled: phone.state.countryControlled,
      disabled: phone.state.disabled,
      empty: phone.state.empty,
      error: phone.state.error,
      numberingPlanKind: phone.state.numberingPlan.kind,
      readOnly: phone.state.readOnly,
      required: phone.state.required,
      selectedCountry: phone.state.selectedCountry,
      validationStatus: phone.state.validation.status,
    }),
    [phone.state],
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useCallback(() => {
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const resolveFocusTargetFromTrigger = useCallback((direction: -1 | 1) => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return undefined;
    }

    const tabbable = Array.from(
      document.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR),
    ).filter(
      (element) =>
        !element.closest('[hidden], [aria-hidden="true"], [inert]') &&
        !element.closest(COUNTRY_SELECTOR_SURFACE_SELECTOR) &&
        element.tabIndex >= 0 &&
        !element.hidden,
    );
    const triggerIndex = tabbable.indexOf(trigger);
    return triggerIndex < 0 ? undefined : tabbable[triggerIndex + direction];
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
  const moveFocusFromTrigger = useCallback(
    (direction: -1 | 1): boolean => {
      const hasExternalTarget = resolveFocusTargetFromTrigger(direction) !== undefined;
      closeSelector(false);
      if (!hasExternalTarget) {
        return false;
      }

      window.requestAnimationFrame(() => {
        resolveFocusTargetFromTrigger(direction)?.focus();
      });
      return true;
    },
    [closeSelector, resolveFocusTargetFromTrigger],
  );
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
    value: selectedOption,
  });
  const listboxProps = autocomplete.getListboxProps();
  const listboxId = listboxProps.id ?? `${autocomplete.id}-listbox`;
  const dialogId = `${autocomplete.id}-dialog`;
  const dialogTitleId = `${autocomplete.id}-dialog-title`;
  const { ref: autocompleteInputRef, ...inputProps } = autocomplete.getInputProps();
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
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
  const triggerLabel = selectedOption
    ? `${messages.selectCountry}. ${optionLabel(selectedOption)}`
    : messages.selectCountry;

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (
        searchInputRef.current?.dataset.countrySelectorPresentation === presentation
      ) {
        searchInputRef.current.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, presentation]);

  const listbox = (
    <>
      {autocomplete.groupedOptions.length > 0 ? (
        <CountrySelectorListbox
          {...listboxProps}
          className={classes.countrySelectorListbox}
          ownerState={ownerState}
        >
          {autocomplete.groupedOptions.map((group) => (
            <li
              className={classes.countrySelectorGroup}
              key={group.key}
              role="presentation"
            >
              <div
                className={classes.countrySelectorGroupLabel}
                id={`${autocomplete.id}-group-${group.key}`}
              >
                {group.group}
              </div>
              <CountrySelectorGroupOptions
                aria-labelledby={`${autocomplete.id}-group-${group.key}`}
                role="group"
              >
                {group.options.map((option, optionIndex) => {
                  const optionProps = autocomplete.getOptionProps({
                    index: group.index + optionIndex,
                    option,
                  });
                  const { key, ...optionPropsWithoutKey } = optionProps;

                  return (
                    <CountrySelectorOption
                      {...optionPropsWithoutKey}
                      aria-label={optionLabel(option)}
                      className={joinClassNames(
                        classes.countrySelectorOption,
                        optionPropsWithoutKey.className,
                      )}
                      data-country={option.country}
                      key={key}
                      ownerState={ownerState}
                    >
                      <span>{option.localizedName}</span>
                      <span aria-hidden="true">{option.country}</span>
                      <span aria-hidden="true">+{option.callingCode}</span>
                    </CountrySelectorOption>
                  );
                })}
              </CountrySelectorGroupOptions>
            </li>
          ))}
        </CountrySelectorListbox>
      ) : (
        <div aria-live="polite" className={classes.countrySelectorEmpty}>
          {messages.noOptions}
        </div>
      )}
    </>
  );

  const search = (
    <div {...autocomplete.getRootProps()} ref={autocomplete.setAnchorEl}>
      <CountrySelectorSearchInput
        {...inputProps}
        aria-label={messages.searchLabel}
        className={classes.countrySelectorSearchInput}
        data-country-selector-presentation={presentation}
        onKeyDown={(event) => {
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
          if (
            !mobile &&
            !event.defaultPrevented &&
            event.key === 'Tab' &&
            moveFocusFromTrigger(event.shiftKey ? -1 : 1)
          ) {
            event.preventDefault();
          }
        }}
        ownerState={ownerState}
        placeholder={messages.searchLabel}
        ref={setSearchInputRef}
      />
    </div>
  );

  return (
    <>
      <CountrySelectorTrigger
        {...triggerProps}
        aria-controls={open ? (mobile ? dialogId : listboxId) : undefined}
        aria-expanded={open}
        aria-haspopup={mobile ? 'dialog' : 'listbox'}
        aria-label={triggerProps['aria-label'] ?? triggerLabel}
        className={joinClassNames(classes.countrySelector, className)}
        disabled={phone.state.disabled || phone.state.readOnly}
        onClick={(event) => {
          triggerProps.onClick?.(event);
          if (!event.defaultPrevented) {
            setOpen((current) => !current);
          }
        }}
        ref={triggerRef}
        ownerState={ownerState}
        type="button"
      >
        <span>{selectedOption?.country ?? '—'}</span>
        <span aria-hidden="true">
          {selectedOption ? `+${selectedOption.callingCode}` : '▾'}
        </span>
      </CountrySelectorTrigger>

      <input aria-hidden="true" hidden ref={setHiddenInputRef} tabIndex={-1} />

      {mobile ? (
        <Dialog
          aria-labelledby={dialogTitleId}
          container={portalContainer}
          disablePortal={disablePortal}
          disableRestoreFocus
          fullScreen
          onClose={() => closeSelector()}
          open={open}
          slotProps={{ paper: { id: dialogId } }}
        >
          <DialogTitle id={dialogTitleId}>
            {messages.dialogTitle}
            <ButtonBase
              aria-label={messages.close}
              onClick={() => closeSelector()}
              onKeyDown={(event) => {
                if (event.key === 'Tab' && searchInputRef.current) {
                  event.preventDefault();
                  searchInputRef.current.focus();
                }
              }}
              ref={closeButtonRef}
              sx={{ float: 'inline-end', minHeight: 32, minWidth: 32 }}
              type="button"
            >
              ×
            </ButtonBase>
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
            <CountrySelectorPaper
              className={classes.countrySelectorPopup}
              data-phone-input-country-selector-surface="true"
              elevation={8}
              ownerState={ownerState}
            >
              {search}
              {listbox}
            </CountrySelectorPaper>
          </ClickAwayListener>
        </Popper>
      )}
    </>
  );
}
