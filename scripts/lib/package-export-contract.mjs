import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptsDirectory, '../..');
const packageName = '@whiteee/mui-phone-input';
const semanticExceptionKinds = new Set(['data-only', 'side-effect-only']);

const expectedExportContract = {
  '.': {
    runtime: [
      'MuiPhoneInput',
      'PhoneInputCountrySelector',
      'PhoneInputInput',
      'PhoneInputProvider',
      'PhoneInputRoot',
      'PhoneInputValidationMessage',
      'assertPhoneValue',
      'createPhoneCountryOptions',
      'filterPhoneCountryOptions',
      'formatPhoneValueForDisplay',
      'getMuiPhoneInputUtilityClass',
      'isPhoneValue',
      'muiPhoneInputClasses',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'resolvePhoneCountrySelection',
      'selectPhoneCountryValue',
      'usePhoneInput',
      'usePhoneInputContext',
      'validatePhoneValue',
    ],
    types: [
      'BuiltInPhoneValidationMode',
      'CreatePhoneCountryOptionsParameters',
      'FilterPhoneCountryOptionsParameters',
      'GeographicNumberingPlanResolution',
      'MuiPhoneInput',
      'MuiPhoneInputClassKey',
      'MuiPhoneInputClasses',
      'MuiPhoneInputOwnerState',
      'MuiPhoneInputProps',
      'NonGeographicNumberingPlanResolution',
      'NumberingPlanResolution',
      'NumberingPlanResolutionOptions',
      'PhoneCountryChangeDetails',
      'PhoneCountryChangeReason',
      'PhoneCountryNameResolver',
      'PhoneCountryOption',
      'PhoneCountrySelectionAppliedReason',
      'PhoneCountrySelectionAppliedResult',
      'PhoneCountrySelectionConflictReason',
      'PhoneCountrySelectionConflictResult',
      'PhoneCountrySelectionResult',
      'PhoneCountrySelectorClasses',
      'PhoneCountrySelectorGroupOwnerState',
      'PhoneCountrySelectorIndicatorOwnerState',
      'PhoneCountrySelectorMessages',
      'PhoneCountrySelectorMode',
      'PhoneCountrySelectorOptionOwnerState',
      'PhoneCountrySelectorOwnerState',
      'PhoneCountrySelectorPresentation',
      'PhoneCountrySelectorSlotProps',
      'PhoneCountrySelectorSlots',
      'PhoneInputActions',
      'PhoneInputChangeDetails',
      'PhoneInputChangeReason',
      'PhoneInputCountrySelector',
      'PhoneInputCountrySelectorProps',
      'PhoneInputInput',
      'PhoneInputInputExternalProps',
      'PhoneInputInputProps',
      'PhoneInputNumberingPlanState',
      'PhoneInputProvider',
      'PhoneInputProviderProps',
      'PhoneInputResolvedInputProps',
      'PhoneInputResolvedRootProps',
      'PhoneInputResolvedValidationMessageProps',
      'PhoneInputRoot',
      'PhoneInputRootExternalProps',
      'PhoneInputRootProps',
      'PhoneInputState',
      'PhoneInputValidationMessage',
      'PhoneInputValidationMessageExternalProps',
      'PhoneInputValidationMessageProps',
      'PhoneInputValidationState',
      'PhoneValidationDisplay',
      'PhoneValidationMode',
      'PhoneValidationOptions',
      'PhoneValidationReason',
      'PhoneValidationResult',
      'PhoneValidationStatus',
      'PhoneValidationStrategy',
      'PhoneValidationStrategyContext',
      'PhoneValue',
      'UnresolvedNumberingPlanResolution',
      'UsePhoneInputParameters',
      'UsePhoneInputReturn',
      'assertPhoneValue',
      'createPhoneCountryOptions',
      'filterPhoneCountryOptions',
      'formatPhoneValueForDisplay',
      'getMuiPhoneInputUtilityClass',
      'isPhoneValue',
      'muiPhoneInputClasses',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'resolvePhoneCountrySelection',
      'selectPhoneCountryValue',
      'usePhoneInput',
      'usePhoneInputContext',
      'validatePhoneValue',
    ],
  },
  './server': {
    runtime: [
      'assertPhoneValue',
      'formatPhoneValueForDisplay',
      'isPhoneValue',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'validatePhoneValue',
    ],
    types: [
      'BuiltInPhoneValidationMode',
      'GeographicNumberingPlanResolution',
      'NonGeographicNumberingPlanResolution',
      'NumberingPlanResolution',
      'NumberingPlanResolutionOptions',
      'PhoneValidationMode',
      'PhoneValidationOptions',
      'PhoneValidationReason',
      'PhoneValidationResult',
      'PhoneValidationStatus',
      'PhoneValidationStrategy',
      'PhoneValidationStrategyContext',
      'PhoneValue',
      'UnresolvedNumberingPlanResolution',
      'assertPhoneValue',
      'formatPhoneValueForDisplay',
      'isPhoneValue',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'validatePhoneValue',
    ],
  },
  './package.json': {
    exception: {
      kind: 'data-only',
      reason:
        'Package metadata is intentionally exposed as JSON and has no JavaScript or declaration export names.',
    },
  },
};

