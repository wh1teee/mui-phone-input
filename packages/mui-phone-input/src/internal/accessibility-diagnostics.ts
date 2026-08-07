declare const process:
  | {
      env: {
        NODE_ENV?: string;
      };
    }
  | undefined;

function shouldWarnInDevelopment(): boolean {
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'production';
}

export function warnInvalidAccessibilitySlot(
  warnedSlots: Set<string>,
  slot: string,
  missing: readonly string[],
): void {
  if (!shouldWarnInDevelopment() || missing.length === 0 || warnedSlots.has(slot)) {
    return;
  }

  warnedSlots.add(slot);
  console.error(
    `[MuiPhoneInput] The custom ${slot} slot did not forward mandatory accessibility props/ref: ${missing.join(', ')}. Spread the prepared props onto the semantic element and forward the received ref.`,
  );
}
