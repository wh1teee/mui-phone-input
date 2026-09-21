import { defineConfig } from 'tsdown';
import { resolve } from 'node:path';

const externalDependencies = [
  '@base-ui/react',
  '@maskito/core',
  '@maskito/react',
  'libphonenumber-js',
  '@emotion/react',
  '@emotion/styled',
  '@mui/material',
  'react',
  'react-dom',
  'react-hook-form',
  'zod',
];

const browserTarget = ['Chrome117', 'Edge121', 'Firefox121', 'Safari17'];
const browserDefine = {
  'process.env.NODE_ENV': 'process.env.NODE_ENV',
};
const minMetadataAlias = {
  './metadata/default': resolve(import.meta.dirname, 'src/metadata/default-min.ts'),
};

export default defineConfig([
  {
    clean: true,
    define: browserDefine,
    dts: true,
    entry: {
      flags: 'src/flags.tsx',
      index: 'src/index.ts',
      'locales/be': 'src/locales/be.ts',
      'locales/en': 'src/locales/en.ts',
      'locales/index': 'src/locales/index.ts',
      'locales/ru': 'src/locales/ru.ts',
    },
    deps: {
      neverBundle: externalDependencies,
    },
    format: ['esm'],
    outDir: 'dist',
    platform: 'browser',
    sourcemap: true,
    target: browserTarget,
  },
  {
    clean: false,
    define: browserDefine,
    dts: true,
    entry: {
      headless: 'src/headless.ts',
      'base-ui': 'src/base-ui.ts',
      shadcn: 'src/shadcn.ts',
      'base-ui/react-hook-form': 'src/base-ui-react-hook-form.tsx',
    },
    deps: {
      neverBundle: externalDependencies,
    },
    format: ['esm'],
    outDir: 'dist',
    platform: 'browser',
    sourcemap: true,
    target: browserTarget,
  },
  {
    alias: minMetadataAlias,
    clean: false,
    define: browserDefine,
    dts: false,
    entry: {
      'mui/min': 'src/index.ts',
      'headless/min': 'src/headless.ts',
      'base-ui/min': 'src/base-ui.ts',
      'shadcn/min': 'src/shadcn.ts',
      'mui/min/react-hook-form': 'src/react-hook-form.tsx',
      'base-ui/min/react-hook-form': 'src/base-ui-react-hook-form.tsx',
    },
    deps: {
      neverBundle: externalDependencies,
    },
    format: ['esm'],
    outDir: 'dist',
    platform: 'browser',
    sourcemap: false,
    target: browserTarget,
  },
  {
    clean: false,
    dts: true,
    entry: {
      'metadata/custom': 'src/metadata/custom.ts',
      'metadata/max': 'src/metadata/max.ts',
      'metadata/min': 'src/metadata/min.ts',
      'metadata/mobile': 'src/metadata/mobile.ts',
      server: 'src/server.ts',
    },
    deps: {
      neverBundle: externalDependencies,
    },
    format: ['esm'],
    outDir: 'dist',
    platform: 'neutral',
    sourcemap: true,
    target: 'es2024',
  },
  {
    clean: false,
    define: browserDefine,
    dts: true,
    entry: {
      'react-hook-form': 'src/react-hook-form.tsx',
    },
    deps: {
      neverBundle: externalDependencies,
    },
    format: ['esm'],
    outDir: 'dist',
    platform: 'browser',
    sourcemap: true,
    target: browserTarget,
  },
  {
    clean: false,
    dts: true,
    entry: {
      zod: 'src/zod.ts',
    },
    deps: {
      neverBundle: externalDependencies,
    },
    format: ['esm'],
    outDir: 'dist',
    platform: 'neutral',
    sourcemap: true,
    target: 'es2024',
  },
]);
