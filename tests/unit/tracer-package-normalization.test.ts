import { describe, expect, it } from 'vitest';

import { normalizeTracerClosure } from '../../scripts/lib/tracer-package-normalization.mjs';

describe('tracer package closure normalization', () => {
  it('removes paired Rolldown region markers and ignores store topology', () => {
    const localStore = [
      'const before = 1;',
      '//#region ../../node_modules/@maskito/core/index.esm.js',
      'const bundled = 2;',
      '//#endregion',
      'export { bundled };',
    ].join('\n');
    const globalStore = localStore.replace(
      '../../node_modules',
      '../../../../../../../var/cache/ci/pnpm/store-views/1000/v11/links',
    );

    expect(normalizeTracerClosure(localStore)).toBe(
      normalizeTracerClosure(globalStore),
    );
    expect(normalizeTracerClosure(localStore)).toBe(
      ['const before = 1;', 'const bundled = 2;', 'export { bundled };'].join('\n'),
    );
  });

  it('preserves executable text and unrelated source-map comments', () => {
    const source = [
      'const marker = "//#region user content";',
      '//# sourceMappingURL=index.js.map',
    ].join('\n');

    expect(normalizeTracerClosure(source)).toBe(source);
  });

  it('fails closed when Rolldown emits an unbalanced region structure', () => {
    expect(() => normalizeTracerClosure('//#region package\nconst value = 1;')).toThrow(
      /1 region starts but 0 region ends/u,
    );
  });
});
