import assert from 'node:assert/strict';

const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'navigator',
);
let navigatorReadCount = 0;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  get() {
    navigatorReadCount += 1;
    throw new Error('SSR must not read navigator or browser locale state.');
  },
});

const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
let resolvedOptionsCallCount = 0;
Intl.DateTimeFormat.prototype.resolvedOptions = function forbiddenLocaleDetection() {
  resolvedOptionsCallCount += 1;
  throw new Error('SSR must not infer locale from Intl.DateTimeFormat.');
};

const states = [
  ['empty', undefined, 'unresolved', 'empty', undefined],
  ['geographic', '+375291234567', 'geographic', 'valid', undefined],
  ['territory', '+358412345678', 'geographic', 'valid', 'AX'],
  ['unresolved', '+1', 'unresolved', 'incomplete', undefined],
  ['non-geographic', '+80012345678', 'non-geographic', 'valid', undefined],
];
try {
  const [muiStyles, phoneInputModule, reactModule, reactDomServer] = await Promise.all([
    import('@mui/material/styles'),
    import('@whiteee/mui-phone-input'),
    import('react'),
    import('react-dom/server'),
  ]);
  assert.equal(navigatorReadCount, 0, 'Module evaluation read navigator.');
  assert.equal(
    resolvedOptionsCallCount,
    0,
    'Module evaluation inferred locale through Intl.DateTimeFormat.',
  );

  const { createTheme, ThemeProvider } = muiStyles;
  const { MuiPhoneInput } = phoneInputModule;
  const { createElement } = reactModule;
  const { renderToString } = reactDomServer;
  const theme = createTheme({ cssVariables: true });
  const renderState = (kind, value, selectedCountry) =>
    renderToString(
      createElement(
        ThemeProvider,
        { theme },
        createElement(MuiPhoneInput, {
          id: `probe-${kind}`,
          label: `Probe ${kind}`,
          placeholder: `${kind} placeholder`,
          readOnly: true,
          ...(selectedCountry === undefined ? {} : { selectedCountry }),
          slotProps: {
            countrySelector: {
              disablePortal: true,
              locale: 'en',
              mode: 'desktop',
            },
          },
          value,
        }),
      ),
    );
  const renderMatrix = () =>
    renderToString(
      createElement(
        ThemeProvider,
        { theme },
        createElement(
          'section',
          null,
          ...states.map(([kind, value, _plan, _status, selectedCountry]) =>
            createElement(MuiPhoneInput, {
              id: `probe-${kind}`,
              key: kind,
              label: `Probe ${kind}`,
              placeholder: `${kind} placeholder`,
              readOnly: true,
              ...(selectedCountry === undefined ? {} : { selectedCountry }),
              slotProps: {
                countrySelector: {
                  disablePortal: true,
                  locale: 'en',
                  mode: 'desktop',
                },
              },
              value,
            }),
          ),
        ),
      ),
    );

  const first = renderMatrix();
  const second = renderMatrix();
  assert.equal(first, second, 'Two isolated server renders must be byte-identical.');

  for (const [kind, value, plan, status, selectedCountry] of states) {
    const isolatedHtml = renderState(kind, value, selectedCountry);
    const inputTag = isolatedHtml.match(
      new RegExp(`<input(?=[^>]*\\bid="probe-${kind}")[^>]*>`, 'u'),
    )?.[0];
    assert.ok(inputTag, `Missing ${kind} server-rendered input.`);
    assert.ok(
      inputTag.includes(`data-phone-input-plan="${plan}"`),
      `Unexpected ${kind} server-rendered plan.`,
    );
    assert.ok(
      inputTag.includes(`data-phone-input-status="${status}"`),
      `Unexpected ${kind} server-rendered status.`,
    );
    assert.ok(
      inputTag.includes(`value="${value ?? ''}"`),
      `Unexpected ${kind} server-rendered value.`,
    );
    if (selectedCountry) {
      assert.ok(
        inputTag.includes(`data-phone-input-country="${selectedCountry}"`),
        `Unexpected ${kind} server-rendered country.`,
      );
    }
  }

  assert.equal(navigatorReadCount, 0, 'Server render read navigator.');
  assert.equal(
    resolvedOptionsCallCount,
    0,
    'Server render inferred locale through Intl.DateTimeFormat.',
  );

  console.log('Exact-package Node SSR probe passed.');
} finally {
  Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'navigator');
  }
}
