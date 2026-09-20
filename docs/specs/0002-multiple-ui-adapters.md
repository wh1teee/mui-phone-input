# Phone input with multiple UI adapters

Status: Accepted

## Problem

The same application family now has MUI operator surfaces and shadcn/Base UI
customer surfaces. The phone library must support both without downloading or
requiring the unused UI renderer, and without introducing a second phone engine.

## Solution

Implement [ADR 0007](../adr/0007-share-phone-state-across-independent-ui-adapters.md).
Preserve existing imports and behavior. Add an independent headless controller
entrypoint, a searchable Base UI country selector, a complete phone/extension
field and an opt-in shadcn stylesheet. Reuse existing locale and flag facilities.
Allow product-owned fields to consume the same controller and country selector.

## User stories and acceptance

- An existing MUI consumer keeps its imports, values, theming and callbacks.
- A Base UI consumer installs only React, Base UI and the phone package, including
  when TypeScript checks dependency declarations without `skipLibCheck`.
- A shadcn consumer uses semantic theme variables with no Tailwind scanning setup
  or accidental global reset. Styling is opt-in and scoped to phone slots.
- A user can search by localized/English country name, ISO code or calling code;
  navigate by keyboard; dismiss with Escape; and return to the correct control.
- Disabled/read-only input and selector cannot mutate values. National typing,
  international paste, mid-string editing, composition, clear and externally
  controlled reset use the same phone-state contract as MUI.
- Shared calling codes preserve explicit compatible country selection. Non-
  geographic plans remain neutral instead of displaying an invented flag.
- Labels, errors, helper text, native input refs, autofill and optional extensions
  remain accessible. Digits are LTR even when field chrome is RTL.
- A product can render the popup in its own themed portal container and keep its
  current field API and validation policy. PayAtTable customer rendering must not
  depend on MUI/Emotion or duplicate `AsYouType` state management.

## Implementation boundaries

The controller owns normalized `PhoneValue` (`undefined` when empty), display,
caret, metadata, validation and transactions. Base UI owns combobox interaction.
Product wrappers translate their empty-string form convention at the boundary.
Optional peers are enforced by isolated packed consumers, not just source greps.
Existing `/react-hook-form` is the MUI adapter; `/base-ui/react-hook-form` is the
Base UI adapter and `/shadcn/react-hook-form` is its explicit alias.

## Testing

Keep the existing engine/unit/MUI/browser suites. Add real-browser parity cases,
country search and focus tests, immutable controls, native refs, extension,
validation/SSR and scoped-portal cases. Add a packed no-MUI/no-Emotion consumer
with runtime and strict declaration checks. Check shadcn layout on narrow screens
and keyboard/reduced-motion behavior. Exercise the actual PayAtTable wrapper.

## Out of scope

No new phone masks, metadata authority, business validation policy, design system,
new npm identity, Radix dependency, automatic geo-IP lookup, remote flag service,
agent delegation or operator UI migration. Release publication must retain the
existing trusted-publishing and verification requirements.

## Execution

Beads is the execution/status authority. This document is the accepted contract,
not a second task tracker. Owner approval for the design and implementation was
provided in the originating request; design ambiguities were resolved against
the current code and primary sources rather than requiring a user interview.

