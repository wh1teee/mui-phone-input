import { CodeBlock, DocsShell, ReleaseStatus, Section } from '../docs-ui';

const targetShape = `type ContactPhone = {
  phone: PhoneValue;
  extension: PhoneExtension;
  selectedCountry: CountryCode | null; // only when product state needs it
};

<MuiPhoneInput
  value={contact.phone}
  extension={contact.extension}
  selectedCountry={contact.selectedCountry}
  onChange={(phone) => update({ phone })}
  onExtensionChange={(extension) => update({ extension })}
  onCountryChange={(selectedCountry) => update({ selectedCountry })}
/>;`;

const validationMigration = `// Replace a legacy boolean validator with an explicit product policy.
const result = validatePhoneValue(phone); // possible-by-default

const strict = validatePhoneValue(phone, { validationMode: 'valid' });

const mobileOnly = validatePhoneValue(phone, {
  validationMode: 'possible-and-type',
  allowedNumberTypes: ['MOBILE', 'FIXED_LINE_OR_MOBILE'],
});

// None of these checks proves reachability or ownership.`;

const countryMigration = `// Preserve explicit country intent as state; never derive a new country table.
const plan = resolveNumberingPlan(phone, { selectedCountry });

switch (plan.kind) {
  case 'geographic':
    useCountry(plan.resolvedCountry);
    break;
  case 'unresolved':
    showAmbiguousState(plan.possibleCountries);
    break;
  case 'non-geographic':
    showGlobalNumber();
    break;
}`;

const serverMigration = `// Server Component, route handler, server action, worker, or API service.
import {
  parseNationalPhoneValue,
  resolveNumberingPlan,
  validatePhoneValue,
} from '@wh1teee/mui-phone-input/server';

const value = parseNationalPhoneValue(input, country);
if (value === null || !validatePhoneValue(value).accepted) {
  return { ok: false };
}

return { ok: true, plan: resolveNumberingPlan(value, { selectedCountry: country }) };`;

const christofleMapping = `// Before: global utils/manual table/direct DOM mutation are separate authorities.
// window.intlTelInputUtils(...)
// COUNTRIES.find(...)
// input.value = nextValue
// input.setSelectionRange(...)

// After: one package controller owns phone transactions and caret behavior.
const phone = usePhoneInput({ value, selectedCountry, onChange });

<PhoneInputProvider value={phone}>
  <PhoneInputRoot>
    <PhoneInputCountrySelector portalContainer={modalContainer} />
    <PhoneInputInput />
    <PhoneInputValidationMessage />
  </PhoneInputRoot>
</PhoneInputProvider>;`;

