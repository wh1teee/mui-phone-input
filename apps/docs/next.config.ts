import { resolve } from 'node:path';

import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: resolve(process.cwd(), '../..'),
  },
};

export default config;