const absentFutureSubpaths = [
  './react-hook-form',
  './zod',
  './metadata/max',
  './metadata/min',
  './metadata/mobile',
  './metadata/custom',
  './locales/en',
  './flags/local',
];

function packageSpecifier(subpath) {
  return subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`;
}

async function linkDependency(consumerRoot, dependency) {
  let source;
  for (const candidate of [
    join(repositoryRoot, 'node_modules', dependency),
    join(repositoryRoot, 'packages/mui-phone-input/node_modules', dependency),
  ]) {
    try {
      source = await realpath(candidate);
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  assert.ok(
    source,
    `Installed dependency ${dependency} was not found in the workspace.`,
  );
  const destination = join(consumerRoot, 'node_modules', dependency);
  await mkdir(dirname(destination), { recursive: true });
  await symlink(source, destination, 'dir');
}

function readRuntimeProbe(consumerRoot, specifier, mode) {
  return JSON.parse(
    execFileSync(process.execPath, ['runtime-probe.mjs', specifier, mode], {
      cwd: consumerRoot,
      encoding: 'utf8',
    }),
  );
}

function resolveTypeExports(consumerRoot, subpath, expectedTypesTarget) {
  const consumerFile = join(consumerRoot, 'type-probe.ts');
  const compilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2024,
  };
  const resolvedModule = ts.resolveModuleName(
    packageSpecifier(subpath),
    consumerFile,
    compilerOptions,
    ts.sys,
  ).resolvedModule;

  assert.ok(resolvedModule, `TypeScript did not resolve ${subpath}.`);
  assert.equal(
    resolve(resolvedModule.resolvedFileName),
    resolve(expectedTypesTarget),
    `${subpath} resolved an unexpected type condition.`,
  );

  const program = ts.createProgram([resolvedModule.resolvedFileName], compilerOptions);
  const sourceFile = program.getSourceFile(resolvedModule.resolvedFileName);
  assert.ok(sourceFile, `TypeScript did not load declarations for ${subpath}.`);
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  assert.ok(moduleSymbol, `TypeScript did not create a module symbol for ${subpath}.`);

  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => symbol.name)
    .sort();
}

export async function verifyPackageExportContract(tarball) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'mui-phone-input-exports-'));
  const packageRoot = join(
    temporaryRoot,
    'node_modules',
    '@whiteee',
    'mui-phone-input',
  );

  try {
    await mkdir(packageRoot, { recursive: true });
    execFileSync('tar', ['-xzf', tarball, '--strip-components=1', '-C', packageRoot], {
      cwd: repositoryRoot,
    });

    const manifest = JSON.parse(
      await readFile(join(packageRoot, 'package.json'), 'utf8'),
    );
    assert.deepEqual(
      Object.keys(manifest.exports).sort(),
      Object.keys(expectedExportContract).sort(),
      'Published export paths differ from the explicit current-canary contract.',
    );

    const requiredPeers = Object.keys(manifest.peerDependencies ?? {}).filter(
      (dependency) => !manifest.peerDependenciesMeta?.[dependency]?.optional,
    );
    const dependencies = [
      ...Object.keys(manifest.dependencies ?? {}),
      ...requiredPeers,
    ];
    for (const dependency of new Set(dependencies)) {
      await linkDependency(temporaryRoot, dependency);
    }

    await writeFile(
      join(temporaryRoot, 'package.json'),
      `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
    );
    await writeFile(join(temporaryRoot, 'type-probe.ts'), 'export {};\n');
    await writeFile(
      join(temporaryRoot, 'runtime-probe.mjs'),
      `const [, , specifier, mode] = process.argv;
try {
  const loaded =
    mode === 'json'
      ? await import(specifier, { with: { type: 'json' } })
      : await import(specifier);
  console.log(JSON.stringify({ exports: Object.keys(loaded).sort() }));
} catch (error) {
  console.log(
    JSON.stringify({
      code: error && typeof error === 'object' && 'code' in error ? error.code : null,
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : typeof error,
    }),
  );
}
`,
    );

    for (const [subpath, contract] of Object.entries(expectedExportContract)) {
      const manifestExport = manifest.exports[subpath];
      assert.ok(manifestExport, `Missing public export ${subpath}.`);

      if ('exception' in contract) {
        assert.ok(
          semanticExceptionKinds.has(contract.exception.kind),
          `${subpath} has an unsupported semantic-export exception.`,
        );
        assert.ok(contract.exception.reason, `${subpath} exception requires a reason.`);
        if (contract.exception.kind === 'data-only') {
          assert.equal(
            typeof manifestExport,
            'string',
            `${subpath} data-only export must be a direct JSON target.`,
          );
          const probe = readRuntimeProbe(
            temporaryRoot,
            packageSpecifier(subpath),
            'json',
          );
          assert.deepEqual(
            probe.exports,
            ['default'],
            `${subpath} JSON import failed.`,
          );
        } else {
          assert.equal(
            typeof manifestExport,
            'object',
            `${subpath} side-effect-only export must use runtime conditions.`,
          );
          const probe = readRuntimeProbe(
            temporaryRoot,
            packageSpecifier(subpath),
            'module',
          );
          assert.equal(probe.code, undefined, `${subpath} side-effect import failed.`);
          assert.deepEqual(
            probe.exports,
            [],
            `${subpath} side-effect-only module unexpectedly exports names.`,
          );
        }
        continue;
      }

      assert.equal(typeof manifestExport, 'object', `${subpath} must use conditions.`);
      assert.equal(
        manifestExport.import,
        manifestExport.default,
        `${subpath} import/default runtime targets diverge.`,
      );
      assert.ok(manifestExport.types, `${subpath} is missing a type condition.`);
      assert.ok(manifestExport.import, `${subpath} is missing an import condition.`);
      assert.ok(
        contract.runtime.length > 0,
        `${subpath} unexpectedly has no runtime API.`,
      );
      assert.ok(contract.types.length > 0, `${subpath} unexpectedly has no type API.`);

      const runtimeProbe = readRuntimeProbe(
        temporaryRoot,
        packageSpecifier(subpath),
        'module',
      );
      assert.equal(runtimeProbe.code, undefined, `${subpath} runtime import failed.`);
      assert.deepEqual(
        runtimeProbe.exports,
        [...contract.runtime].sort(),
        `${subpath} runtime exports differ from the explicit contract.`,
      );

      const typeTarget = join(packageRoot, manifestExport.types);
      assert.deepEqual(
        resolveTypeExports(temporaryRoot, subpath, typeTarget),
        [...contract.types].sort(),
        `${subpath} type exports differ from the explicit contract.`,
      );
    }

    for (const subpath of absentFutureSubpaths) {
      const probe = readRuntimeProbe(
        temporaryRoot,
        packageSpecifier(subpath),
        'module',
      );
      assert.equal(
        probe.code,
        'ERR_PACKAGE_PATH_NOT_EXPORTED',
        `${subpath} must fail with ERR_PACKAGE_PATH_NOT_EXPORTED.`,
      );
    }

    console.log(
      `Semantic export contract verified for ${Object.keys(expectedExportContract).length} public paths; ${absentFutureSubpaths.length} future paths remain absent.`,
    );
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}
