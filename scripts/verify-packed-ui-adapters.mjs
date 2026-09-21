import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { createIsolatedTemporaryRoot } from './lib/isolated-temporary-root.mjs';
import {
  createPackageArtifact,
  releasePackageArtifact,
  repositoryRoot,
  run,
} from './lib/package-artifact.mjs';

const artifactArgument = process.argv.find((argument) =>
  argument.startsWith('--artifact='),
);
const tarball = artifactArgument
  ? resolve(artifactArgument.slice('--artifact='.length))
  : await createPackageArtifact();
const digest = async () =>
  createHash('sha256')
    .update(await readFile(tarball))
    .digest('hex');
const expectedDigest = await digest();
// Carry the reviewed missing-edge repairs into real isolated GVS installs.
// Do not evade upstream declaration failures with hoisting or skipLibCheck.
const workspacePolicy = await readFile(
  join(repositoryRoot, 'pnpm-workspace.yaml'),
  'utf8',
);
const packageExtensions = workspacePolicy.match(
  /^packageExtensions:\n(?:[ \t].*\n|\n)*/m,
)?.[0];
assert.ok(
  packageExtensions,
  'Consumer proof must inherit reviewed dependency-edge repairs.',
);
const muiPeers = ['@mui/material', '@emotion/react', '@emotion/styled'];
const temporaryRoot = await createIsolatedTemporaryRoot('phone-ui-consumers-', {
  forbiddenPackages: [...muiPeers, '@base-ui/react', '@wh1teee/mui-phone-input'],
});
const reactDependencies = {
  '@types/react': '19.3.0',
  '@types/react-dom': '19.3.0',
  react: '19.3.0',
  'react-dom': '19.3.0',
  '@typescript/native': 'npm:typescript@7.0.2',
  typescript: 'npm:@typescript/typescript6@6.0.2',
};
const profiles = [
  {
    name: 'headless',
    dependencies: {},
    absent: [...muiPeers, '@base-ui/react', 'react-hook-form', 'zod'],
    source: `import { usePhoneInput } from '@wh1teee/mui-phone-input/headless';
import { usePhoneInput as useMinPhoneInput } from '@wh1teee/mui-phone-input/headless/min';
export function App() {
  const phone = usePhoneInput({ defaultValue: '+375291234567' });
  const minPhone = useMinPhoneInput({ defaultValue: '+375291234567' });
  return <><input {...phone.getInputProps({ 'aria-label': 'Phone', type: 'tel' })} />
    <input {...minPhone.getInputProps({ 'aria-label': 'Min phone', type: 'tel' })} /></>;
}`,
  },
  {
    name: 'base-ui',
    dependencies: { '@base-ui/react': '1.8.0' },
    absent: [...muiPeers, 'react-hook-form', 'zod'],
    source: `import { PhoneInput } from '@wh1teee/mui-phone-input/base-ui';
import { PhoneInput as ShadcnPhoneInput } from '@wh1teee/mui-phone-input/shadcn';
import { PhoneInput as MinPhoneInput } from '@wh1teee/mui-phone-input/base-ui/min';
import { PhoneInput as MinShadcnPhoneInput } from '@wh1teee/mui-phone-input/shadcn/min';
import { ru } from '@wh1teee/mui-phone-input/locales/ru';
export function App() {
  return <><PhoneInput label="Phone" defaultValue="+375291234567" countrySelector={ru} />
    <ShadcnPhoneInput label="Styled phone" dir="rtl" />
    <MinPhoneInput label="Min phone" defaultValue="+375291234567" />
    <MinShadcnPhoneInput label="Min styled phone" /></>;
}`,
  },
  {
    name: 'base-ui-rhf',
    dependencies: { '@base-ui/react': '1.8.0', 'react-hook-form': '7.88.0' },
    absent: [...muiPeers, 'zod'],
    source: `import { useForm } from 'react-hook-form';
import { PhoneInputController } from '@wh1teee/mui-phone-input/base-ui/react-hook-form';
import { PhoneInputController as StyledController } from '@wh1teee/mui-phone-input/shadcn/react-hook-form';
import { PhoneInputController as MinController } from '@wh1teee/mui-phone-input/base-ui/min/react-hook-form';
import { PhoneInputController as MinStyledController } from '@wh1teee/mui-phone-input/shadcn/min/react-hook-form';
import type { PhoneValue } from '@wh1teee/mui-phone-input/headless';
export function App() {
  const { control } = useForm<{ phone: PhoneValue }>({ defaultValues: { phone: '+375291234567' } });
  return <><PhoneInputController name="phone" label="Phone" control={control} />
    <StyledController name="phone" label="Styled phone" control={control} />
    <MinController name="phone" label="Min phone" control={control} />
    <MinStyledController name="phone" label="Min styled phone" control={control} /></>;
}`,
  },
  {
    name: 'mui',
    dependencies: {
      '@mui/material': '9.4.0',
      '@emotion/react': '11.14.0',
      '@emotion/styled': '11.14.1',
    },
    absent: ['@base-ui/react', 'react-hook-form', 'zod'],
    source: `import { MuiPhoneInput } from '@wh1teee/mui-phone-input/mui';
import { MuiPhoneInput as LegacyPhoneInput } from '@wh1teee/mui-phone-input';
import { MuiPhoneInput as MinMuiPhoneInput } from '@wh1teee/mui-phone-input/mui/min';
export function App() {
  return <><MuiPhoneInput label="Phone" defaultValue="+375291234567" />
    <LegacyPhoneInput label="Legacy phone" />
    <MinMuiPhoneInput label="Min phone" defaultValue="+375291234567" /></>;
}`,
  },
];

