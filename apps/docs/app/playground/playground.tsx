'use client';

import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  MuiPhoneInput,
  type PhoneCountrySelectorOptionOwnerState,
  type PhoneExtension,
  PhoneInputCountrySelector,
  PhoneInputExtensionInput,
  PhoneInputInput,
  type PhoneInputDisplayMode,
  PhoneInputProvider,
  PhoneInputRoot,
  PhoneInputValidationMessage,
  type PhoneValue,
  type FormatStrategy,
  usePhoneInput,
} from '@wh1teee/mui-phone-input';
import { MuiPhoneInputController } from '@wh1teee/mui-phone-input/react-hook-form';
import { ru } from '@wh1teee/mui-phone-input/locales/ru';
import { type ComponentPropsWithRef, type FormEvent, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { UniversalConfigurator } from './configurator';

const paddedAutomaticStrategy: FormatStrategy = ({ automatic }) => ({
  displayValue: ` ${automatic.displayValue}`,
  logicalCaretPositions: automatic.logicalCaretPositions.map(
    (position) => position + 1,
  ),
});

const rtlTheme = createTheme({ direction: 'rtl' });

function CustomCountryOption({
  ownerState,
  ...props
}: ComponentPropsWithRef<'li'> & {
  ownerState: PhoneCountrySelectorOptionOwnerState;
}) {
  return (
    <li {...props} data-playground-country={ownerState.option.country}>
      {ownerState.option.localizedName} · +{ownerState.option.callingCode}
    </li>
  );
}

function CoreExample() {
  const [value, setValue] = useState<PhoneValue>('+375291234567');
  const [extension, setExtension] = useState<PhoneExtension>('42');
  const [country, setCountry] = useState<string>('BY');
  const [lastStatus, setLastStatus] = useState('possible');
  const [displayMode, setDisplayMode] =
    useState<PhoneInputDisplayMode>('international');
  const [strict, setStrict] = useState(false);

  return (
    <Paper component="section" variant="outlined">
      <Stack className="playground-section-stack" spacing={2}>
        <Typography component="h2" variant="h5">
          Controlled value, country, validation, and formatting
        </Typography>
        <MuiPhoneInput
          label="Canonical phone"
          value={value}
          onChange={(nextValue, details) => {
            setValue(nextValue);
            setLastStatus(`${details.validation.status}:${details.validation.reason}`);
          }}
          onCountryChange={(nextCountry) => setCountry(nextCountry ?? 'none')}
          defaultCountry="BY"
          displayMode={displayMode}
          validationMode={strict ? 'valid' : 'possible'}
          validationDisplay="always"
          slotProps={{
            countrySelector: {
              'data-testid': 'core-country-selector',
              mode: 'desktop',
              preferredCountries: ['BY', 'PL', 'LT', 'US'],
            },
            htmlInput: { 'data-testid': 'core-phone-input' },
          }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Select
            aria-label="Display mode"
            value={displayMode}
            onChange={(event: SelectChangeEvent) =>
              setDisplayMode(event.target.value as PhoneInputDisplayMode)
            }
            size="small"
          >
            <MenuItem value="international">International</MenuItem>
            <MenuItem value="national">National</MenuItem>
            <MenuItem value="international-fixed-calling-code">
              Fixed calling code
            </MenuItem>
          </Select>
          <FormControlLabel
            control={
              <Switch
                checked={strict}
                onChange={(_event, checked) => setStrict(checked)}
              />
            }
            label="Strict validity"
          />
        </Stack>
        <output data-testid="core-phone-value">
          Phone Value: {value ?? 'undefined'}
        </output>
        <output data-testid="core-country-value">Country event: {country}</output>
        <output data-testid="core-validation-value">Validation: {lastStatus}</output>

        <Typography component="h3" variant="h6">
          Separate extension
        </Typography>
        <MuiPhoneInput
          label="Phone with extension"
          value={value}
          onChange={setValue}
          extension={extension}
          onExtensionChange={setExtension}
          extensionLabel="Extension"
          extensionMaxLength={8}
          extensionPresentation="separate"
          slotProps={{
            extension: {
              htmlInput: { 'data-testid': 'separate-extension-input' },
            },
          }}
        />
        <output data-testid="extension-value">
          Extension: {extension ?? 'undefined'}
        </output>
      </Stack>
    </Paper>
  );
}

function PresentationExamples() {
  const initialValue: PhoneValue = '+12025550123';

  return (
    <Paper component="section" variant="outlined">
      <Stack className="playground-section-stack" spacing={2}>
        <Typography component="h2" variant="h5">
          Display Mask, custom Format Strategy, and extension presentation
        </Typography>
        <MuiPhoneInput
          defaultCountry="US"
          defaultValue={initialValue}
          displayMask={{ pattern: '+# (###) ###-####' }}
          label="Display Mask"
          slotProps={{ htmlInput: { 'data-testid': 'masked-phone-input' } }}
        />
        <MuiPhoneInput
          defaultCountry="US"
          defaultValue={initialValue}
          formatStrategy={paddedAutomaticStrategy}
          label="Custom strategy (leading presentation space)"
        />
        <MuiPhoneInput
          defaultCountry="US"
          defaultExtension="42"
          defaultValue={initialValue}
          extensionLabel="Ext"
          extensionPresentation="inline"
          label="Inline extension"
        />
        <MuiPhoneInput
          defaultCountry="US"
          defaultExtension="77"
          defaultValue={initialValue}
          extensionPresentation="custom"
          label="Custom extension presentation"
          renderExtension={({ inputProps }) => (
            <TextField
              label="Desk"
              size="small"
              slotProps={{
                htmlInput: {
                  ...inputProps,
                  'data-testid': 'custom-extension-input',
                },
              }}
            />
          )}
        />
      </Stack>
    </Paper>
  );
}

function SelectorAndFlagsExample() {
  return (
    <Paper component="section" variant="outlined">
      <Stack className="playground-section-stack" spacing={2}>
        <Typography component="h2" variant="h5">
          Localized Country Selector, semantic slots, and flags
        </Typography>
        <MuiPhoneInput
          defaultCountry="BY"
          label="Russian selector with preferred countries"
          locale={ru.locale}
          slotProps={{
            countrySelector: {
              'data-testid': 'localized-country-selector',
              locale: ru.locale,
              messages: ru.messages,
              mode: 'desktop',
              preferredCountries: ['BY', 'PL', 'LT'],
              resultLimit: 50,
              slots: { option: CustomCountryOption },
            },
            htmlInput: { 'data-testid': 'localized-phone-input' },
          }}
        />
        <div className="docs-grid">
          <MuiPhoneInput
            defaultCountry="US"
            label="Local SVG flags"
            slotProps={{ countrySelector: { flagMode: 'local', mode: 'desktop' } }}
          />
          <MuiPhoneInput
            defaultCountry="US"
            label="Emoji flags"
            slotProps={{ countrySelector: { flagMode: 'emoji', mode: 'desktop' } }}
          />
          <MuiPhoneInput
            defaultCountry="US"
            label="No flags"
            slotProps={{ countrySelector: { flagMode: 'none', mode: 'desktop' } }}
          />
          <MuiPhoneInput
            defaultCountry="US"
            label="Custom flag provider"
            slotProps={{
              countrySelector: {
                flagProvider: ({ country }) => <span>[{country}]</span>,
                mode: 'desktop',
              },
            }}
          />
        </div>
      </Stack>
    </Paper>
  );
}

function ResponsiveRtlExample() {
  return (
    <Paper component="section" variant="outlined">
      <Stack className="playground-section-stack" spacing={2}>
        <Typography component="h2" variant="h5">
          Responsive selector and RTL semantics
        </Typography>
        <Typography>
          Resize below the MUI small breakpoint to switch the selector from Popper to
          Dialog. The full production RTL recipe also needs the MUI RTL styling-engine
          cache described in the documentation.
        </Typography>
        <ThemeProvider theme={rtlTheme}>
          <div dir="rtl">
            <MuiPhoneInput
              defaultCountry="IL"
              label="RTL responsive phone"
              slotProps={{
                countrySelector: {
                  'data-testid': 'responsive-country-selector',
                  mode: 'auto',
                },
                htmlInput: { 'data-testid': 'rtl-phone-input' },
              }}
            />
          </div>
        </ThemeProvider>
      </Stack>
    </Paper>
  );
}

function ComposableExample() {
  const phone = usePhoneInput({
    defaultCountry: 'US',
    defaultExtension: '9',
    defaultValue: '+12025550123',
    extensionRequired: true,
    required: true,
  });

  return (
    <Paper component="section" variant="outlined">
      <Stack className="playground-section-stack" spacing={2}>
        <Typography component="h2" variant="h5">
          Composable primitives
        </Typography>
        <PhoneInputProvider value={phone}>
          <PhoneInputRoot data-testid="composable-root">
            <Stack spacing={1}>
              <label htmlFor={phone.state.inputId}>Composable phone surface</label>
              <PhoneInputCountrySelector
                data-testid="composable-selector"
                mode="desktop"
                preferredCountries={['US', 'CA']}
              />
              <PhoneInputInput data-testid="composable-input" />
              <label htmlFor={phone.state.extensionInputId}>Extension</label>
              <PhoneInputExtensionInput data-testid="composable-extension" />
              <PhoneInputValidationMessage data-testid="composable-validation" />
            </Stack>
          </PhoneInputRoot>
        </PhoneInputProvider>
        <output data-testid="composable-state">
          {JSON.stringify({
            extension: phone.state.extension,
            kind: phone.state.numberingPlan.kind,
            resolvedCountry: phone.state.numberingPlan.resolvedCountry,
            value: phone.state.value,
          })}
        </output>
        <Stack direction="row" spacing={1}>
          <Button onClick={phone.actions.focus} type="button">
            Focus
          </Button>
          <Button onClick={phone.actions.clear} type="button">
            Clear
          </Button>
          <Button onClick={phone.actions.reset} type="button">
            Reset
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

type RhfValues = {
  extension: PhoneExtension;
  phone: PhoneValue;
};

function ReactHookFormExample() {
  const {
    control,
    formState: { isDirty, isLoading, touchedFields },
    handleSubmit,
    reset,
  } = useForm<RhfValues>({
    defaultValues: async () =>
      Promise.resolve({
        extension: '42',
        phone: '+12025550123' as PhoneValue,
      }),
    shouldFocusError: true,
  });
  const values = useWatch({ control });
  const [submitState, setSubmitState] = useState('not submitted');

  const submit = handleSubmit(
    () => setSubmitState('accepted'),
    () => setSubmitState('rejected'),
  );

  return (
    <Paper component="section" variant="outlined">
      <Stack className="playground-section-stack" spacing={2}>
        <Typography component="h2" variant="h5">
          React Hook Form: Controller, async defaults, reset, and focus-on-error
        </Typography>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            void submit(event);
          }}
        >
          <Stack spacing={2}>
            <MuiPhoneInputController
              control={control}
              extensionLabel="Extension"
              extensionName="extension"
              extensionPresentation="separate"
              label="RHF phone"
              name="phone"
              rules={{ required: 'Phone is required' }}
              slotProps={{
                extension: {
                  htmlInput: { 'data-testid': 'rhf-extension-input' },
                },
                htmlInput: { 'data-testid': 'rhf-phone-input' },
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button type="submit" variant="contained">
                Validate form
              </Button>
              <Button
                type="button"
                onClick={() => {
                  reset({ extension: undefined, phone: undefined });
                  setSubmitState('reset empty');
                }}
              >
                Reset empty
              </Button>
              <Button
                type="button"
                onClick={() => {
                  reset({ extension: '42', phone: '+12025550123' });
                  setSubmitState('reset defaults');
                }}
              >
                Reset defaults
              </Button>
            </Stack>
          </Stack>
        </form>
        <output data-testid="rhf-values">{JSON.stringify(values)}</output>
        <output data-testid="rhf-form-state">
          {JSON.stringify({
            dirty: isDirty,
            loading: isLoading,
            touched: Object.keys(touchedFields).sort(),
          })}
        </output>
        <output data-testid="rhf-submit-state">{submitState}</output>
      </Stack>
    </Paper>
  );
}

export function Playground() {
  return (
    <Stack className="playground-root" spacing={3}>
      <UniversalConfigurator />
      <div className="playground-reference-divider">
        <p className="docs-kicker">Authoritative examples</p>
        <Typography component="h2" variant="h4">
          Go deeper without losing the complete integration examples
        </Typography>
        <Typography className="docs-muted">
          The configurator is the fast exploration surface. These examples remain the
          learning surface for controller ownership, custom formatting, slots, RTL,
          composable primitives, and React Hook Form.
        </Typography>
      </div>
      <CoreExample />
      <PresentationExamples />
      <SelectorAndFlagsExample />
      <ResponsiveRtlExample />
      <ComposableExample />
      <ReactHookFormExample />
    </Stack>
  );
}
