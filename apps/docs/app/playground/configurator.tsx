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
  formatPhoneInputPresentation,
  MuiPhoneInput,
  type MuiPhoneInputProps,
  parsePhoneValue,
  type PhoneCountrySelectorMode,
  type PhoneCountrySelectorOptionOwnerState,
  type PhoneFlagMode,
  type PhoneInputDisplayMode,
  type PhoneValue,
  resolveNumberingPlan,
  type FormatStrategy,
  validatePhoneValue,
} from '@wh1teee/mui-phone-input';
import { be } from '@wh1teee/mui-phone-input/locales/be';
import { ru } from '@wh1teee/mui-phone-input/locales/ru';
import {
  type ComponentPropsWithRef,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ConfigCountry = Exclude<MuiPhoneInputProps['defaultCountry'], null | undefined>;
type CountrySelection = ConfigCountry | 'auto';
type LocalePreset = 'be' | 'en' | 'ru';
type FormattingPreset = 'automatic' | 'belarus-mask' | 'north-america-mask' | 'padded';
type ValidationPreset = 'mobile' | 'possible' | 'valid';
type PreferredCountriesPreset = 'eastern-europe' | 'none' | 'north-america';
type ExtensionLengthPreset = '4' | '8' | 'none';
type ConfiguratorFlagMode = PhoneFlagMode | 'custom';

type ConfiguratorState = {
  customOption: boolean;
  defaultCountry: ConfigCountry | 'none';
  disabled: boolean;
  error: boolean;
  extension: string;
  extensionMaxLength: ExtensionLengthPreset;
  extensionPresentation: NonNullable<MuiPhoneInputProps['extensionPresentation']>;
  extensionRequired: boolean;
  flagMode: ConfiguratorFlagMode;
  formatting: FormattingPreset;
  locale: LocalePreset;
  preferredCountries: PreferredCountriesPreset;
  required: boolean;
  resultLimit: 20 | 50 | 100;
  rtl: boolean;
  selectedCountry: CountrySelection;
  selectorDisabled: boolean;
  selectorMode: PhoneCountrySelectorMode;
  validation: ValidationPreset;
  value: string;
  displayMode: PhoneInputDisplayMode;
};

type PresetKey =
  | 'belarus'
  | 'custom-slots'
  | 'display-mask'
  | 'emoji-flags'
  | 'fixed-calling-code'
  | 'inline-extension'
  | 'mobile-selector'
  | 'national'
  | 'no-flags'
  | 'rtl'
  | 'russian-locale'
  | 'strict-validation';

type ActivePreset = PresetKey | 'custom';

const DEFAULT_CONFIG: ConfiguratorState = {
  customOption: false,
  defaultCountry: 'BY',
  disabled: false,
  displayMode: 'international',
  error: false,
  extension: '42',
  extensionMaxLength: '8',
  extensionPresentation: 'none',
  extensionRequired: false,
  flagMode: 'local',
  formatting: 'automatic',
  locale: 'en',
  preferredCountries: 'eastern-europe',
  required: false,
  resultLimit: 50,
  rtl: false,
  selectedCountry: 'auto',
  selectorDisabled: false,
  selectorMode: 'auto',
  validation: 'possible',
  value: '+375291234567',
};

const PRESETS: ReadonlyArray<{
  key: PresetKey;
  label: string;
  patch: Partial<ConfiguratorState>;
}> = [
  { key: 'belarus', label: 'Belarus default', patch: {} },
  {
    key: 'national',
    label: 'National',
    patch: { defaultCountry: 'US', displayMode: 'national', value: '+12025550123' },
  },
  {
    key: 'fixed-calling-code',
    label: 'Fixed calling code',
    patch: {
      defaultCountry: 'US',
      displayMode: 'international-fixed-calling-code',
      selectedCountry: 'US',
      value: '+12025550123',
    },
  },
  {
    key: 'strict-validation',
    label: 'Strict validation',
    patch: { defaultCountry: 'US', validation: 'valid', value: '+12025550123' },
  },
  {
    key: 'display-mask',
    label: 'Display Mask',
    patch: {
      defaultCountry: 'US',
      formatting: 'north-america-mask',
      value: '+12025550123',
    },
  },
  {
    key: 'inline-extension',
    label: 'Inline extension',
    patch: {
      defaultCountry: 'US',
      extension: '42',
      extensionPresentation: 'inline',
      value: '+12025550123',
    },
  },
  { key: 'russian-locale', label: 'Russian locale', patch: { locale: 'ru' } },
  {
    key: 'rtl',
    label: 'RTL',
    patch: { defaultCountry: 'IL', rtl: true, value: '+972501234567' },
  },
  { key: 'emoji-flags', label: 'Emoji flags', patch: { flagMode: 'emoji' } },
  { key: 'no-flags', label: 'No flags', patch: { flagMode: 'none' } },
  {
    key: 'mobile-selector',
    label: 'Mobile selector',
    patch: { selectorMode: 'mobile' },
  },
  {
    key: 'custom-slots',
    label: 'Custom slots',
    patch: { customOption: true, flagMode: 'custom' },
  },
];

const rtlTheme = createTheme({ direction: 'rtl' });

const paddedAutomaticStrategy: FormatStrategy = ({ automatic }) => ({
  displayValue: ` ${automatic.displayValue}`,
  logicalCaretPositions: automatic.logicalCaretPositions.map(
    (position) => position + 1,
  ),
});

function ConfiguratorCountryOption({
  ownerState,
  ...props
}: ComponentPropsWithRef<'li'> & {
  ownerState: PhoneCountrySelectorOptionOwnerState;
}) {
  return (
    <li {...props} data-configurator-country={ownerState.option.country}>
      <span>{ownerState.option.localizedName}</span>
      <span className="configurator-country-code">
        +{ownerState.option.callingCode}
      </span>
    </li>
  );
}

function CustomExtension({
  inputProps,
}: {
  inputProps: ComponentPropsWithRef<'input'>;
}) {
  return (
    <TextField
      label="Desk"
      size="small"
      slotProps={{
        htmlInput: { ...inputProps, 'data-testid': 'config-extension-input' },
      }}
    />
  );
}

function getLocale(config: ConfiguratorState) {
  if (config.locale === 'ru') return ru;
  if (config.locale === 'be') return be;
  return undefined;
}

function getPreferredCountries(
  preset: PreferredCountriesPreset,
): readonly ConfigCountry[] | undefined {
  if (preset === 'eastern-europe') return ['BY', 'PL', 'LT'];
  if (preset === 'north-america') return ['US', 'CA', 'MX'];
  return undefined;
}

function getDisplayMask(formatting: FormattingPreset) {
  if (formatting === 'belarus-mask') return { pattern: '+### ## ### ## ##' };
  if (formatting === 'north-america-mask') return { pattern: '+# (###) ###-####' };
  return undefined;
}

function getFormatStrategy(formatting: FormattingPreset): FormatStrategy | undefined {
  return formatting === 'padded' ? paddedAutomaticStrategy : undefined;
}

function getValidationProps(
  config: ConfiguratorState,
): Pick<MuiPhoneInputProps, 'allowedNumberTypes' | 'validationMode'> {
  if (config.validation === 'mobile') {
    return {
      allowedNumberTypes: ['MOBILE', 'FIXED_LINE_OR_MOBILE'],
      validationMode: 'possible-and-type',
    };
  }
  return { validationMode: config.validation };
}

function getExtensionMaxLength(config: ConfiguratorState): number | undefined {
  return config.extensionMaxLength === 'none'
    ? undefined
    : Number(config.extensionMaxLength);
}

function parseConfigValue(value: string): PhoneValue {
  return value === '' ? undefined : parsePhoneValue(value);
}

function presetByKey(key: string | null): (typeof PRESETS)[number] | undefined {
  return PRESETS.find((preset) => preset.key === key);
}

const PARAM_KEYS: ReadonlyArray<readonly [keyof ConfiguratorState, string]> = [
  ['defaultCountry', 'dc'],
  ['selectedCountry', 'country'],
  ['value', 'value'],
  ['displayMode', 'mode'],
  ['formatting', 'format'],
  ['validation', 'validation'],
  ['selectorMode', 'selector'],
  ['preferredCountries', 'preferred'],
  ['resultLimit', 'limit'],
  ['flagMode', 'flags'],
  ['locale', 'locale'],
  ['rtl', 'rtl'],
  ['extensionPresentation', 'extension'],
  ['extension', 'ext'],
  ['extensionMaxLength', 'extMax'],
  ['extensionRequired', 'extRequired'],
  ['required', 'required'],
  ['disabled', 'disabled'],
  ['error', 'error'],
  ['selectorDisabled', 'selectorDisabled'],
  ['customOption', 'customOption'],
] as const;

const BOOLEAN_CONFIG_KEYS = new Set<keyof ConfiguratorState>([
  'customOption',
  'disabled',
  'error',
  'extensionRequired',
  'required',
  'rtl',
  'selectorDisabled',
]);

function includesValue<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return values.includes(value as T);
}

