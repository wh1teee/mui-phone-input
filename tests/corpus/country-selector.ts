import type { CorpusScenario } from './types';
import { DESKTOP_BROWSER_MATRIX } from './types';

export const COUNTRY_SELECTOR_CORPUS = [
  {
    id: 'selector.search.localized',
    title: 'Search by localized country name',
    area: 'country-selector',
    tags: ['search', 'localized-name'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['material-ui', 'wai-aria-apg'],
    steps: ['Open selector', 'Enter localized country name'],
    assertions: ['Matching option is available', 'Accessible name uses current locale'],
  },
  {
    id: 'selector.search.calling-code',
    title: 'Search by ISO code and calling code',
    area: 'country-selector',
    tags: ['search', 'iso', 'calling-code'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['intl-tel-input', 'react-international-phone'],
    steps: ['Search by BY', 'Search by +375'],
    assertions: [
      'Belarus is found by both forms',
      'Search does not use a manual calling-code table',
    ],
  },
  {
    id: 'selector.preferred-countries',
    title: 'Preferred countries remain ordered and deduplicated',
    area: 'country-selector',
    tags: ['preferred-countries', 'flags'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['intl-tel-input', 'country-flag-icons'],
    steps: ['Configure BY, PL, LT as preferred', 'Open selector'],
    assertions: [
      'Preferred block is stable',
      'Countries appear once in the complete list',
    ],
  },
  {
    id: 'selector.keyboard',
    title: 'Combobox/listbox keyboard contract',
    area: 'country-selector',
    tags: ['keyboard', 'combobox', 'listbox'],
    browsers: DESKTOP_BROWSER_MATRIX,
    provenance: ['wai-aria-apg', 'material-ui'],
    steps: ['Open with keyboard', 'Navigate arrows', 'Commit Enter', 'Dismiss Escape'],
    assertions: [
      'Active descendant and focus follow APG semantics',
      'Selection is announced once',
    ],
  },
  {
    id: 'selector.mobile-dialog',
    title: 'Mobile full-screen dialog selector',
    area: 'country-selector',
    tags: ['mobile', 'dialog', 'focus-management'],
    browsers: ['chromium', 'webkit'],
    realDeviceGate: 'ios-safari',
    provenance: ['material-ui', 'wai-aria-apg'],
    steps: ['Open selector at mobile breakpoint', 'Search and select'],
    assertions: [
      'Dialog has accessible name',
      'Focus restores to trigger',
      'Background is inert',
    ],
  },
  {
    id: 'selector.no-portal-voiceover',
    title: 'No-portal mode preserves iOS VoiceOver navigation',
    area: 'country-selector',
    tags: ['voiceover', 'no-portal', 'ios'],
    browsers: ['webkit'],
    realDeviceGate: 'ios-safari',
    provenance: ['material-ui', 'wai-aria-apg'],
    steps: ['Disable portal', 'Navigate trigger, input, and options with VoiceOver'],
    assertions: [
      'Options stay in the expected accessibility traversal order',
      'Selection and dismissal remain operable',
    ],
  },
] as const satisfies readonly CorpusScenario[];
