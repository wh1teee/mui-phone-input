import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '#phone-default-metadata': new URL(
        './packages/mui-phone-input/src/metadata/default-max.ts',
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    coverage: {
      enabled: false,
    },
    include: ['tests/unit/**/*.test.ts'],
  },
});
