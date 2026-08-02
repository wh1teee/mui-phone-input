export type InputTransactionCommand =
  | Readonly<{ kind: 'insert'; text: string }>
  | Readonly<{ kind: 'backspace' }>
  | Readonly<{ kind: 'delete' }>
  | Readonly<{ kind: 'replace-range'; text: string }>
  | Readonly<{ kind: 'paste'; text: string }>
  | Readonly<{ kind: 'autofill'; text: string }>
  | Readonly<{ kind: 'composition'; text: string }>
  | Readonly<{ kind: 'external-update'; value: `+${string}` | undefined }>
  | Readonly<{ kind: 'change-country'; country: string | undefined }>
  | Readonly<{ kind: 'change-locale'; locale: string }>
  | Readonly<{ kind: 'change-mask'; strategy: string }>
  | Readonly<{ kind: 'undo' }>
  | Readonly<{ kind: 'redo' }>
  | Readonly<{ kind: 'reset'; value: `+${string}` | undefined }>;

export const INPUT_TRANSACTION_COMMAND_KINDS = [
  'insert',
  'backspace',
  'delete',
  'replace-range',
  'paste',
  'autofill',
  'composition',
  'external-update',
  'change-country',
  'change-locale',
  'change-mask',
  'undo',
  'redo',
  'reset',
] as const satisfies readonly InputTransactionCommand['kind'][];

export const INPUT_TRANSACTION_INVARIANTS = [
  {
    id: 'canonical-normalized',
    statement:
      'PhoneValue is undefined for empty or a leading plus followed only by ASCII digits.',
    scenarios: ['input.paste.formatted', 'input.unicode-digits'],
  },
  {
    id: 'selection-bounded',
    statement:
      'Selection start and end always remain within the current display string.',
    scenarios: [
      'input.insert.middle',
      'input.delete.backspace-separator',
      'input.context.mask-change',
    ],
  },
  {
    id: 'single-callback',
    statement:
      'One committed Input Transaction emits at most one public onChange callback.',
    scenarios: ['input.callback.single', 'input.strict-mode'],
  },
  {
    id: 'external-no-loop',
    statement: 'External controlled reconciliation emits no user-change callback loop.',
    scenarios: ['input.controlled.external-update', 'input.controlled.idempotent'],
  },
  {
    id: 'format-parse-digits',
    statement: 'Formatting and parsing preserve the canonical digit sequence.',
    scenarios: ['input.paste.international', 'input.context.mask-change'],
  },
  {
    id: 'external-idempotent',
    statement: 'Applying the same external PhoneValue repeatedly is idempotent.',
    scenarios: ['input.controlled.idempotent'],
  },
  {
    id: 'shared-code-no-premature-jump',
    statement:
      'A shared calling code does not prematurely replace selected or unresolved country state.',
    scenarios: [
      'number.shared-code.plus1',
      'number.shared-code.plus7',
      'number.shared-code.plus44',
    ],
  },
  {
    id: 'non-geographic-no-country',
    statement:
      'A non-geographic numbering plan never receives a resolved country or flag.',
    scenarios: ['number.non-geographic'],
  },
  {
    id: 'presentation-preserves-canonical',
    statement: 'Locale and display-mask changes do not change PhoneValue.',
    scenarios: ['input.context.locale-change', 'input.context.mask-change'],
  },
  {
    id: 'reset-coherent',
    statement:
      'Reset returns canonical, display, country, selection, validation, and form state to one coherent snapshot.',
    scenarios: ['input.rhf-reset'],
  },
] as const;