export default function MigrationPage() {
  return (
    <DocsShell>
      <div className="docs-hero">
        <p className="docs-kicker">Migration</p>
        <h1>Replace legacy APIs without preserving legacy authority</h1>
        <p>
          Treat migration as a state-model change, not a prop-for-prop rename. Move
          phone semantics to the package, keep product-specific state explicit, then
          re-create presentation through MUI theme, slots, and form adapters.
        </p>
      </div>

      <ReleaseStatus />

      <Section id="migration-target" title="Canonical target model">
        <CodeBlock>{targetShape}</CodeBlock>
        <p>
          Store a canonical Phone Value and, when needed, a separate Phone Extension.
          Store selected country only when the product has explicit country intent. Do
          not store a formatted display string as canonical state, infer country from UI
          flags, or embed an extension in the phone number.
        </p>
      </Section>

      <Section id="migration-matrix" title="Cross-library migration matrix">
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Legacy concern</th>
                <th>Common donor-style shape</th>
                <th>MUI Phone Input target</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Value ownership</td>
                <td>
                  Formatted string, national string, or library-specific callback
                  payload.
                </td>
                <td>
                  <code>PhoneValue</code> in <code>value</code>/<code>onChange</code>,
                  while display stays derived.
                </td>
              </tr>
              <tr>
                <td>Country state</td>
                <td>
                  One <code>country</code> field mixing user choice and inferred result.
                </td>
                <td>
                  Keep <code>selectedCountry</code>, <code>detectedCountry</code>,{' '}
                  <code>resolvedCountry</code>, and <code>possibleCountries</code>{' '}
                  distinct.
                </td>
              </tr>
              <tr>
                <td>Validation</td>
                <td>
                  Single <code>isValid</code> boolean or callback.
                </td>
                <td>
                  <code>validatePhoneValue</code> with explicit possible, valid, or
                  possible-and-type policy.
                </td>
              </tr>
              <tr>
                <td>Masks/format</td>
                <td>Mask doubles as parser or numbering rule.</td>
                <td>
                  Automatic display, <code>displayMask</code>, or{' '}
                  <code>formatStrategy</code>; none may change canonical digits.
                </td>
              </tr>
              <tr>
                <td>Selector</td>
                <td>
                  Custom country arrays, dropdown globals, or duplicated modal selector.
                </td>
                <td>
                  Authority-backed <code>PhoneInputCountrySelector</code> with search,
                  preferred countries, Popper/Dialog, and semantic slots.
                </td>
              </tr>
              <tr>
                <td>Extensions</td>
                <td>Extension embedded in the number string or ignored.</td>
                <td>
                  Independent <code>PhoneExtension</code> state; RFC 3966 only at
                  import/export boundaries.
                </td>
              </tr>
              <tr>
                <td>Flags</td>
                <td>
                  Remote sprite/CDN is mandatory or country flag encodes selected state.
                </td>
                <td>
                  Local SVG default; external, emoji, none, or custom provider are
                  presentation choices.
                </td>
              </tr>
              <tr>
                <td>Forms</td>
                <td>Wrapper-specific hidden inputs or manual touched/dirty bridges.</td>
                <td>
                  Core stays form-agnostic; use <code>/react-hook-form</code> for
                  Controller ownership and <code>/zod</code> for schemas.
                </td>
              </tr>
              <tr>
                <td>Server validation</td>
                <td>Browser bundle reused on the server or a second backend parser.</td>
                <td>
                  Use <code>/server</code>; keep React/MUI/DOM out of the server graph.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="react-phone-number-input"
        title="From react-phone-number-input style APIs"
      >
        <p>
          Preserve the useful controlled-value pattern, but make the target state
          explicitly
          <code>PhoneValue</code>. Replace donor formatting/country interpretation with
          the package's controller and numbering-plan result. Keep country selection
          controlled only when the surrounding product owns that choice.
        </p>
        <ul>
          <li>
            Value: normalize once at the migration boundary, then store Phone Value.
          </li>
          <li>
            Country: map explicit product country state to <code>selectedCountry</code>{' '}
            or <code>defaultCountry</code>.
          </li>
          <li>
            Validation: move to <code>validatePhoneValue</code> or a Zod schema; do not
            treat strict validity as the default.
          </li>
          <li>
            Input formatting: use <code>displayMode</code>, <code>displayMask</code>, or
            the automatic formatter.
          </li>
          <li>
            Server: replace client-library imports with{' '}
            <code>@wh1teee/mui-phone-input/server</code>.
          </li>
        </ul>
      </Section>

      <Section id="intl-tel-input" title="From intl-tel-input style APIs">
        <p>
          Remove global utility scripts and plugin-instance state. Move phone and
          country state into React, render the built-in selector, and call pure server
          helpers on non-React surfaces. Do not retain a hidden <code>window</code>{' '}
          utility as fallback authority.
        </p>
        <ul>
          <li>
            Replace plugin lifecycle methods with controlled props or{' '}
            <code>usePhoneInput</code> actions.
          </li>
          <li>
            Replace global country/number helpers with <code>resolveNumberingPlan</code>{' '}
            and <code>validatePhoneValue</code>.
          </li>
          <li>
            Replace external flag assets with the local SVG default unless policy
            explicitly allows remote assets.
          </li>
          <li>
            Replace dropdown globals with selector <code>slots</code>/
            <code>slotProps</code> and explicit portal configuration.
          </li>
        </ul>
      </Section>

      <Section
        id="react-international-phone"
        title="From react-international-phone style APIs"
      >
        <p>
          Keep composable UI where it benefits the product, but route it through the
          package primitives instead of keeping a parallel parser/mask/controller.
          Migrate masks to Display Masks only when they are presentation-only; use
          automatic formatting for numbering-aware defaults.
        </p>
        <ul>
          <li>
            Headless composition → <code>usePhoneInput</code> plus package primitives.
          </li>
          <li>
            Mask tables → bounded <code>displayMask</code> rules or automatic
            formatting, never country authority.
          </li>
          <li>
            Country dropdown → <code>PhoneInputCountrySelector</code> or its semantic
            slots.
          </li>
          <li>
            Country flag renderer → <code>flagProvider</code>.
          </li>
        </ul>
      </Section>

      <Section
        id="mui-tel-input"
        title="From mui-tel-input / react-phone-input-material-ui style APIs"
      >
        <p>
          Keep MUI TextField ergonomics, but migrate customization to the native
          <code>MuiPhoneInput</code> theme registration, utility classes, and slots.
          Avoid a wrapper that merely remaps every legacy prop; that keeps two public
          APIs alive and makes MUI upgrades harder.
        </p>
        <ul>
          <li>TextField props continue through the component's MUI surface.</li>
          <li>
            Global styling → <code>components.MuiPhoneInput.defaultProps</code>,{' '}
            <code>styleOverrides</code>, and slot variants.
          </li>
          <li>
            Per-field customization → <code>slots</code>/<code>slotProps</code>.
          </li>
          <li>
            Validation callback → explicit package validation policy; ownership
            verification remains outside the field.
          </li>
        </ul>
      </Section>

      <Section id="react-phone-input-2" title="From react-phone-input-2 style APIs">
        <p>
          Do not migrate the legacy country table, calling-code table, per-country mask
          table, or country guessing rules. Those structures are specifically rejected
          as parallel numbering authority.
        </p>
        <ul>
          <li>
            Country/calling-code arrays → remove; the package derives them from{' '}
            <code>libphonenumber-js</code>.
          </li>
          <li>
            Mask configuration → retain only presentation requirements that can be
            expressed as Display Masks.
          </li>
          <li>
            Dropdown configuration → map product presentation to selector props/slots,
            not copied country data.
          </li>
          <li>
            Value string → normalize to Phone Value at the boundary, then keep canonical
            state.
          </li>
        </ul>
      </Section>

      <Section id="validation-migration" title="Validation migration">
        <CodeBlock>{validationMigration}</CodeBlock>
        <p>
          A legacy <code>isValid</code> function often mixes syntax, numbering metadata,
          business policy, and deliverability. Split those concerns. The field owns
          structural metadata validation; the application owns product policy; an OTP or
          verification service owns reachability/possession proof.
        </p>
      </Section>

      <Section id="country-migration" title="Country-state migration">
        <CodeBlock>{countryMigration}</CodeBlock>
        <p>
          This distinction matters for shared calling codes and non-geographic ranges.
          Do not turn a temporary selection or a flag into proof that the current digits
          belong to one country.
        </p>
      </Section>

      <Section id="christofle" title="Christofle-style account and checkout fields">
        <p>
          The inspected Christofle account family used a global
          <code>window.intlTelInputUtils</code> script plus direct value/selection
          mutation. The checkout family carried a manual <code>COUNTRIES</code> table
          and duplicated country/validation semantics. Migrate both families to the same
          package authority; do not keep either implementation as a compatibility
          fallback.
        </p>
        <CodeBlock>{christofleMapping}</CodeBlock>
        <div className="docs-table-wrap">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Christofle behavior</th>
                <th>Migration target</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Address country and phone country synchronization</td>
                <td>
                  Keep address-country policy in the application; pass explicit selected
                  country and handle <code>onCountryChange</code>. Do not equate
                  detected and selected state.
                </td>
              </tr>
              <tr>
                <td>Localized example placeholder</td>
                <td>
                  Generate examples from the selected metadata policy; do not load a
                  global utils script.
                </td>
              </tr>
              <tr>
                <td>Unified checkout appearance</td>
                <td>
                  Recreate through <code>components.MuiPhoneInput</code>, utility
                  classes, slots, and normal MUI state styling.
                </td>
              </tr>
              <tr>
                <td>Selector inside checkout modal</td>
                <td>
                  Use the package selector with explicit <code>portalContainer</code> or{' '}
                  <code>disablePortal</code> when the modal topology requires it.
                </td>
              </tr>
              <tr>
                <td>Direct DOM caret/value mutation</td>
                <td>
                  Remove it. The package transaction engine owns canonical edits and
                  semantic caret preservation.
                </td>
              </tr>
              <tr>
                <td>Manual country/calling-code table</td>
                <td>
                  Delete it after all consumers use package resolution. No shadow
                  fallback table remains.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="forms-migration" title="Forms and extensions">
        <p>
          For React Hook Form, replace manual Controller glue with
          <code>MuiPhoneInputController</code>. Give the phone and extension separate
          field names when both are stored. This preserves Controller
          dirty/touched/reset/ref behavior and lets ordinary focus-on-error target the
          native phone input.
        </p>
        <p>
          For Zod, replace ad-hoc regexes with the schema factory matching your product
          policy. Do not use one regex for international numbering semantics. Keep
          extension validation separate and combine number plus extension into RFC 3966
          only when a protocol boundary needs a <code>tel:</code> URI.
        </p>
      </Section>

      <Section id="server-migration" title="Server migration">
        <CodeBlock>{serverMigration}</CodeBlock>
        <p>
          Do not import the client entrypoint from a Server Component, route handler,
          worker, or backend validation module. The <code>/server</code> subpath exists
          to keep React, Material UI, Emotion, Maskito, and DOM concerns out of that
          graph.
        </p>
      </Section>

      <Section id="migration-checklist" title="Cutover checklist">
        <ol>
          <li>
            Inventory every legacy phone value, extension, country, mask, validator,
            selector, flag, form adapter, and server helper.
          </li>
          <li>
            Choose one canonical Phone Value persistence shape and migrate boundary
            normalization first.
          </li>
          <li>
            Move country semantics to selected/detected/resolved/possible states without
            copying donor tables.
          </li>
          <li>
            Move validation to explicit possible/valid/type policy and keep ownership
            verification separate.
          </li>
          <li>
            Move formatting, selector, flags, and MUI appearance to package props,
            theme, slots, or primitives.
          </li>
          <li>
            Move forms to official RHF/Zod adapters where applicable and keep extension
            state independent.
          </li>
          <li>
            Move server consumers to <code>/server</code>.
          </li>
          <li>
            Delete global utilities, manual country/calling-code tables, direct DOM
            mutation, and shadow validators after parity tests pass.
          </li>
          <li>
            Run the package consumer, SSR/hydration, accessibility, and product-specific
            regression gates before removing the old field.
          </li>
        </ol>
        <p>
          The library repository does not ship backward-compatible adapters for donor
          APIs or perform an automatic Christofle migration. Product repositories should
          make an explicit, testable cutover instead of turning legacy behavior into
          permanent core API.
        </p>
      </Section>
    </DocsShell>
  );
}
