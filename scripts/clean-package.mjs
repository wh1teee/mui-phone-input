import { rm } from 'node:fs/promises';

await rm(new URL('../packages/mui-phone-input/dist', import.meta.url), {
  force: true,
  recursive: true,
});
