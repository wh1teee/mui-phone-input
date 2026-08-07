import { describe, expect, test, vi } from 'vitest';

import { warnInvalidAccessibilitySlot } from '../../packages/mui-phone-input/src/internal/accessibility-diagnostics';

describe('accessibility slot diagnostics', () => {
  test('reports actionable missing accessibility props once per custom slot', () => {
    const warnedSlots = new Set<string>();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      warnInvalidAccessibilitySlot(warnedSlots, 'htmlInput', [
        'aria-invalid',
        'labeling',
        'ref',
      ]);
      warnInvalidAccessibilitySlot(warnedSlots, 'htmlInput', ['aria-invalid']);

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringMatching(
          /custom htmlInput slot.*aria-invalid, labeling, ref.*Spread the prepared props.*forward the received ref/iu,
        ),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  test('stays silent when a custom slot preserves the contract', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      warnInvalidAccessibilitySlot(new Set<string>(), 'Country Selector option', []);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