function restoreStringParameter(
  config: ConfiguratorState,
  key: keyof ConfiguratorState,
  raw: string,
): void {
  if (
    key === 'defaultCountry' &&
    includesValue(['BY', 'US', 'PL', 'GB', 'IL', 'none'] as const, raw)
  ) {
    config.defaultCountry = raw;
  } else if (
    key === 'selectedCountry' &&
    includesValue(['auto', 'BY', 'US', 'PL', 'GB', 'IL'] as const, raw)
  ) {
    config.selectedCountry = raw;
  } else if (
    key === 'displayMode' &&
    includesValue(
      ['international', 'national', 'international-fixed-calling-code'] as const,
      raw,
    )
  ) {
    config.displayMode = raw;
  } else if (
    key === 'formatting' &&
    includesValue(
      ['automatic', 'belarus-mask', 'north-america-mask', 'padded'] as const,
      raw,
    )
  ) {
    config.formatting = raw;
  } else if (
    key === 'validation' &&
    includesValue(['possible', 'valid', 'mobile'] as const, raw)
  ) {
    config.validation = raw;
  } else if (
    key === 'selectorMode' &&
    includesValue(['auto', 'desktop', 'mobile'] as const, raw)
  ) {
    config.selectorMode = raw;
  } else if (
    key === 'preferredCountries' &&
    includesValue(['eastern-europe', 'none', 'north-america'] as const, raw)
  ) {
    config.preferredCountries = raw;
  } else if (
    key === 'flagMode' &&
    includesValue(['local', 'emoji', 'none', 'custom', 'external'] as const, raw)
  ) {
    config.flagMode = raw;
  } else if (key === 'locale' && includesValue(['en', 'ru', 'be'] as const, raw)) {
    config.locale = raw;
  } else if (
    key === 'extensionPresentation' &&
    includesValue(['none', 'separate', 'inline', 'custom'] as const, raw)
  ) {
    config.extensionPresentation = raw;
  } else if (
    key === 'extensionMaxLength' &&
    includesValue(['none', '4', '8'] as const, raw)
  ) {
    config.extensionMaxLength = raw;
  } else if (key === 'value') {
    try {
      config.value = parseConfigValue(raw) ?? '';
    } catch {
      // Ignore hand-edited deep links that are not canonical phone input.
    }
  } else if (key === 'extension') {
    config.extension = raw.replace(/\D/gu, '');
  }
}

