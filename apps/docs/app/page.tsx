import {
  Callout,
  CodeBlock,
  DocsLayout,
  DocsShell,
  Section,
  type TocGroup,
} from './docs-ui';
import { CopyButton } from './copy-button';
import { LandingDemo } from './landing-demo';

const installMui = `pnpm add @wh1teee/mui-phone-input @mui/material @emotion/react @emotion/styled`;

const installBaseUi = `pnpm add @wh1teee/mui-phone-input @base-ui/react`;

const coreExample = `'use client';

import { MuiPhoneInput, type PhoneValue } from '@wh1teee/mui-phone-input';
import { useState } from 'react';

export function ContactPhone() {
  const [phone, setPhone] = useState<PhoneValue>();

  return (
    <MuiPhoneInput
      label="Phone"
      value={phone}
      onChange={setPhone}
      defaultCountry="US"
    />
  );
}`;

const serverExample = `import {
  parseNationalPhoneValue,
  resolveNumberingPlan,
  validatePhoneValue,
} from '@wh1teee/mui-phone-input/server';

const phone = parseNationalPhoneValue('2025550123', 'US');
if (phone === null) throw new Error('Incomplete or impossible national number');

const validation = validatePhoneValue(phone); // possible-by-default
const plan = resolveNumberingPlan(phone, { selectedCountry: 'US' });`;

const selectorExample = `import { getPopularPhoneCountries } from '@wh1teee/mui-phone-input';

// Your audience: pin the countries you know users need.
<MuiPhoneInput
  defaultCountry="BY"
  slotProps={{
    countrySelector: { locale: 'ru', preferredCountries: ['BY', 'PL', 'LT'] },
  }}
/>

// Global audience: pin the N most populous countries.
<MuiPhoneInput
  slotProps={{
    countrySelector: { preferredCountries: getPopularPhoneCountries(15) },
  }}
/>

// Optional: render at most 30 options (with or without a query).
<MuiPhoneInput slotProps={{ countrySelector: { resultLimit: 30 } }} />`;

const baseUiExample = `'use client';

import { useState } from 'react';
import {
  getPopularPhoneCountries,
  PhoneInput,
  type PhoneValue,
} from '@wh1teee/mui-phone-input/shadcn';
import '@wh1teee/mui-phone-input/shadcn.css';

export function ContactPhone() {
  const [phone, setPhone] = useState<PhoneValue>();
  return (
    <PhoneInput
      label="Phone"
      defaultCountry="US"
      value={phone}
      onChange={setPhone}
      countrySelector={{ preferredCountries: getPopularPhoneCountries(5) }}
    />
  );
}`;

const headlessExample = `import { usePhoneInput } from '@wh1teee/mui-phone-input/headless';
import { PhoneInputCountrySelector } from '@wh1teee/mui-phone-input/base-ui';

function OwnedField() {
  const phone = usePhoneInput({ defaultCountry: 'US' });
  return (
    <div {...phone.getRootProps()} className="my-field">
      <label htmlFor={phone.state.inputId}>Phone</label>
      <PhoneInputCountrySelector phone={phone} />
      <input {...phone.getInputProps({ type: 'tel' })} className="my-input" />
    </div>
  );
}`;

const formattingExample = `<MuiPhoneInput displayMode="international" />
<MuiPhoneInput defaultCountry="US" displayMode="national" />
<MuiPhoneInput
  defaultCountry="US"
  displayMode="international-fixed-calling-code"
/>

<MuiPhoneInput displayMask={{ pattern: '+# (###) ###-####' }} />`;

const strategyExample = `const spacedPairs: FormatStrategy = ({ automatic }) => {
  // A custom strategy must preserve every presentation digit and return one
  // ordered display offset for every logical caret position.
  return automatic;
};

<MuiPhoneInput formatStrategy={spacedPairs} />;`;

const extensionExample = `const [phone, setPhone] = useState<PhoneValue>();
const [extension, setExtension] = useState<PhoneExtension>();

<MuiPhoneInput
  value={phone}
  onChange={setPhone}
  extension={extension}
  onExtensionChange={setExtension}
  extensionPresentation="separate"
  extensionLabel="Extension"
/>;

serializeRfc3966('+12025550123', '42'); // tel:+12025550123;ext=42
parseRfc3966('tel:+12025550123;ext=42');`;

