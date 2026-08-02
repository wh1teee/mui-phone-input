import type { CorpusScenario } from './types';
import { DESKTOP_BROWSER_MATRIX } from './types';

export const CHRISTOFLE_CORPUS = [
  {
    id: 'christofle.account.address-country',
    title: 'Account phone and address country stay synchronized by explicit policy',
    area: 'christofle',
    tags: ['account', 'address-country', 'migration'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['christofle', 'libphonenumber-js'],
    steps: ['Load existing address', 'Edit phone country', 'Edit address country'],
    assertions: [
      'No direct DOM mutation is used',
      'Selected/detected country states remain distinguishable',
    ],
  },
  {
    id: 'christofle.account.example-placeholder',
    title: 'Localized example placeholder remains available',
    area: 'christofle',
    tags: ['account', 'placeholder', 'migration'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['christofle', 'libphonenumber-js'],
    steps: ['Select a country', 'Focus empty phone field'],
    assertions: [
      'Example comes from package metadata policy',
      'No /utils.min.js global is loaded',
    ],
  },
  {
    id: 'christofle.checkout.unified-field',
    title: 'Checkout preserves the polished unified-field appearance',
    area: 'christofle',
    tags: ['checkout', 'mui', 'theme-slots'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['christofle', 'material-ui'],
    steps: ['Render checkout field in light and dark themes'],
    assertions: [
      'Appearance is implemented through theme/slots',
      'Focus, error, and disabled states remain accessible',
    ],
  },
  {
    id: 'christofle.checkout.modal-portal',
    title: 'Checkout selector remains usable inside modal/portal stacks',
    area: 'christofle',
    tags: ['checkout', 'modal', 'portal'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['christofle', 'material-ui'],
    steps: ['Open phone country selector inside checkout modal', 'Search and select'],
    assertions: [
      'Portal container is explicit',
      'Focus and scroll lock do not conflict',
    ],
  },
  {
    id: 'christofle.legacy-authority-removal',
    title: 'Both legacy phone authority families are removed',
    area: 'christofle',
    tags: ['migration', 'authority-removal'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['christofle'],
    steps: ['Build account and checkout consumers with the package'],
    assertions: [
      'No global phone utils script remains',
      'No manual country table or duplicated validation remains',
    ],
  },
] as const satisfies readonly CorpusScenario[];
