const FIELD_LABELS = {
  examples: 'Examples',
  numberType: 'Number type',
  possibility: 'Possibility',
  possibleCountries: 'Possible countries',
  resolvedCountry: 'Resolved country',
  strictValidity: 'Strict validity',
};

function stableValue(value) {
  return JSON.stringify(value);
}

export function diffMetadataSemanticSnapshots(before, after) {
  const changes = [];
  const presetNames = new Set([
    ...Object.keys(before.presets ?? {}),
    ...Object.keys(after.presets ?? {}),
  ]);

  for (const preset of [...presetNames].sort()) {
    const beforePreset = before.presets?.[preset] ?? { examples: {}, numbers: {} };
    const afterPreset = after.presets?.[preset] ?? { examples: {}, numbers: {} };
    const numberIds = new Set([
      ...Object.keys(beforePreset.numbers ?? {}),
      ...Object.keys(afterPreset.numbers ?? {}),
    ]);

    for (const id of [...numberIds].sort()) {
      const beforeNumber = beforePreset.numbers?.[id] ?? {};
      const afterNumber = afterPreset.numbers?.[id] ?? {};
      for (const field of [
        'possibility',
        'strictValidity',
        'resolvedCountry',
        'possibleCountries',
        'numberType',
      ]) {
        if (stableValue(beforeNumber[field]) !== stableValue(afterNumber[field])) {
          changes.push({
            after: afterNumber[field],
            before: beforeNumber[field],
            field,
            id,
            preset,
          });
        }
      }
    }

    if (
      stableValue(beforePreset.examples ?? {}) !==
      stableValue(afterPreset.examples ?? {})
    ) {
      changes.push({
        after: afterPreset.examples ?? {},
        before: beforePreset.examples ?? {},
        field: 'examples',
        id: 'mobile-examples',
        preset,
      });
    }
  }

  return changes;
}

function markdownValue(value) {
  return `\`${stableValue(value)}\``;
}

export function renderMetadataSemanticDiff(before, after, changes) {
  const lines = [
    '# libphonenumber metadata semantic diff',
    '',
    `Dependency: \`${before.version ?? 'unknown'}\` → \`${after.version ?? 'unknown'}\``,
    '',
    '## Review policy',
    '',
    '- Human review required for every semantic change.',
    '- Changeset required before merge.',
    '- Never auto-merge metadata semantic changes.',
    '',
    '## Semantic fields',
    '',
    '- Possibility',
    '- Strict validity',
    '- Resolved country',
    '- Possible countries',
    '- Number type',
    '- Examples',
    '',
  ];

  if (changes.length === 0) {
    lines.push('No golden-corpus semantic changes detected.', '');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Changes', '');
  for (const change of changes) {
    lines.push(
      `- **${change.preset} / ${change.id} / ${FIELD_LABELS[change.field] ?? change.field}**: ${markdownValue(change.before)} → ${markdownValue(change.after)}`,
    );
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}
