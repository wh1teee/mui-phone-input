# Native Country Selector Tab-order evidence

Date: 2026-08-03
Bead: `mpi-oan.34`

## Root cause

The desktop Country Selector previously rebuilt sequential focus order with a
package-owned CSS selector. That list covered common links, buttons, inputs,
selects, textareas and explicit `tabindex`, but it was not the browser focus
algorithm. It skipped native categories such as contenteditable, media
controls, details/summary, radio-group rules and shadow-root descendants.

Simply closing the popup without preventing Tab was not portable. Chromium
could continue from a no-portal search field, while Firefox moved focus to the
document body after a portaled search field was removed. A trigger-only focus
anchor had the same cross-browser limitation.

## Donor decision

The package uses `tabbable@6.5.0` as an exact runtime dependency:

- source: <https://github.com/focus-trap/tabbable>;
- revision: `7dbb9e9bf1636b02c2fc6955f0719648bb465743`;
- licence: MIT;
- inspected symbols: `tabbable`, `getCandidatesIteratively`, `getTabIndex`,
  `isNodeMatchingSelectorTabbable`, and `sortByOrder`;
- inspected tests: `test/index.js`, `test/shadow-root-utils.js`, and the donor
  fixture corpus.

No donor source is copied. The runtime supplies complete focus candidate
classification and ordering. Package code only excludes the currently open
Country Selector surface and chooses the adjacent target relative to the
trigger.

## Runtime contract

For desktop Tab and Shift+Tab:

1. calculate document order with `tabbable(document.body, { getShadowRoot:
   true })`;
2. exclude the open Popper or no-portal selector surface, including descendants
   in open shadow roots;
3. find the trigger in that ordered result;
4. close without restoring focus;
5. prevent the original Tab only when an adjacent external target exists;
6. focus that target on the next animation frame.

When no target exists, the event is not suppressed. Escape and explicit
dismissal continue restoring the trigger. Mobile Dialog Tab handling remains a
contained focus loop and does not use the desktop document-order path.

## Browser regression matrix

The exact source matrix covers:

- forward and reverse Tab from no-portal and portaled desktop selectors;
- contenteditable targets without explicit `tabindex`;
- open shadow-root buttons;
- audio and video controls;
- details/summary, links and buttons;
- explicit positive `tabIndex` order;
- native phone input with `tabIndex=-1`;
- hidden, disabled and inert controls;
- no-target behavior without `preventDefault`;
- mobile Dialog focus containment;
- Escape focus restoration;
- automated WCAG 2.2 A/AA axe checks;
- Dialog, Drawer, BottomSheet and explicit portal-container policies.

All 112 Browser Mode tests pass in Chromium, Firefox and WebKit. The unit suite
contains 93 tests.

## Packed-consumer and package proof

Production Next.js and Vite consumers install the exact generated `.tgz` and
exercise a portaled desktop selector with contenteditable targets before and
after the trigger while the phone input is excluded with `tabIndex=-1`.
Latest React 19.2/MUI 9.2 and minimum React 19.0/MUI 9.0 matrices pass.

The package verifier requires:

- exact `tabbable: 6.5.0` published metadata;
- a client-only `tabbable` import;
- no `tabbable` import in the neutral server entry;
- `THIRD_PARTY_NOTICES.md` in the tarball;
- `publint`, ATTW and publish dry-run success.

Current exact-artifact budgets pass:

- main closure: 22,281 bytes gzip;
- neutral server entry: 4,794 bytes gzip;
- packed tarball: 85,194 bytes.

Closed shadow roots cannot be discovered without a consumer-owned callback and
are not claimed. Open shadow roots are covered by the automated matrix.

