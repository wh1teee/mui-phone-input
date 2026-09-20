# ADR 0007: Share phone state across independent UI adapters

Status: Accepted

## Context

PayAtTable uses shadcn/Base UI for customer surfaces and Material UI for operators.
The current root export, composable primitives and locale declaration graph assume
MUI. Reimplementing phone editing in the application loses the existing caret,
composition, paste, country-selection and validation contracts.

## Decision

Keep the owner-approved package identity `@wh1teee/mui-phone-input` and the existing
root/MUI API. Add explicit `/mui`, `/headless`, `/base-ui`, and `/shadcn` entrypoints.
`/mui` aliases the legacy root. `/shadcn` uses the Base UI composition, with an
explicit, opt-in `/shadcn.css` stylesheet using semantic shadcn variables. It does
not introduce Radix, a Tailwind runtime, generated country masks or another phone
engine. Applications with owned fields can compose `usePhoneInput` with the Base
UI country selector rather than replacing their design system.

`usePhoneInput`, Maskito transactions, libphonenumber metadata, country selection,
validation and extension parsing remain the only phone-state authorities. An
adapter owns rendering, accessible names and popup presentation, not phone logic.
Base UI Combobox owns search-input/listbox interaction, keyboard navigation,
positioning and dismissal. Localized country filtering uses our shared authority.

MUI, Emotion and Base UI are optional peers, required only by the selected adapter.
Headless and Base UI JavaScript **and declarations** must resolve without MUI or
Emotion. The legacy MUI path must continue working without Base UI. Locales must
not depend on renderer-specific types. This is checked against packed artifacts,
not inferred from tree-shaking. React Hook Form remains an optional adapter.

The popup accepts a portal container and direction so an embedded customer scope
can retain its theme without affecting an operator host. Phone digits remain LTR
inside RTL fields. No flag network requests occur by default.

## Alternatives

A hard rename would impose a second identity/release migration on existing users
without improving isolation. Separate independently versioned packages would
multiply release and parity work. Both remain possible at an explicitly planned
major release; neither is necessary for the current consumer outcome. Copying a
third-party phone widget would replace already verified behavior and is rejected.

## Sources inspected

- Base UI 1.8.0 Combobox declarations and [documentation](https://base-ui.com/react/components/combobox): input-inside-popup, filterable selection and focus restoration.
- [shadcn Base UI Combobox](https://ui.shadcn.com/docs/components/base/combobox): renderer composition and semantic styling.
- [react-international-phone headless hook](https://react-international-phone.vercel.app/docs/Advanced-Usage/usePhoneInput): separate display/canonical values and input-ref ownership.
- [ReUI Base phone input](https://reui.io/docs/components/base/phone-input): UI adapter over a shared phone library; no implementation source copied.
- [npm optional peers](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#peerdependenciesmeta) and [Node subpath exports](https://nodejs.org/api/packages.html#subpath-exports): explicit dependency/entrypoint boundaries.

The documentation was checked on 2026-09-21. Installed pinned declarations govern
implementation; upstream examples are design evidence, not copied source.

