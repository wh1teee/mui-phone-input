import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import type { NextConfig } from 'next';

import { resolveBoundedTurbopackRoot } from './turbopack-root';

const require = createRequire(import.meta.url);
const workspaceRoot = resolve(process.cwd());
const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: resolveBoundedTurbopackRoot({
      nextPackageManifest: require.resolve('next/package.json'),
      workspaceRoot,
    }),
  },
};

export default config;
