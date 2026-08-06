import { defineConfig } from 'tsdown';

const externalDependencies = [
  '@maskito/core',
  '@maskito/react',
  'libphonenumber-js',
  '@emotion/react',
  '@emotion/styled',
  '@mui/material',
  'react',
  'react-dom',
];

export default defineConfig([
  {
    clean: true,
    define: {
      'process.env.NODE_ENV': 'process.env.NODE_ENV',
    },
    dts: true,
    entry: {
      index: 'src/index.ts',
    },
    deps: {
      neverBundle: externalDependencies,
    },
    format: ['esm'],
    outDir: 'dist',
    platform: 'browser',
    sourcemap: true,
    target: ['Chrome117', 'Edge121', 'Firefox121', 'Safari17'],
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
]);