function serializeConfig(
  config: ConfiguratorState,
  activePreset: ActivePreset,
): string {
  const params = new URLSearchParams();
  if (activePreset !== 'custom') params.set('preset', activePreset);
  for (const [key, parameter] of PARAM_KEYS) {
    if (config[key] === DEFAULT_CONFIG[key]) continue;
    const value = config[key];
    params.set(
      parameter,
      typeof value === 'boolean' ? (value ? '1' : '0') : String(value),
    );
  }
  const query = params.toString();
  return query.length > 0 ? `#config=${query}` : '';
}

function restoreConfig(hash: string): {
  activePreset: ActivePreset;
  config: ConfiguratorState;
} {
  if (!hash.startsWith('#config=')) {
    return { activePreset: 'belarus', config: DEFAULT_CONFIG };
  }
  const params = new URLSearchParams(hash.slice('#config='.length));
  const preset = presetByKey(params.get('preset'));
  const config: ConfiguratorState = { ...DEFAULT_CONFIG, ...(preset?.patch ?? {}) };

  for (const [key, parameter] of PARAM_KEYS) {
    const raw = params.get(parameter);
    if (raw === null) continue;
    if (BOOLEAN_CONFIG_KEYS.has(key)) {
      (config as Record<string, unknown>)[key] = raw === '1';
      continue;
    }
    if (key === 'resultLimit') {
      const numeric = Number(raw);
      if (numeric === 20 || numeric === 50 || numeric === 100)
        config.resultLimit = numeric;
      continue;
    }
    restoreStringParameter(config, key, raw);
  }
  const maxLength = getExtensionMaxLength(config);
  if (maxLength !== undefined) config.extension = config.extension.slice(0, maxLength);
  if (config.extensionPresentation === 'none') config.extensionRequired = false;

  return {
    activePreset: preset ? preset.key : 'custom',
    config,
  };
}

