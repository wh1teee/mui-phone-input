# Controller-owned MUI slot boundary evidence

Date: 2026-08-03
Bead: `mpi-oan.49`

## Root cause

`MuiPhoneInput` prepared canonical native-input props through
`usePhoneInput.getInputProps()`, removed the controller ref, and then called
MUI `mergeSlotProps(slotProps.htmlInput, preparedProps)`. MUI 9 intentionally
gives the external slot object precedence for ordinary keys. A consumer could
therefore replace `value`, `id`, required/read-only/disabled state, validation
ARIA and helper relationships after the phone controller had resolved them.

The exact `defaultValue="+1"` plus `slotProps.htmlInput.value="+44"`
reproduction threw `RangeError: Input Transaction reconciliation selection is
outside the display value`, because the DOM and controller reconciled different
strings. Independent helper/input ID overrides also left label, description and
error relationships inconsistent.

## Ownership boundary

The MUI adapter now resolves object- or function-valued `htmlInput` slot props,
then routes the resulting safe customization through the existing public
`getInputProps` boundary. That getter:

- composes external blur, composition, input, capture and paste handlers before
  the controller behavior;
- preserves classes, styles, `sx`, data attributes, autocomplete, input mode,
  descriptions and other native customization;
- normalizes and deduplicates `aria-describedby` tokens;
- applies controller-owned value, ID, disabled/read-only/required state,
  validation ARIA and data state last.

Native `defaultValue` and `onChange` from the low-level slot are discarded;
canonical edits remain owned by the Phone Value transaction and `onInput`
pipeline. The consumer slot ref remains attached while `inputRef` independently
connects the controller and public component ref.

`formHelperText` slot props retain the MUI handler/class/style/ref merge, then
seal the controller helper ID and polite live-region contract. The rendered
helper ID therefore always matches `aria-describedby` and
`aria-errormessage`.

## Source-browser proof

The real MUI browser matrix covers:

- malicious `value="+44"` against canonical uncontrolled and controlled `+1`;
- malicious native input/helper IDs;
- false disabled, read-only, required and `aria-invalid` overrides;
- duplicate consumer/helper description tokens;
- custom `htmlInput` and `formHelperText` components;
- component, native-slot and helper-slot refs;
- consumer classes and one composed `onInput` callback;
- object- and function-valued MUI slot props;
- label, helper, description and error-message identity;
- persistent MUI `helperText` composed with consumer descriptions outside the
  validation-error path;
- automated WCAG 2.2 A/AA axe results.

The exact suite passes 93 unit tests and 115 Browser Mode tests in Chromium,
Firefox and WebKit. The three-engine product proof uses serialized browser files
while the canonical test-runner serialization gap is tracked separately by
`mpi-cgl`; no product assertion or timeout was weakened.

## Exact package proof

Production Next.js and Vite consumers install the generated `.tgz`, supply
malicious input/helper slot values and prove:

- DOM value remains `+1`, then safely commits `+12`;
- controller input/helper IDs remain authoritative;
- required and validation ARIA remain coherent;
- consumer description tokens compose with the actual helper ID;
- the consumer `onInput` handler runs exactly once;
- no reconciliation crash or render loss occurs.

Latest React 19.2/MUI 9.2 and minimum React 19.0/MUI 9.0 matrices pass.
Package, neutral-server, `publint`, ATTW, source-map and publish dry-run gates
remain unchanged.

Current exact-artifact budgets pass:

- main closure: 22,452 bytes gzip;
- neutral server entry: 4,794 bytes gzip;
- packed tarball: 85,988 bytes.

