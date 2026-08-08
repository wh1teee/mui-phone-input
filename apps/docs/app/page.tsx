import { CodeBlock, DocsShell, ReleaseStatus, Section } from './docs-ui';
import { LandingDemo } from './landing-demo';

const install = `pnpm add @wh1teee/mui-phone-input @mui/material @emotion/react @emotion/styled react react-dom`;

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

const selectorExample = `<MuiPhoneInput
  defaultCountry="BY"
  slotProps={{
    countrySelector: {
      locale: 'ru',
      preferredCountries: ['BY', 'PL', 'LT'],
      resultLimit: 50,
    },
  }}
/>`;

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

export default function DocumentationPage() {
  return (
    <DocsShell>
      <div className="docs-hero docs-hero-grid">
        <div className="docs-hero-copy">
          <p className="docs-kicker">MUI Phone Input</p>
          <h1>A complete phone input for Material UI</h1>
          <p>
            Country search, formatting, validation, extensions, SSR, React Hook Form,
            and Zod share one canonical phone value backed by{' '}
            <code>libphonenumber-js</code>. Built for React 19 and Material UI 9 without
            a second numbering authority.
          </p>
          <p>
            Try the real component beside this introduction, then open the{' '}
            <a href="/playground">interactive configurator</a> to change supported
            options and copy matching TypeScript. Use the{' '}
            <a href="/migration">migration guide</a> when replacing a legacy phone
            field.
          </p>
        </div>
        <LandingDemo />
      </div>

      <ReleaseStatus />

      <Section id="quick-start" title="Quick start">
        <h3>Install</h3>
        <CodeBlock>{install}</CodeBlock>
        <p>
          The package requires React 19, MUI 9, and Emotion peers. React Hook Form and
          Zod are optional peers; install them only when you import their subpaths.
        </p>

        <h3>Core React usage</h3>
        <CodeBlock>{coreExample}</CodeBlock>

        <h3>Server helpers</h3>
        <CodeBlock>{serverExample}</CodeBlock>
        <p>
          Import server code from <code>@wh1teee/mui-phone-input/server</code>. That
          graph contains no React, Material UI, Emotion, DOM, or browser API.
        </p>

        <div className="docs-grid">
          <div className="docs-card">
            <h3>React Hook Form</h3>
            <p>
              <code>MuiPhoneInputController</code> binds canonical number and extension
              fields to Controller state while preserving field refs and blur/change
              semantics.
            </p>
          </div>
          <div className="docs-card">
            <h3>Zod</h3>
            <p>
              Schema factories expose syntax, possible, strict-valid, number-type, and
              extension policies without importing the React entrypoint.
            </p>
          </div>
          <div className="docs-card">
            <h3>Country Selector</h3>
            <p>
              The default selector uses MUI Autocomplete semantics, Popper on desktop,
              Dialog on mobile, localized search, preferred countries, and a bounded
              result set.
            </p>
          </div>
          <div className="docs-card">
            <h3>Validation and extensions</h3>
            <p>
              Possible is the default acceptance policy. Extensions remain separate from
              the canonical phone number and round-trip through RFC 3966 when needed.
            </p>
          </div>
        </div>
      </Section>

      <Section id="phone-semantics" title="Phone semantics">
        <h3>Phone Value and Display Value</h3>
        <p>
          <strong>Phone Value</strong> is application state: <code>undefined</code> or a
          leading <code>+</code> followed only by ASCII digits. It can represent an
          incomplete canonical candidate such as <code>+37529</code>; a complete
          accepted value is an E.164-style international number.{' '}
          <strong>Display Value</strong> is a presentation derived from that state.
          Spaces, parentheses, dashes, national layout, masks, and fixed calling-code
          presentation never become numbering authority.
        </p>
        <p>
          Persist the Phone Value. Do not persist a formatted display string and later
          attempt to reconstruct telephone semantics from it.
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
                <th>Authority</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>state.selectedCountry</code>
                </td>
                <td>The explicit user/application country choice.</td>
                <td>
                  Ownership state. It can remain selected while the current digits still
                  need correction for that country.
                </td>
              </tr>
              <tr>
                <td>
                  <code>numberingPlan.selectedCountry</code>
                </td>
                <td>
                  An explicit selection still compatible with numbering authority.
                </td>
                <td>
                  Semantic evidence, not raw UI state. It can be <code>null</code> while
                  <code>state.selectedCountry</code> keeps the user's explicit choice.
                </td>
              </tr>
              <tr>
                <td>
                  <code>detectedCountry</code>
                </td>
                <td>
                  The country detected by the numbering metadata when the digits are
                  specific enough.
                </td>
                <td>Metadata-derived signal.</td>
              </tr>
              <tr>
                <td>
                  <code>resolvedCountry</code>
                </td>
                <td>
                  The final single geographic country when selection, detection, or one
                  remaining candidate resolves it.
                </td>
                <td>Use for country-specific presentation after resolution.</td>
              </tr>
              <tr>
                <td>
                  <code>possibleCountries</code>
                </td>
                <td>
                  All countries still compatible with a shared or incomplete
                  calling-code plan.
                </td>
                <td>Keep ambiguity visible instead of guessing.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <h3>Unresolved and non-geographic plans</h3>
        <p>
          Shared calling codes can remain <code>kind: 'unresolved'</code> while several
          countries are still possible. A non-geographic number such as a global service
          code resolves as <code>kind: 'non-geographic'</code> with no fabricated
          country, country selector state, or flag.
        </p>

        <h3>Acceptance and validity</h3>
        <p>
          The default <code>validationMode="possible"</code> accepts structurally
          possible numbers. <code>validationMode="valid"</code> additionally requires
          the current metadata pattern to classify the number as strictly valid. Use
          <code>possible-and-type</code> with <code>allowedNumberTypes</code> when
          product policy requires a known type such as <code>MOBILE</code>.
        </p>
        <p>
          These are structural metadata checks. They do not prove reachability, SMS or
          voice delivery, OTP possession, subscriber ownership, carrier status, fraud
          risk, or consent. Verify those properties with a separate product flow.
        </p>
      </Section>

      <Section id="formatting" title="Formatting and caret behavior">
        <CodeBlock>{formattingExample}</CodeBlock>
        <p>
          International is the default. National presentation requires a country
          context. Fixed-calling-code presentation keeps the selected country calling
          code visible while the canonical value remains separate.
        </p>
        <h3>Automatic formatting and Display Masks</h3>
        <p>
          Automatic formatting comes from the numbering authority. A declarative Display
          Mask uses <code>#</code> as digit slots and presentation separators only. It
          does not validate, add, remove, or reorder phone digits. If a value no longer
          fits the mask, the formatter falls back to automatic presentation instead of
          corrupting canonical state.
        </p>
        <h3>Custom Format Strategy</h3>
        <CodeBlock>{strategyExample}</CodeBlock>
        <p>
          A Format Strategy receives the automatic presentation as its safe baseline. It
          must preserve the exact presentation digits and return an ordered
          logical-caret mapping with the required length. Incorrect mappings make middle
          edits and caret restoration unreliable, so prefer automatic formatting or a
          Display Mask unless the custom layout genuinely needs a strategy.
        </p>
      </Section>

      <Section id="extensions" title="Extensions and RFC 3966">
        <CodeBlock>{extensionExample}</CodeBlock>
        <p>
          Extension presentation can be <code>none</code>, <code>separate</code>,
          <code>inline</code>, or <code>custom</code>. The extension is independently
          owned canonical digit state and can have an explicit{' '}
          <code>extensionMaxLength</code> or required policy. There is no universal
          extension-length rule.
        </p>
        <p>
          The canonical Phone Value always remains extension-free. Use
          <code>serializeRfc3966</code> to export a <code>tel:</code> URI and
          <code>parseRfc3966</code> to recover number plus extension. Extension-bearing
          paste is split into the same independent states before the phone transaction
          commits.
        </p>
      </Section>

      <Section id="country-selector" title="Country Selector">
        <CodeBlock>{selectorExample}</CodeBlock>
        <p>
          Search matches authority-backed countries, localized names, ISO country codes,
          and calling codes. Preferred countries form a dedicated group without becoming
          a second country list. <code>resultLimit</code> defaults to 50.
        </p>
        <p>
          <code>mode="auto"</code> renders a MUI Popper on desktop and Dialog on mobile,
          based on the theme breakpoint. <code>mode="desktop"</code> and
          <code>mode="mobile"</code> are available when the surrounding surface needs an
          explicit presentation. <code>disablePortal</code> and{' '}
          <code>portalContainer</code>
          support nested modal, Shadow DOM, and constrained portal topologies.
        </p>
        <h3>Why the selector is not virtualized</h3>
        <p>
          The approved calibration keeps the standard MUI <code>useAutocomplete</code>
          renderer and the 50-result default. Across Chromium, Firefox, and WebKit, the
          bounded desktop open measured 115–150 ms total with a longest individual
          commit of 73 ms; measured filters were 1–6 ms. Rendering all 245 countries was
          the non-default stress case and exceeded the bounded aggregate budget.
          Virtualization would add a second listbox/accessibility path without improving
          the normal bounded path, so it is currently unnecessary.
        </p>
      </Section>

      <Section id="flags-localization" title="Flags, localization, and RTL">
        <CodeBlock>{flagsExample}</CodeBlock>
        <p>
          Local SVG assets are the default and require the package CSS import. They make
          no network request and work in offline applications. External flags are opt-in
          and must satisfy the application's CSP <code>img-src</code>, referrer, and
          CORS policy. Emoji uses the platform glyph; <code>none</code> removes visual
          flags;
          <code>flagProvider</code> supplies a custom decorative renderer. Flags never
          replace the localized country name exposed to assistive technology.
        </p>
        <p>
          Locale entrypoints currently publish English, Russian, and Belarusian message
          bundles at <code>/locales/en</code>, <code>/locales/ru</code>, and
          <code>/locales/be</code>. Country names use <code>Intl.DisplayNames</code> or
          an explicit <code>resolveCountryName</code> function. For RTL, set the
          document direction, use an MUI theme with <code>direction: 'rtl'</code>,
          configure the MUI RTL styling-engine plugin/cache, and give portalled selector
          surfaces the same direction. Do not flip only the text field.
        </p>
      </Section>

      <Section id="mui-integration" title="Material UI integration">
        <h3>Theme registration, defaults, overrides, and variants</h3>
        <CodeBlock>{muiThemeExample}</CodeBlock>
        <p>
          Importing the main package entrypoint registers <code>MuiPhoneInput</code> in
          the MUI theme type system. Use <code>defaultProps</code> for shared behavior,
          <code>styleOverrides</code> for stable component slots, and MUI 9 slot-level
          <code>variants</code> for prop-based styling. Do not target generated hash
          class names.
        </p>
        <h3>Utility classes, slots, and primitives</h3>
        <p>
          <code>muiPhoneInputClasses</code> and
          <code>getMuiPhoneInputUtilityClass()</code> expose stable utility classes for
          the root, input, validation, extension, and semantic selector slots. The
          component also accepts MUI <code>slots</code>/<code>slotProps</code> for the
          native input, selector, extension, and inherited TextField surfaces.
        </p>
        <CodeBlock>{slotsExample}</CodeBlock>
        <p>
          For a deeper custom surface, compose <code>usePhoneInput</code>,
          <code>PhoneInputProvider</code>, <code>PhoneInputRoot</code>,
          <code>PhoneInputCountrySelector</code>, <code>PhoneInputInput</code>,
          <code>PhoneInputExtensionInput</code>, and
          <code>PhoneInputValidationMessage</code>. These primitives share the same
          phone controller; custom UI must not introduce a second parser, formatter, or
          country table.
        </p>
      </Section>

      <Section id="forms" title="Forms: React Hook Form and Zod">
        <h3>React Hook Form</h3>
        <CodeBlock>{rhfExample}</CodeBlock>
        <p>
          The adapter delegates ownership to React Hook Form Controller. Dirty and
          touched state follow Controller semantics; <code>reset()</code> reconciles
          controlled values without callback loops; async <code>defaultValues</code> are
          supported by React Hook Form; and the forwarded field ref lets normal
          focus-on-error behavior focus the phone input. Bind <code>extensionName</code>{' '}
          when number and extension must remain independently addressable form fields.
        </p>

        <h3>Zod</h3>
        <CodeBlock>{zodExample}</CodeBlock>
        <p>
          Choose the schema whose policy matches the product. Possible and strict-valid
          are deliberately distinct. Number-type schemas require explicit allowed types.
          Extension schemas can impose a product max length and required policy without
          embedding the extension in Phone Value.
        </p>

        <h3>Server composition</h3>
        <CodeBlock>{serverCompositionExample}</CodeBlock>
        <p>
          Zod validates the transport/form shape; the server helper exposes the same
          phone validation semantics for policy checks, APIs, jobs, and server actions.
          Keep both layers on the same metadata preset when a consumer selects a
          non-default preset.
        </p>
      </Section>

      <Section id="ssr-security" title="SSR, privacy, and security">
        <CodeBlock>{nextExample}</CodeBlock>
        <p>
          The main and React Hook Form entrypoints are client boundaries. The
          <code>/server</code> entrypoint is deterministic and contains no React, MUI,
          Emotion, DOM, browser globals, or Node-only runtime dependency. The package's
          packed Next.js evidence compares server HTML with hydrated state for empty,
          geographic, unresolved, and non-geographic cases.
        </p>
        <p>
          Keep locale, metadata, selected country, and controlled initial values
          deterministic across server render and first client render. Do not derive them
          from browser-only geolocation, timezone, or mutable storage during hydration.
        </p>
        <p>
          Phone numbers are personal data. Do not log raw Phone Values, extensions,
          clipboard contents, or change-detail payloads by default. Redact or hash only
          under a documented product policy. Structural validation is input validation,
          not proof that a user owns or can receive messages at the number.
        </p>
      </Section>

      <Section id="metadata" title="Metadata presets and freshness">
        <CodeBlock>{metadataExample}</CodeBlock>
        <div className="docs-grid">
          <div className="docs-card">
            <h3>max — default</h3>
            <p>
              Information-complete metadata with strict-pattern and number-type data.
            </p>
          </div>
          <div className="docs-card">
            <h3>min</h3>
            <p>Smaller metadata with reduced strict-pattern/type information.</p>
          </div>
          <div className="docs-card">
            <h3>mobile</h3>
            <p>
              Complete mobile patterns with intentionally reduced non-mobile type
              coverage.
            </p>
          </div>
          <div className="docs-card">
            <h3>custom</h3>
            <p>Validated metadata generated by official libphonenumber tooling.</p>
          </div>
        </div>
        <p>
          Stale metadata can misclassify a new real range as strictly invalid, change
          shared-code country resolution, omit a type, or expose an outdated example.
          Possibility can also change when national length rules change. The weekly
          freshness workflow generates a golden-corpus semantic diff for possibility,
          validity, resolved/possible countries, type, and examples. Semantic changes
          require human review and a changeset; they never auto-merge.
        </p>
        <p>
          Roll back unsafe metadata by restoring the previously reviewed exact
          <code>libphonenumber-js</code> version and regenerating the semantic snapshot.
          Never patch a stale release with a local country or calling-code table.
        </p>
      </Section>

      <Section id="performance" title="Performance budgets and selector calibration">
        <p>
          The approved package budget measures the packed main entry as a Vite 8
          Oxc-minified ESM closure with runtime dependencies bundled and declared peers
          plus libphonenumber metadata external. Its current limit is{' '}
          <strong>32,768 bytes gzip</strong>; the recorded measurement is{' '}
          <strong>32,719 bytes gzip</strong>. The neutral server entry budget is{' '}
          <strong>10,240 bytes gzip</strong>; the recorded measurement is{' '}
          <strong>6,126 bytes gzip</strong>. These are engineering budgets, not claims
          about an application's final bundle.
        </p>
        <p>
          Selector calibration uses a separate browser interaction methodology. The
          normal 50-result path stays inside its 200 ms responsiveness envelope across
          the three tested browser engines; the all-245-country stress case is
          intentionally not the default. Recalibrate before changing the result bound or
          adding virtualization.
        </p>
      </Section>

      <Section id="accessibility" title="Accessibility contract">
        <p>
          The automated contract targets WCAG 2.2 AA. Repository browser suites exercise
          accessible field naming and error association, selector search/listbox/dialog
          semantics, active options, keyboard navigation, Escape/Tab behavior, focus
          containment and return, responsive presentation, RTL cases, 200% zoom/reflow,
          forced colors, reduced motion, and axe checks in Chromium, Firefox, and
          WebKit.
        </p>
        <p>
          Custom slots must preserve every package-provided accessibility prop and
          handler. Spread prepared slot props onto the correct semantic element, forward
          the ref, and add presentation without replacing <code>role</code>,{' '}
          <code>id</code>,<code>aria-*</code>, keyboard handlers, or focus behavior. A
          visually correct slot that drops those props is unsupported.
        </p>
        <p>
          Automated browser coverage does not substitute for physical
          assistive-technology use. Physical iOS/Android and desktop screen-reader rows
          unavailable in the current device lab were accepted as explicit RC residual
          gaps and remain documented as unavailable rather than passed.
        </p>
      </Section>

      <Section id="provenance" title="Package provenance and release boundary">
        <p>
          The package manifest declares the canonical GitHub repository, MIT license,
          public npm access, and npm provenance. Runtime numbering semantics come only
          from
          <code>libphonenumber-js</code>; donor implementations remain provenance-backed
          references rather than hidden production authorities. Inspect
          <a href="https://github.com/wh1teee/mui-phone-input"> the repository</a>,
          <code>DONORS.md</code>, <code>THIRD_PARTY_NOTICES.md</code>, and the package
          manifest when auditing an artifact.
        </p>
        <p>
          Published release candidates use the npm <code>next</code> dist-tag with
          provenance and immutable release evidence. Documentation follows current
          source, while the registry remains authoritative for the exact published RC.
          Stable <code>1.0</code> is a separate promotion after final consumer
          validation; publishing an RC does not move the stable dist-tag.
        </p>
      </Section>
    </DocsShell>
  );
}