function quote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function generateExample(config: ConfiguratorState): string {
  const coreImports = ['MuiPhoneInput', 'type PhoneValue'];
  const reactImports = ['useState'];
  const extraImports: string[] = [];
  const declarations: string[] = [];
  const body: string[] = [];
  const props: string[] = ['value={value}', 'onChange={setValue}'];
  const selectorLines: string[] = [];
  const defaultCountry =
    config.defaultCountry === 'none' ? null : config.defaultCountry;
  const extensionVisible = config.extensionPresentation !== 'none';
  const maxLength = getExtensionMaxLength(config);

  if (!config.selectorDisabled && config.flagMode === 'local') {
    extraImports.push("import '@wh1teee/mui-phone-input/flags.css';");
  }
  if (config.locale === 'ru') {
    extraImports.push("import { ru } from '@wh1teee/mui-phone-input/locales/ru';");
  } else if (config.locale === 'be') {
    extraImports.push("import { be } from '@wh1teee/mui-phone-input/locales/be';");
  }
  if (config.formatting === 'padded') {
    coreImports.push('type FormatStrategy');
    declarations.push(
      `const paddedAutomaticStrategy: FormatStrategy = ({ automatic }) => ({\n  displayValue: \` \${automatic.displayValue}\`,\n  logicalCaretPositions: automatic.logicalCaretPositions.map((position) => position + 1),\n});`,
    );
  }
  if (config.customOption) {
    coreImports.push('type PhoneCountrySelectorOptionOwnerState');
    reactImports.push('type ComponentPropsWithRef');
    declarations.push(
      `function CountryOption({ ownerState, ...props }: ComponentPropsWithRef<'li'> & {\n  ownerState: PhoneCountrySelectorOptionOwnerState;\n}) {\n  return (\n    <li {...props}>\n      {ownerState.option.localizedName} · +{ownerState.option.callingCode}\n    </li>\n  );\n}`,
    );
  }
  if (config.selectedCountry !== 'auto') {
    coreImports.push('type MuiPhoneInputProps');
    body.push(
      `  const [country, setCountry] = useState<MuiPhoneInputProps['selectedCountry']>(${quote(config.selectedCountry)});`,
    );
    props.push(
      'selectedCountry={country}',
      'onCountrySelection={(result) => setCountry(result.country)}',
    );
  } else if (defaultCountry !== null) {
    props.push(`defaultCountry=${quote(defaultCountry)}`);
  }

  body.unshift(
    `  const [value, setValue] = useState<PhoneValue>(${config.value === '' ? 'undefined' : quote(config.value)});`,
  );

  if (config.displayMode !== 'international') {
    props.push(`displayMode=${quote(config.displayMode)}`);
  }
  if (config.formatting === 'belarus-mask') {
    props.push("displayMask={{ pattern: '+### ## ### ## ##' }}");
  } else if (config.formatting === 'north-america-mask') {
    props.push("displayMask={{ pattern: '+# (###) ###-####' }}");
  } else if (config.formatting === 'padded') {
    props.push('formatStrategy={paddedAutomaticStrategy}');
  }
  if (config.validation === 'valid') {
    props.push("validationMode='valid'");
  } else if (config.validation === 'mobile') {
    props.push("validationMode='possible-and-type'");
    props.push("allowedNumberTypes={['MOBILE', 'FIXED_LINE_OR_MOBILE']}");
  }
  props.push("validationDisplay='always'");

  if (config.selectorDisabled) {
    props.push('disableCountrySelector');
  } else {
    if (config.selectorMode !== 'auto')
      selectorLines.push(`mode: ${quote(config.selectorMode)}`);
    const preferred = getPreferredCountries(config.preferredCountries);
    if (preferred !== undefined) {
      selectorLines.push(`preferredCountries: [${preferred.map(quote).join(', ')}]`);
    }
    if (config.resultLimit !== 50)
      selectorLines.push(`resultLimit: ${config.resultLimit}`);
    if (config.flagMode !== 'local' && config.flagMode !== 'custom') {
      selectorLines.push(`flagMode: ${quote(config.flagMode)}`);
    }
    if (config.flagMode === 'custom') {
      selectorLines.push('flagProvider: ({ country }) => <span>[{country}]</span>');
    }
    if (config.flagMode === 'external') {
      selectorLines.push(
        "externalFlag: { resolveUrl: (country) => 'https://purecatamphetamine.github.io/country-flag-icons/3x2/' + country + '.svg', referrerPolicy: 'no-referrer', fallback: '🌐' }",
      );
    }
    if (config.locale !== 'en') {
      selectorLines.push(
        `locale: ${config.locale}.locale`,
        `messages: ${config.locale}.messages`,
      );
    }
    if (config.customOption) selectorLines.push('slots: { option: CountryOption }');
  }

  if (config.locale !== 'en') props.push(`locale={${config.locale}.locale}`);
  if (selectorLines.length > 0) {
    props.push(
      `slotProps={{\n      countrySelector: {\n        ${selectorLines.join(',\n        ')}\n      },\n    }}`,
    );
  }

  if (extensionVisible) {
    coreImports.push('type PhoneExtension');
    body.push(
      `  const [extension, setExtension] = useState<PhoneExtension>(${config.extension === '' ? 'undefined' : quote(config.extension)});`,
    );
    props.push('extension={extension}', 'onExtensionChange={setExtension}');
    props.push(`extensionPresentation=${quote(config.extensionPresentation)}`);
    if (maxLength !== undefined) props.push(`extensionMaxLength={${maxLength}}`);
    if (config.extensionRequired) props.push('extensionRequired');
    if (config.extensionPresentation === 'separate')
      props.push("extensionLabel='Extension'");
    if (config.extensionPresentation === 'custom') {
      extraImports.unshift("import TextField from '@mui/material/TextField';");
      props.push(
        "renderExtension={({ inputProps }) => <TextField label='Desk' size='small' slotProps={{ htmlInput: inputProps }} />}",
      );
    }
  }
  if (config.required) props.push('required');
  if (config.disabled) props.push('disabled');
  if (config.error) props.push('error', "helperText='Forced error example'");

  if (config.rtl) {
    extraImports.unshift(
      "import { createTheme, ThemeProvider } from '@mui/material/styles';",
    );
    declarations.push("const rtlTheme = createTheme({ direction: 'rtl' });");
  }

  const uniqueCoreImports = [...new Set(coreImports)];
  const uniqueReactImports = [...new Set(reactImports)];
  const component = [
    '<MuiPhoneInput',
    ...props.map((prop) =>
      prop.includes('\n') ? `    ${prop.replaceAll('\n', '\n    ')}` : `    ${prop}`,
    ),
    '  />',
  ].join('\n');
  const rendered = config.rtl
    ? `<ThemeProvider theme={rtlTheme}>\n      <div dir="rtl">\n        ${component.replaceAll('\n', '\n        ')}\n      </div>\n    </ThemeProvider>`
    : component;

  return [
    "'use client';",
    '',
    ...extraImports,
    `import { ${uniqueCoreImports.join(', ')} } from '@wh1teee/mui-phone-input';`,
    `import { ${uniqueReactImports.join(', ')} } from 'react';`,
    declarations.length > 0 ? `\n${declarations.join('\n\n')}` : '',
    '',
    'export function PhoneExample() {',
    ...body,
    '',
    '  return (',
    `    ${rendered.replaceAll('\n', '\n    ')}`,
    '  );',
    '}',
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n')
    .trim();
}

async function copyText(text: string): Promise<'clipboard' | 'fallback'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'clipboard';
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Clipboard copy was rejected.');
    return 'fallback';
  }
}

function ControlGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <fieldset className="configurator-group">
      <legend>{title}</legend>
      <Stack spacing={1.5}>{children}</Stack>
    </fieldset>
  );
}

function SelectControl<T extends string>({
  label,
  onChange,
  options,
  testId,
  value,
}: {
  label: string;
  onChange(value: T): void;
  options: ReadonlyArray<readonly [T, string]>;
  testId?: string;
  value: T;
}) {
  return (
    <Stack spacing={0.5}>
      <Typography component="label" variant="caption">
        {label}
      </Typography>
      <Select
        data-testid={testId}
        size="small"
        value={value}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value as T)}
        inputProps={{ 'aria-label': label }}
      >
        {options.map(([optionValue, optionLabel]) => (
          <MenuItem key={optionValue} value={optionValue}>
            {optionLabel}
          </MenuItem>
        ))}
      </Select>
    </Stack>
  );
}

export function UniversalConfigurator() {
  const [config, setConfig] = useState<ConfiguratorState>(DEFAULT_CONFIG);
  const [activePreset, setActivePreset] = useState<ActivePreset>('belarus');
  const [copyStatus, setCopyStatus] = useState('');
  const [observedSelection, setObservedSelection] = useState<ConfigCountry | null>(
    DEFAULT_CONFIG.defaultCountry === 'none' ? null : DEFAULT_CONFIG.defaultCountry,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restoreFromHash = () => {
      const restored = restoreConfig(window.location.hash);
      setConfig(restored.config);
      setActivePreset(restored.activePreset);
      setObservedSelection(
        restored.config.selectedCountry === 'auto'
          ? restored.config.defaultCountry === 'none'
            ? null
            : restored.config.defaultCountry
          : restored.config.selectedCountry,
      );
      setCopyStatus('');
      setHydrated(true);
    };

    restoreFromHash();
    window.addEventListener('hashchange', restoreFromHash);
    return () => window.removeEventListener('hashchange', restoreFromHash);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const hash = serializeConfig(config, activePreset);
    const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [activePreset, config, hydrated]);

  const phoneValue = parseConfigValue(config.value);
  const selectedCountry =
    config.selectedCountry === 'auto'
      ? (observedSelection ??
        (config.defaultCountry === 'none' ? null : config.defaultCountry))
      : config.selectedCountry;
  const numberingPlan = resolveNumberingPlan(phoneValue, {
    ...(selectedCountry === null ? {} : { selectedCountry }),
  });
  const validationProps = getValidationProps(config);
  const validation = validatePhoneValue(phoneValue, {
    ...(selectedCountry === null ? {} : { selectedCountry }),
    ...(validationProps.allowedNumberTypes === undefined
      ? {}
      : { allowedNumberTypes: validationProps.allowedNumberTypes }),
    required: config.required,
    validationMode: validationProps.validationMode,
  });
  const locale = getLocale(config);
  const preferredCountries = getPreferredCountries(config.preferredCountries);
  const maxLength = getExtensionMaxLength(config);
  const displayMask = getDisplayMask(config.formatting);
  const formatStrategy = getFormatStrategy(config.formatting);
  const displayValue = formatPhoneInputPresentation(phoneValue, {
    ...(selectedCountry === null ? {} : { country: selectedCountry }),
    displayMode: config.displayMode,
    ...(displayMask === undefined ? {} : { displayMask }),
    ...(formatStrategy === undefined ? {} : { formatStrategy }),
    locale: locale?.locale ?? 'en',
  }).displayValue;
  const generatedCode = useMemo(() => generateExample(config), [config]);

  const updateConfig = (patch: Partial<ConfiguratorState>) => {
    setActivePreset('custom');
    setCopyStatus('');
    setConfig((current) => ({ ...current, ...patch }));
  };

  const applyPreset = (key: PresetKey) => {
    const preset = PRESETS.find((candidate) => candidate.key === key);
    if (!preset) return;
    const next = { ...DEFAULT_CONFIG, ...preset.patch };
    setConfig(next);
    setActivePreset(key);
    setCopyStatus('');
    setObservedSelection(
      next.selectedCountry === 'auto'
        ? next.defaultCountry === 'none'
          ? null
          : next.defaultCountry
        : next.selectedCountry,
    );
  };

  const handlePhoneChange = (nextValue: PhoneValue) => {
    updateConfig({ value: nextValue ?? '' });
  };

  const selectorProps: NonNullable<MuiPhoneInputProps['slotProps']>['countrySelector'] =
    {
      'data-testid': 'config-country-selector',
      flagMode: config.flagMode === 'custom' ? 'local' : config.flagMode,
      locale: locale?.locale,
      messages: locale?.messages,
      mode: config.selectorMode,
      preferredCountries,
      resultLimit: config.resultLimit,
      ...(config.customOption ? { slots: { option: ConfiguratorCountryOption } } : {}),
      ...(config.flagMode === 'custom'
        ? { flagProvider: ({ country }) => <span>[{country}]</span> }
        : {}),
      ...(config.flagMode === 'external'
        ? {
            externalFlag: {
              fallback: '🌐',
              referrerPolicy: 'no-referrer',
              resolveUrl: (country) =>
                `https://purecatamphetamine.github.io/country-flag-icons/3x2/${country}.svg`,
            },
          }
        : {}),
    };

  const phone = (
    <MuiPhoneInput
      key={`${config.defaultCountry}:${config.selectedCountry}`}
      label="Try the real component"
      value={phoneValue}
      onChange={handlePhoneChange}
      onCountrySelection={(result) => {
        setObservedSelection(result.country);
        if (config.selectedCountry !== 'auto') {
          updateConfig({ selectedCountry: result.country });
        }
      }}
      {...(config.defaultCountry === 'none'
        ? {}
        : { defaultCountry: config.defaultCountry })}
      {...(config.selectedCountry === 'auto'
        ? {}
        : { selectedCountry: config.selectedCountry })}
      displayMode={config.displayMode}
      {...(displayMask === undefined ? {} : { displayMask })}
      {...(formatStrategy === undefined ? {} : { formatStrategy })}
      validationMode={validationProps.validationMode}
      {...(validationProps.allowedNumberTypes === undefined
        ? {}
        : { allowedNumberTypes: validationProps.allowedNumberTypes })}
      validationDisplay="always"
      locale={locale?.locale}
      disableCountrySelector={config.selectorDisabled}
      slotProps={{
        countrySelector: selectorProps,
        htmlInput: { 'data-testid': 'config-phone-input' },
      }}
      extension={config.extensionPresentation === 'none' ? undefined : config.extension}
      onExtensionChange={(extension) => updateConfig({ extension: extension ?? '' })}
      extensionPresentation={config.extensionPresentation}
      {...(maxLength === undefined ? {} : { extensionMaxLength: maxLength })}
      extensionRequired={config.extensionRequired}
      extensionLabel="Extension"
      {...(config.extensionPresentation === 'custom'
        ? {
            renderExtension: ({ inputProps }) => (
              <CustomExtension inputProps={inputProps} />
            ),
          }
        : {})}
      required={config.required}
      disabled={config.disabled}
      error={config.error}
      helperText={config.error ? 'Forced error example' : undefined}
    />
  );

  return (
    <section className="configurator" aria-labelledby="configurator-title">
      <div className="configurator-heading">
        <div>
          <p className="docs-kicker">Universal configurator</p>
          <h2 id="configurator-title">
            Explore the public API, then copy the exact setup
          </h2>
          <p className="docs-muted">
            Every control below maps to a supported package prop or a named code preset.
            Country search is always built in, so the configurator does not invent a
            switch for it.
          </p>
        </div>
        <div className="configurator-deep-link" aria-live="polite">
          URL updates automatically for shareable configurations.
        </div>
      </div>

      <fieldset className="configurator-presets">
        <legend className="docs-visually-hidden">Curated presets</legend>
        {PRESETS.map((preset) => (
          <Button
            key={preset.key}
            data-testid={`preset-${preset.key}`}
            size="small"
            type="button"
            variant={activePreset === preset.key ? 'contained' : 'outlined'}
            onClick={() => applyPreset(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
      </fieldset>

      <div className="configurator-layout">
        <aside className="configurator-controls" aria-label="Phone input controls">
          <ControlGroup title="Value & country">
            <TextField
              data-testid="config-value-control"
              label="Starting / current Phone Value"
              size="small"
              value={config.value}
              onChange={(event) => {
                try {
                  const parsed = parsePhoneValue(event.target.value);
                  updateConfig({ value: parsed ?? '' });
                } catch {
                  // Invalid display characters never become canonical configurator state.
                }
              }}
              helperText="Canonical +digits. Editing the live input updates this too."
            />
            <SelectControl
              label="defaultCountry"
              value={config.defaultCountry}
              onChange={(defaultCountry) => {
                updateConfig({ defaultCountry });
                if (config.selectedCountry === 'auto') {
                  setObservedSelection(
                    defaultCountry === 'none' ? null : defaultCountry,
                  );
                }
              }}
              options={[
                ['BY', 'Belarus'],
                ['US', 'United States'],
                ['PL', 'Poland'],
                ['GB', 'United Kingdom'],
                ['IL', 'Israel'],
                ['none', 'None'],
              ]}
            />
            <SelectControl
              label="selectedCountry"
              value={config.selectedCountry}
              onChange={(selectedCountry) => {
                updateConfig({ selectedCountry });
                setObservedSelection(
                  selectedCountry === 'auto'
                    ? config.defaultCountry === 'none'
                      ? null
                      : config.defaultCountry
                    : selectedCountry,
                );
              }}
              options={[
                ['auto', 'Uncontrolled / auto'],
                ['BY', 'Belarus'],
                ['US', 'United States'],
                ['PL', 'Poland'],
                ['GB', 'United Kingdom'],
                ['IL', 'Israel'],
              ]}
            />
          </ControlGroup>

          <ControlGroup title="Presentation">
            <SelectControl
              label="Display mode"
              testId="config-display-mode"
              value={config.displayMode}
              onChange={(displayMode) => updateConfig({ displayMode })}
              options={[
                ['international', 'International'],
                ['national', 'National'],
                ['international-fixed-calling-code', 'Fixed calling code'],
              ]}
            />
            <SelectControl
              label="Formatting"
              testId="config-formatting"
              value={config.formatting}
              onChange={(formatting) => updateConfig({ formatting })}
              options={[
                ['automatic', 'Automatic'],
                ['belarus-mask', 'Display Mask · Belarus'],
                ['north-america-mask', 'Display Mask · North America'],
                ['padded', 'Format Strategy · padded automatic'],
              ]}
            />
          </ControlGroup>

          <ControlGroup title="Validation">
            <SelectControl
              label="Validation policy"
              testId="config-validation"
              value={config.validation}
              onChange={(validation) => updateConfig({ validation })}
              options={[
                ['possible', 'Possible'],
                ['valid', 'Strict valid'],
                ['mobile', 'Possible + mobile type'],
              ]}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.required}
                  onChange={(_event, required) => updateConfig({ required })}
                />
              }
              label="Required"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.error}
                  onChange={(_event, error) => updateConfig({ error })}
                />
              }
              label="Force error state"
            />
          </ControlGroup>

          <ControlGroup title="Country Selector">
            <SelectControl
              label="Selector mode"
              testId="config-selector-mode"
              value={config.selectorMode}
              onChange={(selectorMode) => updateConfig({ selectorMode })}
              options={[
                ['auto', 'Auto · responsive'],
                ['desktop', 'Desktop · Popper'],
                ['mobile', 'Mobile · Dialog'],
              ]}
            />
            <SelectControl
              label="Preferred countries"
              value={config.preferredCountries}
              onChange={(preferredCountries) => updateConfig({ preferredCountries })}
              options={[
                ['eastern-europe', 'BY · PL · LT'],
                ['north-america', 'US · CA · MX'],
                ['none', 'None'],
              ]}
            />
            <SelectControl
              label="Search result limit"
              value={String(config.resultLimit) as '20' | '50' | '100'}
              onChange={(resultLimit) =>
                updateConfig({ resultLimit: Number(resultLimit) as 20 | 50 | 100 })
              }
              options={[
                ['20', '20'],
                ['50', '50 · default'],
                ['100', '100'],
              ]}
            />
            <Typography variant="caption" className="docs-muted">
              Search is part of the selector contract and stays enabled in every mode.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.selectorDisabled}
                  onChange={(_event, selectorDisabled) =>
                    updateConfig({ selectorDisabled })
                  }
                />
              }
              label="Disable selector"
            />
          </ControlGroup>

          <ControlGroup title="Flags & locale">
            <SelectControl
              label="Flags"
              testId="config-flags"
              value={config.flagMode}
              onChange={(flagMode) => updateConfig({ flagMode })}
              options={[
                ['local', 'Local SVG · default'],
                ['emoji', 'Emoji'],
                ['none', 'None'],
                ['custom', 'Custom provider'],
                ['external', 'External · opt-in'],
              ]}
            />
            <SelectControl
              label="Locale"
              testId="config-locale"
              value={config.locale}
              onChange={(localePreset) => updateConfig({ locale: localePreset })}
              options={[
                ['en', 'English'],
                ['ru', 'Русский'],
                ['be', 'Беларуская'],
              ]}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.rtl}
                  onChange={(_event, rtl) => updateConfig({ rtl })}
                />
              }
              label="RTL demonstration"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.customOption}
                  onChange={(_event, customOption) => updateConfig({ customOption })}
                />
              }
              label="Custom country option slot"
            />
          </ControlGroup>

          <ControlGroup title="Extension">
            <SelectControl
              label="Presentation"
              testId="config-extension-presentation"
              value={config.extensionPresentation}
              onChange={(extensionPresentation) =>
                updateConfig({
                  extensionPresentation,
                  ...(extensionPresentation === 'none'
                    ? { extensionRequired: false }
                    : {}),
                })
              }
              options={[
                ['none', 'None'],
                ['separate', 'Separate field'],
                ['inline', 'Inline'],
                ['custom', 'Custom renderer'],
              ]}
            />
            <TextField
              label="Extension value"
              size="small"
              value={config.extension}
              disabled={config.extensionPresentation === 'none'}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/gu, '');
                const bounded =
                  maxLength === undefined ? digits : digits.slice(0, maxLength);
                updateConfig({ extension: bounded });
              }}
            />
            <SelectControl
              label="Max length"
              value={config.extensionMaxLength}
              onChange={(extensionMaxLength) => {
                const nextMax =
                  extensionMaxLength === 'none'
                    ? undefined
                    : Number(extensionMaxLength);
                updateConfig({
                  extensionMaxLength,
                  extension:
                    nextMax === undefined
                      ? config.extension
                      : config.extension.slice(0, nextMax),
                });
              }}
              options={[
                ['none', 'No product limit'],
                ['4', '4 digits'],
                ['8', '8 digits'],
              ]}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.extensionRequired}
                  disabled={config.extensionPresentation === 'none'}
                  onChange={(_event, extensionRequired) =>
                    updateConfig({ extensionRequired })
                  }
                />
              }
              label="Extension required"
            />
          </ControlGroup>

          <ControlGroup title="Component state">
            <FormControlLabel
              control={
                <Switch
                  checked={config.disabled}
                  onChange={(_event, disabled) => updateConfig({ disabled })}
                />
              }
              label="Disabled"
            />
          </ControlGroup>
        </aside>

        <div className="configurator-result">
          <Paper className="configurator-preview" variant="outlined">
            <div className="configurator-preview-topline">
              <div>
                <p className="docs-kicker">Live result</p>
                <Typography component="h3" variant="h5">
                  Real MuiPhoneInput
                </Typography>
              </div>
              <span className="configurator-preset-label">
                {activePreset === 'custom'
                  ? 'Custom configuration'
                  : PRESETS.find((preset) => preset.key === activePreset)?.label}
              </span>
            </div>
            <div className="configurator-phone-stage" data-testid="config-phone-stage">
              {config.rtl ? (
                <ThemeProvider theme={rtlTheme}>
                  <div dir="rtl">{phone}</div>
                </ThemeProvider>
              ) : (
                phone
              )}
            </div>

            <section
              className="configurator-inspector"
              aria-labelledby="configurator-inspector-title"
            >
              <h4 className="docs-visually-hidden" id="configurator-inspector-title">
                Live state inspector
              </h4>
              <div>
                <span>Phone Value</span>
                <output data-testid="config-phone-value">
                  {phoneValue ?? 'undefined'}
                </output>
              </div>
              <div>
                <span>Display Value</span>
                <output data-testid="config-display-value">
                  {displayValue || 'empty'}
                </output>
              </div>
              <div>
                <span>Selected country</span>
                <output data-testid="config-selected-country">
                  {selectedCountry ?? 'none'}
                </output>
              </div>
              <div>
                <span>Authority selection</span>
                <output>{numberingPlan.selectedCountry ?? 'none'}</output>
              </div>
              <div>
                <span>Detected country</span>
                <output>{numberingPlan.detectedCountry ?? 'none'}</output>
              </div>
              <div>
                <span>Resolved country</span>
                <output data-testid="config-resolved-country">
                  {numberingPlan.resolvedCountry ?? 'none'}
                </output>
              </div>
              <div>
                <span>Numbering plan</span>
                <output data-testid="config-plan-kind">{numberingPlan.kind}</output>
              </div>
              <div>
                <span>Possible countries</span>
                <output>{numberingPlan.possibleCountries.join(', ') || 'none'}</output>
              </div>
              <div>
                <span>Validation</span>
                <output data-testid="config-validation-state">
                  {validation.status}:{validation.reason} ·{' '}
                  {validation.accepted ? 'accepted' : 'rejected'}
                </output>
              </div>
              <div>
                <span>Number type</span>
                <output>{validation.numberType ?? 'unknown'}</output>
              </div>
              <div>
                <span>Extension</span>
                <output>
                  {config.extensionPresentation === 'none'
                    ? 'not presented'
                    : config.extension || 'undefined'}
                </output>
              </div>
              <div>
                <span>Presentation</span>
                <output>{config.displayMode}</output>
              </div>
            </section>
          </Paper>

          <Paper className="configurator-code-panel" variant="outlined">
            <div className="configurator-code-toolbar">
              <div>
                <p className="docs-kicker">Generated TSX</p>
                <Typography component="h3" variant="h6">
                  Minimal usage for this state
                </Typography>
              </div>
              <Button
                data-testid="copy-generated-code"
                type="button"
                variant="contained"
                onClick={() => {
                  void copyText(generatedCode)
                    .then((method) =>
                      setCopyStatus(
                        method === 'clipboard'
                          ? 'Code copied.'
                          : 'Code copied with fallback.',
                      ),
                    )
                    .catch(() =>
                      setCopyStatus('Copy failed. Select the code manually.'),
                    );
                }}
              >
                Copy code
              </Button>
            </div>
            <pre className="docs-code configurator-code" data-testid="generated-code">
              <code>{generatedCode}</code>
            </pre>
            <p
              className="configurator-copy-status"
              data-testid="copy-status"
              role="status"
              aria-live="polite"
            >
              {copyStatus}
            </p>
          </Paper>
        </div>
      </div>
    </section>
  );
}
