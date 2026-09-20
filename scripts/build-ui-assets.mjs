import { copyFile } from 'node:fs/promises';

await copyFile(
  new URL('../packages/mui-phone-input/src/shadcn.css', import.meta.url),
  new URL('../packages/mui-phone-input/dist/shadcn.css', import.meta.url),
);