const flagsExample = `import { ru } from '@wh1teee/mui-phone-input/locales/ru';
import '@wh1teee/mui-phone-input/flags.css';

<MuiPhoneInput
  locale={ru.locale}
  slotProps={{
    countrySelector: {
      messages: ru.messages,
      locale: ru.locale,
      flagMode: 'local', // default: package SVG assets, no network request
    },
  }}
/>;

// Alternatives:
// flagMode="emoji" | "none"
// flagMode="external" + externalFlag.resolveUrl(country)
// flagProvider={({ country }) => <YourFlag country={country} />}`;

const muiThemeExample = `import { createTheme } from '@mui/material/styles';
import { muiPhoneInputClasses } from '@wh1teee/mui-phone-input';

export const theme = createTheme({
  components: {
    MuiPhoneInput: {
      defaultProps: { validationDisplay: 'blur' },
      styleOverrides: {
        root: {
          variants: [{
            props: { size: 'small' },
            style: {
              [\`& .\${muiPhoneInputClasses.input}\`]: {
                fontVariantNumeric: 'tabular-nums',
              },
            },
          }],
        },
      },
    },
  },
});`;

const slotsExample = `function CountryOption({ ownerState, ...props }: CountryOptionProps) {
  // Spread the package-provided props. They carry role, id, ARIA state,
  // keyboard/mouse handlers, data attributes, and ref semantics.
  return <li {...props}>{ownerState.option.localizedName}</li>;
}

<MuiPhoneInput
  slots={{ countrySelector: PhoneInputCountrySelector }}
  slotProps={{
    countrySelector: { slots: { option: CountryOption } },
    htmlInput: { inputMode: 'tel' },
  }}
/>;`;

const rhfExample = `import { useForm } from 'react-hook-form';
import { MuiPhoneInputController } from '@wh1teee/mui-phone-input/react-hook-form';
import type { PhoneExtension, PhoneValue } from '@wh1teee/mui-phone-input';

type FormValues = { phone: PhoneValue; extension: PhoneExtension };

const form = useForm<FormValues>({
  defaultValues: async () => loadContact(),
});

<MuiPhoneInputController
  control={form.control}
  name="phone"
  extensionName="extension"
  extensionPresentation="separate"
  rules={{ required: 'Phone is required' }}
/>;

// Controller owns dirty/touched/ref state. form.reset(...) resets both fields;
// field.ref lets React Hook Form focus the phone input on validation errors.`;

const zodExample = `import {
  createPhoneExtensionSchema,
  createPhoneNumberTypeSchema,
  createPhonePossibleSchema,
  createPhoneValidSchema,
} from '@wh1teee/mui-phone-input/zod';

const possible = createPhonePossibleSchema();
const strict = createPhoneValidSchema();
const mobile = createPhoneNumberTypeSchema(['MOBILE', 'FIXED_LINE_OR_MOBILE']);
const extension = createPhoneExtensionSchema({ maxLength: 8 });`;

const serverCompositionExample = `import { validatePhoneValue } from '@wh1teee/mui-phone-input/server';
import { createPhoneFormSchema } from '@wh1teee/mui-phone-input/zod';

export async function saveContact(input: unknown) {
  const value = createPhoneFormSchema({
    extension: { maxLength: 8 },
  }).parse(input);

  const policy = validatePhoneValue(value.phone, { validationMode: 'possible' });
  if (!policy.accepted) throw new Error('Phone policy rejected the value');
  return value;
}`;

const nextExample = `// app/layout.tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import '@wh1teee/mui-phone-input/flags.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}

// Server Components and route handlers import only the server-safe subpath:
import { validatePhoneValue } from '@wh1teee/mui-phone-input/server';`;

const metadataExample = `import minMetadata from '@wh1teee/mui-phone-input/metadata/min';
import validateCustomMetadata from '@wh1teee/mui-phone-input/metadata/custom';

<MuiPhoneInput metadata={minMetadata} />;

// Validate metadata generated by libphonenumber-js tooling before use.
const metadata = validateCustomMetadata(generatedMetadata);
validatePhoneValue(phone, { metadata });`;

const toc: readonly TocGroup[] = [
  {
    title: 'Get started',
    links: [
      ['Quick start', '#quick-start'],
      ['Base UI & shadcn', '#base-ui-shadcn'],
    ],
  },
  {
    title: 'Guides',
    links: [
      ['Phone values', '#phone-semantics'],
      ['Country selector', '#country-selector'],
      ['Formatting', '#formatting'],
      ['Extensions', '#extensions'],
      ['Forms & validation', '#forms'],
      ['Localization & RTL', '#flags-localization'],
      ['MUI integration', '#mui-integration'],
    ],
  },
  {
    title: 'Production',
    links: [
      ['SSR & security', '#ssr-security'],
      ['Metadata', '#metadata'],
      ['Performance', '#performance'],
      ['Accessibility', '#accessibility'],
      ['Provenance', '#provenance'],
    ],
  },
];