try {
  for (const profile of profiles) {
    const destination = join(temporaryRoot, profile.name);
    await mkdir(destination, { recursive: true });
    await writeFile(
      join(destination, 'package.json'),
      JSON.stringify(
        {
          name: `phone-ui-${profile.name}-verification`,
          private: true,
          type: 'module',
          packageManager: 'pnpm@11.27.0',
          dependencies: {
            '@wh1teee/mui-phone-input': `file:${tarball}`,
            ...reactDependencies,
            ...profile.dependencies,
          },
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(destination, 'pnpm-workspace.yaml'),
      [
        'packages:',
        '  - .',
        'autoInstallPeers: false',
        'minimumReleaseAge: 1440',
        'minimumReleaseAgeStrict: false',
        // Headless deliberately omits optional renderers, not required React peers.
        'strictPeerDependencies: true',
        packageExtensions,
        '',
      ].join('\n'),
    );
    await writeFile(join(destination, 'app.tsx'), profile.source);
    await writeFile(
      join(destination, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2024',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            jsx: 'react-jsx',
            strict: true,
            // MUI 9.4 Transition declarations do not support this extra strictness
            // flag (Collapse/Fade easing). Preserve its upstream-supported mode;
            // Base UI and headless must pass with exact optional properties too.
            exactOptionalPropertyTypes: profile.name !== 'mui',
            skipLibCheck: false,
            lib: ['ES2024', 'DOM', 'DOM.Iterable'],
            types: ['react', 'react-dom'],
            outDir: 'built',
          },
          include: ['app.tsx'],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(destination, 'probe.mjs'),
      `
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './built/app.js';
for (const peer of ${JSON.stringify(profile.absent)}) {
  assert.throws(() => import.meta.resolve(peer), { code: 'ERR_MODULE_NOT_FOUND' }, peer + ' leaked into consumer');
}
const html = renderToString(createElement(App));
assert.match(html, /375/);
assert.match(html, /inputMode="tel"|inputmode="tel"/);
// Legacy MUI deliberately uses a text input with tel inputMode for edit/caret
// compatibility. The new native composition additionally declares type=tel.
if (${JSON.stringify(profile.name)} !== 'mui') assert.match(html, /type="tel"/);
assert.doesNotMatch(html, /<img[^>]+src="https?:/);
console.log(${JSON.stringify(profile.name)} + ': strict declarations and SSR passed without unused renderer peers');
`,
    );
    run('pnpm', ['install', '--ignore-scripts', '--frozen-lockfile=false'], {
      cwd: destination,
    });
    run('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], { cwd: destination });
    run(process.execPath, ['probe.mjs'], { cwd: destination });
    assert.equal(
      await digest(),
      expectedDigest,
      'The tested tarball must stay immutable.',
    );
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
  if (!artifactArgument) await releasePackageArtifact(tarball);
}
console.log(
  'All four UI consumers passed with isolated installs and skipLibCheck=false.',
);
