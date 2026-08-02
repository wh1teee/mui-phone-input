import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

test('runs real input interaction in Vitest Browser Mode', async () => {
  render(<input aria-label="Phone number" inputMode="tel" />);

  const input = page.getByRole('textbox', { name: 'Phone number' });
  await input.fill('+375 29 123 45 67');

  await expect.element(input).toHaveValue('+375 29 123 45 67');
});
