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

import {
  packageBoundaryKinds,
  verifyJavaScriptPackageBoundary,
} from './package-boundary-contract.mjs';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptsDirectory, '../..');
const packageName = '@wh1teee/mui-phone-input';
const semanticExceptionKinds = new Set([
  'asset-only',
  'data-only',
  'side-effect-only',
]);

const expectedExportContract = {
  '.': {
    boundary: 'client',
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
      'formatPhoneInputPresentation',
      'formatPhoneValueForDisplay',
      'getMuiPhoneInputUtilityClass',
      'isPhoneValue',
      'muiPhoneInputClasses',
      'parseNationalPhoneValue',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'resolvePhoneCountrySelection',
      'selectPhoneCountryValue',
      'usePhoneInput',
      'usePhoneInputContext',
      'validatePhoneMetadata',
      'validatePhoneValue',
    ],
    types: [
      'BuiltInPhoneValidationMode',
      'CreatePhoneCountryOptionsParameters',
      'DisplayMask',
      'FilterPhoneCountryOptionsParameters',
      'FormatStrategy',
      'FormatStrategyContext',
      'FormatStrategyResult',
      'GeographicNumberingPlanResolution',
      'LogicalCaretMapping',
      'MuiPhoneInput',
      'MuiPhoneInputClassKey',
      'MuiPhoneInputClasses',
      'MuiPhoneInputOwnerState',
      'MuiPhoneInputProps',
      'NationalPhoneValueOptions',
      'NonGeographicNumberingPlanResolution',
      'NumberingPlanResolution',
      'NumberingPlanResolutionOptions',
      'PhoneCountryChangeDetails',
      'PhoneCountryChangeReason',
      'PhoneCountryFlagProps',
      'PhoneCountryNameResolver',
      'PhoneCountryOption',
      'PhoneCountrySelectionAppliedReason',
      'PhoneCountrySelectionAppliedResult',
      'PhoneCountrySelectionConflictReason',
      'PhoneCountrySelectionConflictResult',
      'PhoneCountrySelectionOptions',
      'PhoneCountrySelectionResult',
      'PhoneCountrySelectorClasses',
      'PhoneCountrySelectorFlagOwnerState',
      'PhoneCountrySelectorGroupOwnerState',
      'PhoneCountrySelectorIndicatorOwnerState',
      'PhoneCountrySelectorMessages',
      'PhoneCountrySelectorMode',
      'PhoneCountrySelectorOptionOwnerState',
      'PhoneCountrySelectorOwnerState',
      'PhoneCountrySelectorPresentation',
      'PhoneCountrySelectorSlotProps',
      'PhoneCountrySelectorSlots',
      'PhoneExternalFlagFallback',
      'PhoneExternalFlagOptions',
      'PhoneFlagMode',
      'PhoneFlagPlacement',
      'PhoneFlagProvider',
      'PhoneFlagProviderContext',
      'PhoneInputActions',
      'PhoneInputChangeDetails',
      'PhoneInputChangeReason',
      'PhoneInputCountrySelector',
      'PhoneInputCountrySelectorProps',
      'PhoneInputDisplayMode',
      'PhoneInputFormatOptions',
      'PhoneInputInput',
      'PhoneInputInputExternalProps',
      'PhoneInputInputProps',
      'PhoneInputNumberingPlanState',
      'PhoneInputPresentation',
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
      'PhoneMetadata',
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
      'formatPhoneInputPresentation',
      'formatPhoneValueForDisplay',
      'getMuiPhoneInputUtilityClass',
      'isPhoneValue',
      'muiPhoneInputClasses',
      'parseNationalPhoneValue',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'resolvePhoneCountrySelection',
      'selectPhoneCountryValue',
      'usePhoneInput',
      'usePhoneInputContext',
      'validatePhoneMetadata',
      'validatePhoneValue',
    ],
  },
  './server': {
    boundary: 'neutral',
    runtime: [
      'assertPhoneValue',
      'formatPhoneValueForDisplay',
      'isPhoneValue',
      'parseNationalPhoneValue',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'validatePhoneMetadata',
      'validatePhoneValue',
    ],
    types: [
      'BuiltInPhoneValidationMode',
      'GeographicNumberingPlanResolution',
      'NationalPhoneValueOptions',
      'NonGeographicNumberingPlanResolution',
      'NumberingPlanResolution',
      'NumberingPlanResolutionOptions',
      'PhoneMetadata',
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
      'parseNationalPhoneValue',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'validatePhoneMetadata',
      'validatePhoneValue',
    ],
  },
  './metadata/max': {
    boundary: 'neutral',
    runtime: ['default'],
    types: ['default'],
  },
  './metadata/min': {
    boundary: 'neutral',
    runtime: ['default'],
    types: ['default'],
  },
  './metadata/mobile': {
    boundary: 'neutral',
    runtime: ['default'],
    types: ['default'],
  },
  './metadata/custom': {
    boundary: 'neutral',
    runtime: ['default', 'validatePhoneMetadata'],
    types: ['PhoneMetadata', 'default', 'validatePhoneMetadata'],
  },
  './flags': {
    boundary: 'client',
    runtime: ['PhoneCountryFlag'],
    types: [
      'PhoneCountryFlag',
      'PhoneCountryFlagProps',
      'PhoneExternalFlagFallback',
      'PhoneExternalFlagOptions',
      'PhoneFlagMode',
      'PhoneFlagPlacement',
      'PhoneFlagProvider',
      'PhoneFlagProviderContext',
    ],
  },
  './flags.css': {
    boundary: 'data-only',
    exception: {
      kind: 'asset-only',
      reason:
        'The generated local flag stylesheet is a static package asset with no JavaScript export names.',
    },
  },
  './locales/be': {
    boundary: 'neutral',
    runtime: ['be'],
    types: ['be'],
  },
  './locales/en': {
    boundary: 'neutral',
    runtime: ['en'],
    types: ['en'],
  },
  './locales/ru': {
    boundary: 'neutral',
    runtime: ['ru'],
    types: ['ru'],
  },
  './package.json': {
    boundary: 'data-only',
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
    '@wh1teee',
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
      assert.ok(
        packageBoundaryKinds.has(contract.boundary),
        `${subpath} must declare an explicit package boundary.`,
      );

      if ('exception' in contract) {
        assert.ok(
          semanticExceptionKinds.has(contract.exception.kind),
          `${subpath} has an unsupported semantic-export exception.`,
        );
        assert.ok(contract.exception.reason, `${subpath} exception requires a reason.`);
        if (contract.exception.kind === 'data-only') {
          assert.equal(
            contract.boundary,
            'data-only',
            `${subpath} data-only exceptions must declare a data-only boundary.`,
          );
          assert.equal(
            typeof manifestExport,
            'string',
            `${subpath} data-only export must be a direct JSON target.`,
          );
          assert.match(
            manifestExport,
            /\.json$/u,
            `${subpath} data-only export must resolve to JSON.`,
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
        } else if (contract.exception.kind === 'asset-only') {
          assert.equal(
            contract.boundary,
            'data-only',
            `${subpath} asset-only exceptions must declare a data-only boundary.`,
          );
          assert.equal(
            typeof manifestExport,
            'string',
            `${subpath} asset-only export must be a direct package target.`,
          );
          assert.match(
            manifestExport,
            /\.css$/u,
            `${subpath} asset-only export must resolve to CSS.`,
          );
          const asset = await readFile(join(packageRoot, manifestExport), 'utf8');
          assert.ok(asset.length > 0, `${subpath} asset-only export is empty.`);
        } else {
          assert.equal(
            contract.boundary,
            'neutral',
            `${subpath} side-effect-only exceptions must declare a neutral boundary.`,
          );
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

      assert.notEqual(
        contract.boundary,
        'data-only',
        `${subpath} JavaScript exports cannot use the data-only boundary.`,
      );
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

      const runtimeTarget = join(packageRoot, manifestExport.import);
      verifyJavaScriptPackageBoundary({
        boundary: contract.boundary,
        filename: runtimeTarget,
        source: await readFile(runtimeTarget, 'utf8'),
        subpath,
      });

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
      `Semantic export and boundary contract verified for ${Object.keys(expectedExportContract).length} public paths; ${absentFutureSubpaths.length} future paths remain absent.`,
    );
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}
