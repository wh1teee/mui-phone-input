import type { CorpusScenario } from './types';
import { DESKTOP_BROWSER_MATRIX } from './types';

const inputScenario = (
  scenario: Omit<CorpusScenario, 'area' | 'browsers'> &
    Partial<Pick<CorpusScenario, 'browsers'>>,
): CorpusScenario => ({
  ...scenario,
  area: scenario.id.startsWith('number.') ? 'numbering-plan' : 'input-transaction',
  browsers: scenario.browsers ?? DESKTOP_BROWSER_MATRIX,
});

export const INPUT_TRANSACTION_CORPUS = [
  inputScenario({
    id: 'input.insert.start',
    title: 'Insert a digit at the start of an existing formatted value',
    tags: ['insert', 'selection', 'start'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Set +375 29 123 45 67', 'Place caret after +', 'Insert 1'],
    assertions: [
      'Canonical digits are normalized',
      'Selection remains after inserted digit',
    ],
  }),
  inputScenario({
    id: 'input.insert.middle',
    title: 'Insert a digit in the middle of a formatted value',
    tags: ['insert', 'selection', 'middle'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Set +375 29 123 45 67', 'Place caret before 123', 'Insert 8'],
    assertions: ['No adjacent digit is lost', 'Caret follows the semantic insertion'],
  }),
  inputScenario({
    id: 'input.insert.end',
    title: 'Append digits at the end',
    tags: ['insert', 'selection', 'end'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Set +375 29 123', 'Move caret to end', 'Insert 4567'],
    assertions: [
      'Canonical value includes all appended digits',
      'Display formatting is deterministic',
    ],
  }),
  inputScenario({
    id: 'input.clear.complete',
    title: 'Clear the complete value to the empty Phone Value state',
    tags: ['delete', 'empty-value', 'callback'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Set +1 202 555 0123', 'Select the complete display', 'Press Backspace'],
    assertions: [
      'Canonical value becomes undefined',
      'Exactly one public callback is emitted',
      'Display becomes empty',
    ],
  }),
  inputScenario({
    id: 'input.delete.backspace-separator',
    title: 'Backspace next to a formatting separator',
    tags: ['delete', 'backspace', 'separator'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Set +375 29 123 45 67', 'Place caret after separator', 'Press Backspace'],
    assertions: [
      'Exactly one semantic digit is removed',
      'Caret stays within display bounds',
    ],
  }),
  inputScenario({
    id: 'input.delete.forward-separator',
    title: 'Delete next to a formatting separator',
    tags: ['delete', 'forward-delete', 'separator'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Set +375 29 123 45 67', 'Place caret before separator', 'Press Delete'],
    assertions: [
      'Exactly one semantic digit is removed',
      'Formatting does not trap the caret',
    ],
  }),
  inputScenario({
    id: 'input.range.replace',
    title: 'Replace an arbitrary selected range',
    tags: ['range-replacement', 'selection'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Set +375 29 123 45 67', 'Select 123 45', 'Insert 555'],
    assertions: [
      'Selected semantic digits are replaced once',
      'One committed transaction emits at most one callback',
    ],
  }),
  inputScenario({
    id: 'input.paste.international',
    title: 'Paste a canonical international number',
    tags: ['paste', 'international'],
    provenance: ['intl-tel-input', 'react-phone-number-input'],
    steps: ['Focus empty input', 'Paste +375291234567'],
    assertions: [
      'Canonical value is +375291234567',
      'Display is formatted without losing digits',
    ],
  }),
  inputScenario({
    id: 'input.paste.national',
    title: 'Paste a national number with selected country context',
    tags: ['paste', 'national'],
    provenance: ['libphonenumber-js', 'intl-tel-input'],
    steps: ['Select BY', 'Paste 291234567'],
    assertions: [
      'Canonical value uses +375',
      'Selected-country context remains explicit',
    ],
  }),
  inputScenario({
    id: 'input.paste.formatted',
    title: 'Paste formatted text with punctuation',
    tags: ['paste', 'formatted'],
    provenance: ['intl-tel-input', 'react-phone-number-input'],
    steps: ['Paste +1 (202) 555-0123'],
    assertions: ['Separators do not enter PhoneValue', 'All digits are preserved'],
  }),
  inputScenario({
    id: 'input.paste.calling-code',
    title: 'Paste over a fixed calling code',
    tags: ['paste', 'fixed-calling-code'],
    provenance: ['react-phone-number-input', 'intl-tel-input'],
    steps: [
      'Use international-fixed-calling-code for BY',
      'Select all display',
      'Paste +48 123 456 789',
    ],
    assertions: [
      'Policy decides replacement without duplicate calling codes',
      'Canonical and selected-country state remain coherent',
    ],
  }),
  inputScenario({
    id: 'input.autofill.full-replacement',
    title: 'Browser autofill replaces the complete value',
    tags: ['autofill', 'input-fallback', 'replacement'],
    provenance: ['christofle', 'maskito'],
    steps: ['Set an existing value', 'Dispatch browser-authoritative full replacement'],
    assertions: [
      'Input event fallback becomes authoritative',
      'No stale selection or callback loop remains',
    ],
  }),
  inputScenario({
    id: 'input.android.predictive',
    title: 'Android predictive keyboard replaces a text span',
    tags: ['android', 'predictive-input', 'input-fallback'],
    browsers: ['chromium'],
    realDeviceGate: 'android-chrome',
    provenance: ['maskito', 'react-phone-number-input'],
    steps: [
      'Enter a partial number',
      'Apply predictive replacement without trusting beforeinput',
    ],
    assertions: [
      'Authoritative input value is reconciled',
      'Digits and caret remain coherent',
    ],
  }),
  inputScenario({
    id: 'input.ime.composition',
    title: 'IME composition does not commit intermediate text',
    tags: ['ime', 'composition'],
    realDeviceGate: 'ios-safari',
    provenance: ['maskito', 'christofle'],
    steps: ['Start composition', 'Emit intermediate input', 'End composition'],
    assertions: [
      'Intermediate composition does not emit committed PhoneValue',
      'Final transaction normalizes once',
    ],
  }),
  inputScenario({
    id: 'input.unicode-digits',
    title: 'Unicode decimal digits normalize predictably',
    tags: ['unicode-digits', 'normalization'],
    provenance: ['libphonenumber-js', 'react-phone-number-input'],
    steps: ['Enter Arabic-Indic digits with a plus sign'],
    assertions: [
      'Policy-normalized ASCII digits form PhoneValue',
      'No separator or bidi mark enters canonical value',
    ],
  }),
  inputScenario({
    id: 'input.controlled.external-update',
    title: 'Controlled external value replaces local display state',
    tags: ['controlled', 'external-update'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Type a partial candidate', 'Parent supplies a different PhoneValue'],
    assertions: [
      'Display and selection reconcile to the external value',
      'No onChange callback is emitted for reconciliation',
    ],
  }),
  inputScenario({
    id: 'input.controlled.idempotent',
    title: 'Repeated external value is idempotent',
    tags: ['controlled', 'idempotence'],
    provenance: ['react-phone-number-input'],
    steps: ['Supply the same external PhoneValue repeatedly'],
    assertions: ['Display does not churn', 'No callback loop is produced'],
  }),
  inputScenario({
    id: 'input.context.locale-change',
    title: 'Locale change preserves canonical value',
    tags: ['locale-change', 'canonical-invariant'],
    provenance: ['libphonenumber-js', 'react-international-phone'],
    steps: ['Set a canonical value', 'Change locale'],
    assertions: [
      'PhoneValue is unchanged',
      'Only localized labels/display policy may change',
    ],
  }),
  inputScenario({
    id: 'input.context.mask-change',
    title: 'Display-mask change preserves canonical value',
    tags: ['mask-change', 'canonical-invariant'],
    provenance: ['imask', 'react-international-phone'],
    steps: ['Set a canonical value', 'Replace display mask strategy'],
    assertions: [
      'PhoneValue is unchanged',
      'Selection maps to a valid display position',
    ],
  }),
  inputScenario({
    id: 'input.context.country-change',
    title: 'Selected-country change follows explicit calling-code policy',
    tags: ['country-change', 'selected-country'],
    provenance: ['intl-tel-input', 'christofle'],
    steps: ['Set a partial candidate', 'Choose another country'],
    assertions: [
      'Canonical candidate follows declared replacement policy',
      'Country selection is not confused with detection',
    ],
  }),
  inputScenario({
    id: 'input.fixed-calling-code',
    title: 'Fixed calling code cannot be deleted accidentally',
    tags: ['fixed-calling-code', 'delete'],
    provenance: ['react-phone-number-input', 'intl-tel-input'],
    steps: [
      'Enable international-fixed-calling-code',
      'Backspace across calling-code boundary',
    ],
    assertions: [
      'Configured calling code remains',
      'Selection does not enter an invalid position',
    ],
  }),
  inputScenario({
    id: 'input.undo-redo',
    title: 'Native undo and redo restore coherent transactions',
    tags: ['undo', 'redo'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: ['Commit two edits', 'Undo', 'Redo'],
    assertions: [
      'Canonical and display state move together',
      'Callbacks correspond to committed native history changes',
    ],
  }),
  inputScenario({
    id: 'input.strict-mode',
    title: 'React Strict Mode does not double-commit callbacks',
    tags: ['react-strict-mode', 'callback'],
    provenance: ['material-ui', 'react-phone-number-input'],
    steps: ['Mount under StrictMode', 'Commit one edit'],
    assertions: [
      'At most one public onChange is emitted',
      'Mount reconciliation is side-effect safe',
    ],
  }),
  inputScenario({
    id: 'input.mui-text-field',
    title: 'Engine works through a real MUI TextField input slot',
    tags: ['mui', 'textfield', 'ref'],
    provenance: ['material-ui', 'mui-tel-input'],
    steps: ['Mount candidate inside TextField', 'Focus, type, select, and paste'],
    assertions: [
      'Input ref and slot props remain usable',
      'MUI focus/error states remain correct',
    ],
  }),
  inputScenario({
    id: 'input.ssr-hydration',
    title: 'SSR markup hydrates without browser-global access',
    tags: ['ssr', 'hydration', 'server-safe'],
    provenance: ['material-ui', 'christofle'],
    steps: ['Render server shell', 'Hydrate in browser', 'Commit first edit'],
    assertions: [
      'No hydration mismatch occurs',
      'No DOM global is touched during server evaluation',
    ],
  }),
  inputScenario({
    id: 'input.ref-forwarding',
    title: 'Forwarded refs target the native input',
    tags: ['ref-forwarding', 'mui'],
    provenance: ['material-ui', 'mui-tel-input'],
    steps: ['Attach input ref', 'Call focus and read selection'],
    assertions: ['Ref resolves to the native input', 'Selection APIs remain available'],
  }),
  inputScenario({
    id: 'input.rhf-reset',
    title: 'React Hook Form reset returns coherent state',
    tags: ['react-hook-form', 'reset'],
    provenance: ['react-phone-number-input', 'christofle'],
    steps: ['Edit field through Controller', 'Invoke reset with default value'],
    assertions: [
      'Canonical, display, country, validation, and dirty state agree',
      'Reset emits no user-change loop',
    ],
  }),
  inputScenario({
    id: 'input.callback.single',
    title: 'One committed transaction emits at most one public callback',
    tags: ['callback', 'transaction-invariant'],
    provenance: ['maskito', 'react-phone-number-input'],
    steps: [
      'Observe callback count',
      'Commit insert, delete, paste, and composition transactions',
    ],
    assertions: [
      'Each committed transaction increments count by zero or one',
      'External reconciliation increments count by zero',
    ],
  }),
  inputScenario({
    id: 'number.shared-code.plus1',
    title: 'Shared +1 calling code does not prematurely switch country',
    tags: ['shared-calling-code', 'plus1', 'country-resolution'],
    provenance: ['libphonenumber-js', 'react-phone-input-2'],
    steps: ['Select CA', 'Enter +1 and an unresolved prefix'],
    assertions: [
      'Selected country remains explicit',
      'Detected/resolved country waits for sufficient evidence',
    ],
  }),
  inputScenario({
    id: 'number.shared-code.plus7',
    title: 'Shared +7 calling code does not prematurely switch country',
    tags: ['shared-calling-code', 'plus7', 'country-resolution'],
    provenance: ['libphonenumber-js', 'christofle'],
    steps: ['Select KZ', 'Enter +7 and an unresolved prefix'],
    assertions: [
      'No automatic RU jump occurs',
      'Possible countries remain representable',
    ],
  }),
  inputScenario({
    id: 'number.shared-code.plus44',
    title: 'Shared +44 calling code preserves unresolved plans',
    tags: ['shared-calling-code', 'plus44', 'country-resolution'],
    provenance: ['libphonenumber-js', 'intl-tel-input'],
    steps: ['Enter +44 without enough national digits'],
    assertions: [
      'No false flag is assigned',
      'Resolved country stays unknown until metadata can resolve it',
    ],
  }),
  inputScenario({
    id: 'number.non-geographic',
    title: 'Non-geographic number has no country',
    tags: ['non-geographic', 'numbering-plan', 'flags'],
    provenance: ['libphonenumber-js', 'country-flag-icons'],
    steps: ['Enter a supported non-geographic calling code'],
    assertions: [
      'Numbering plan is non-geographic',
      'Resolved country and flag are undefined',
    ],
  }),
] as const satisfies readonly CorpusScenario[];