export default function DocumentationPage() {
  return (
    <DocsShell>
      <div className="docs-hero">
        <div className="docs-hero-copy">
          <h1>A complete phone input for React</h1>
          <p>
            Country search, as-you-type formatting, validation, and extensions over one
            canonical value backed by <code>libphonenumber-js</code>. Use the Material
            UI component, the shadcn-styled Base UI field, or the headless controller in
            your own input.
          </p>
          <div className="docs-hero-actions">
            <a className="docs-button docs-button-primary" href="#quick-start">
              Get started
            </a>
            <a className="docs-button" href="/playground">
              Open playground
            </a>
          </div>
          <div className="docs-install">
            <code>npm i @wh1teee/mui-phone-input</code>
            <CopyButton text="npm i @wh1teee/mui-phone-input" />
          </div>
        </div>
        <LandingDemo />
      </div>

      <DocsLayout toc={toc}>
        <Section
          id="quick-start"
          title="Quick start"
          lead="React 19 is required. Install the package with the peers of the renderer you use — each renderer needs only its own."
        >
          <h3>Material UI</h3>
          <CodeBlock title="Terminal">{installMui}</CodeBlock>
          <CodeBlock title="ContactPhone.tsx">{coreExample}</CodeBlock>
          <p>
            The value is <code>undefined</code> or <code>+</code> followed by digits —
            store it as-is. React Hook Form and Zod are optional; install them only when
            you import their entrypoints.
          </p>
          <h3>Server helpers</h3>
          <CodeBlock title="server.ts">{serverExample}</CodeBlock>
          <p>
            <code>/server</code> contains no React, MUI, DOM, or browser APIs, so it
            runs in API routes, server actions, and jobs.
          </p>
        </Section>

        <Section
          id="base-ui-shadcn"
          title="Base UI and shadcn"
          lead="An unstyled field and a searchable country selector built on Base UI Combobox. Neither path loads MUI or Emotion."
        >
          <CodeBlock title="Terminal">{installBaseUi}</CodeBlock>
          <CodeBlock title="ContactPhone.tsx">{baseUiExample}</CodeBlock>
          <p>
            <code>/shadcn</code> is the same composition as <code>/base-ui</code>.
            Import <code>/shadcn.css</code> for a skin built on the standard shadcn
            variables (<code>--background</code>, <code>--input</code>,{' '}
            <code>--ring</code>, <code>--popover</code>), or style the{' '}
            <code>data-slot</code> attributes yourself.
          </p>
          <Callout>
            The popup is portaled to <code>document.body</code>. If your shadcn
            variables live on a local wrapper rather than <code>:root</code> or{' '}
            <code>.dark</code>, pass{' '}
            <code>countrySelector=&#123;&#123; portalContainer &#125;&#125;</code> from
            inside that scope. Flags are off by default; opt in with{' '}
            <code>flags: &#123; mode: 'local' &#125;</code> and <code>/flags.css</code>.
          </Callout>
          <h3>Your own field</h3>
          <p>
            Keep a product-owned input and reuse the engine: spread{' '}
            <code>phone.getInputProps()</code> onto it and pass the same controller to
            the country selector.
          </p>
          <CodeBlock title="OwnedField.tsx">{headlessExample}</CodeBlock>
        </Section>

        <Section
          id="phone-semantics"
          title="Phone values"
          lead="Store the Phone Value; render the Display Value. Formatting never becomes data."
        >
          <h3>Phone Value and Display Value</h3>
          <p>
            <strong>Phone Value</strong> is <code>undefined</code> or <code>+</code>{' '}
            followed by ASCII digits. While editing it can be an incomplete candidate
            such as <code>+37529</code>; a complete accepted value is an E.164-style
            number. <strong>Display Value</strong> is presentation — spaces, masks, and
            national layout never feed back into the value.
          </p>
          <h3>Selected, detected, and resolved country</h3>
          <section
            aria-label="Phone country state semantics"
            className="docs-table-wrap"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Horizontal table overflow must be keyboard-scrollable.
            tabIndex={0}
          >
            <table className="docs-table">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>selectedCountry</code>
                  </td>
                  <td>
                    The explicit user or application choice. It persists while the
                    digits still need correcting.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>detectedCountry</code>
                  </td>
                  <td>Inferred from the digits once they are specific enough.</td>
                </tr>
                <tr>
                  <td>
                    <code>resolvedCountry</code>
                  </td>
                  <td>
                    The single country used for display after reconciling selection and
                    detection.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>possibleCountries</code>
                  </td>
                  <td>
                    Countries still compatible with a shared calling code such as{' '}
                    <code>+1</code> — ambiguity stays visible instead of being guessed.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
          <p>
            Non-geographic plans (for example global service numbers) resolve without a
            country and show no invented flag.
          </p>
          <h3>Validation</h3>
          <p>
            The default <code>validationMode="possible"</code> checks numbering-plan
            length, so newly assigned ranges are not rejected because metadata lags.
            Choose <code>"valid"</code> for strict patterns, or{' '}
            <code>"possible-and-type"</code> with <code>allowedNumberTypes</code> such
            as <code>MOBILE</code>. Validation is structural: it does not prove a user
            owns or can receive messages at the number — use OTP for that.
          </p>
        </Section>

        <Section
          id="country-selector"
          title="Country Selector"
          lead="Searchable by name, ISO code, or calling code, with the same ranking in every renderer."
        >
          <CodeBlock title="CountrySelector.tsx">{selectorExample}</CodeBlock>
          <ul className="docs-list">
            <li>
              An exact ISO code or the main country of a calling code comes first (
              <code>+1</code> → United States, <code>+44</code> → United Kingdom), then
              other exact codes, prefixes, and substrings.
            </li>
            <li>
              While searching, results are one ranked list and the best match is
              highlighted, so Enter selects it. After a selection, focus moves to the
              phone number.
            </li>
            <li>
              Every country is listed by default. <code>preferredCountries</code> pins
              your list — or <code>getPopularPhoneCountries(count)</code> — above it;{' '}
              <code>resultLimit</code>, <code>countryFilter</code>, and{' '}
              <code>countryOrder</code> shape the rest.
            </li>
            <li>
              In MUI, <code>mode="auto"</code> uses a popper on desktop and a
              full-screen dialog on mobile; <code>portalContainer</code> and{' '}
              <code>disablePortal</code> handle nested modals and Shadow DOM.
            </li>
          </ul>
        </Section>

        <Section
          id="formatting"
          title="Formatting and caret behavior"
          lead="International by default, national or fixed-calling-code on request. The caret stays where the user expects during mid-string edits and paste."
        >
          <CodeBlock title="Formatting.tsx">{formattingExample}</CodeBlock>
          <p>
            A Display Mask uses <code>#</code> as a digit slot; it only places
            separators and never validates or reorders digits. When a value no longer
            fits, presentation falls back to automatic formatting. For fully custom
            layouts, a Format Strategy returns the display string and a caret mapping:
          </p>
          <CodeBlock title="strategy.ts">{strategyExample}</CodeBlock>
        </Section>

        <Section
          id="extensions"
          title="Extensions and RFC 3966"
          lead="Extensions are a separate digits-only value, never part of the Phone Value."
        >
          <CodeBlock title="Extension.tsx">{extensionExample}</CodeBlock>
          <p>
            Presentation can be <code>none</code>, <code>separate</code>,{' '}
            <code>inline</code>, or <code>custom</code>, with optional{' '}
            <code>extensionMaxLength</code> and required policy. Pasting a number with
            an extension splits it into both values.
          </p>
        </Section>

        <Section
          id="forms"
          title="Forms: React Hook Form and Zod"
          lead="Optional adapters that keep dirty/touched state, reset, async defaults, and focus-on-error working."
        >
          <CodeBlock title="ContactForm.tsx">{rhfExample}</CodeBlock>
          <p>
            Bind <code>extensionName</code> when number and extension are separate form
            fields. For Base UI, import <code>PhoneInputController</code> from{' '}
            <code>/base-ui/react-hook-form</code>.
          </p>
          <CodeBlock title="schema.ts">{zodExample}</CodeBlock>
          <p>
            Pick the schema that matches your policy — possible and strictly valid are
            deliberately different. On the server, the same helpers apply the same
            rules:
          </p>
          <CodeBlock title="action.ts">{serverCompositionExample}</CodeBlock>
        </Section>

        <Section
          id="flags-localization"
          title="Flags, localization, and RTL"
          lead="Local SVG flags, emoji, external URLs, a custom provider, or none — flags never replace the accessible country name."
        >
          <CodeBlock title="Localized.tsx">{flagsExample}</CodeBlock>
          <p>
            Message packs ship for English, Russian, and Belarusian; country names come
            from <code>Intl.DisplayNames</code> or your <code>resolveCountryName</code>.
            External flags make network requests and must fit your CSP. For RTL, set the
            document direction and an MUI RTL theme; phone digits always stay
            left-to-right.
          </p>
        </Section>

        <Section
          id="mui-integration"
          title="Material UI integration"
          lead="Registered in the MUI theme like a built-in component."
        >
          <CodeBlock title="theme.ts">{muiThemeExample}</CodeBlock>
          <p>
            Use <code>defaultProps</code>, <code>styleOverrides</code>, and{' '}
            <code>variants</code> as with any MUI component, and the stable{' '}
            <code>muiPhoneInputClasses</code> instead of generated class names. Replace
            individual selector parts through slots — spread the provided props to keep
            keyboard and ARIA behavior:
          </p>
          <CodeBlock title="CountryOption.tsx">{slotsExample}</CodeBlock>
          <p>
            For a fully custom surface, compose <code>usePhoneInput</code> with{' '}
            <code>PhoneInputProvider</code>, <code>PhoneInputCountrySelector</code>,{' '}
            <code>PhoneInputInput</code>, and <code>PhoneInputValidationMessage</code>.
          </p>
        </Section>

        <Section
          id="ssr-security"
          title="SSR, privacy, and security"
          lead="Works in the Next.js App Router through normal package exports — no transpilePackages or special config."
        >
          <CodeBlock title="Next.js App Router">{nextExample}</CodeBlock>
          <p>
            Keep locale, metadata, and initial values identical on the server and the
            first client render; don't derive them from geolocation or storage during
            hydration. Phone numbers are personal data — don't log raw values or change
            details by default.
          </p>
        </Section>

        <Section
          id="metadata"
          title="Metadata presets and freshness"
          lead="Numbering rules come only from libphonenumber-js. The default is max metadata; /min entrypoints trade strict-validity detail for size."
        >
          <CodeBlock title="metadata.ts">{metadataExample}</CodeBlock>
          <div className="docs-grid">
            <div className="docs-card">
              <h3>max</h3>
              <p>Default. Complete patterns and number types.</p>
            </div>
            <div className="docs-card">
              <h3>min</h3>
              <p>About 21 KiB smaller; reduced strict-validity and type detail.</p>
            </div>
            <div className="docs-card">
              <h3>mobile</h3>
              <p>Complete mobile patterns, reduced other types.</p>
            </div>
            <div className="docs-card">
              <h3>custom</h3>
              <p>Validated metadata from official libphonenumber tooling.</p>
            </div>
          </div>
          <p>
            A weekly workflow diffs metadata updates against a golden corpus; semantic
            changes ship only after review.
          </p>
        </Section>

        <Section
          id="performance"
          title="Performance budgets and selector calibration"
          lead="Size and interaction budgets are enforced on the exact published tarball."
        >
          <div className="docs-grid docs-grid-stats">
            <div className="docs-card">
              <strong>33,506 bytes</strong>
              <p>gzip budget for the main entry, peers and metadata external.</p>
            </div>
            <div className="docs-card">
              <strong>10,240 bytes</strong>
              <p>
                gzip budget for the neutral <code>/server</code> entry.
              </p>
            </div>
            <div className="docs-card">
              <strong>1–6 ms</strong>
              <p>
                to filter the full 245-country list; opening it costs a one-time 117–132
                ms commit.
              </p>
            </div>
          </div>
          <p>
            The selector is not virtualized: the one-time open cost does not justify a
            second listbox and accessibility path. Constrained surfaces can set{' '}
            <code>resultLimit</code>.
          </p>
        </Section>

        <Section
          id="accessibility"
          title="Accessibility contract"
          lead="Targets WCAG 2.2 AA, checked with axe and keyboard tests in Chromium, Firefox, and WebKit."
        >
          <p>
            Coverage includes labels and error association, combobox and dialog
            semantics, keyboard navigation, focus return, RTL, 200% zoom, forced colors,
            and reduced motion. Custom slots must spread the provided props and forward
            refs. Physical iOS/Android devices and desktop screen readers are documented
            residual gaps, not passing evidence.
          </p>
        </Section>

        <Section
          id="provenance"
          title="Package provenance and release boundary"
          lead="Published from GitHub Actions with npm provenance, MIT licensed."
        >
          <p>
            Install from the default <code>latest</code> tag or pin an exact version.
            Docs follow current source, while the registry remains authoritative for a
            published version. Third-party design sources are listed in{' '}
            <a href="https://github.com/wh1teee/mui-phone-input/blob/main/DONORS.md">
              DONORS.md
            </a>
            .
          </p>
        </Section>
      </DocsLayout>
    </DocsShell>
  );
}
