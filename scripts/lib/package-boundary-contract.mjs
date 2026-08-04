import assert from 'node:assert/strict';

import ts from 'typescript';

export const packageBoundaryKinds = new Set(['client', 'data-only', 'neutral']);

function parseJavaScriptModule(source, filename) {
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS,
  );

  assert.deepEqual(
    sourceFile.parseDiagnostics,
    [],
    `${filename} must remain valid JavaScript while checking its package boundary.`,
  );
  return sourceFile;
}

function readDirectivePrologue(sourceFile) {
  const directives = [];

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    ) {
      break;
    }
    directives.push(statement.expression.text);
  }

  return directives;
}

export function verifyJavaScriptPackageBoundary({
  boundary,
  filename,
  source,
  subpath,
}) {
  assert.ok(
    boundary === 'client' || boundary === 'neutral',
    `${subpath} has an invalid JavaScript boundary: ${boundary}.`,
  );

  const directives = readDirectivePrologue(parseJavaScriptModule(source, filename));
  if (boundary === 'client') {
    assert.equal(
      directives[0],
      'use client',
      `${subpath} must begin with a recognized "use client" directive.`,
    );
    return;
  }

  assert.ok(
    !directives.includes('use client'),
    `${subpath} must remain neutral and must not acquire a "use client" directive.`,
  );
}

export function removeLeadingClientDirective(source, filename) {
  const sourceFile = parseJavaScriptModule(source, filename);
  const firstStatement = sourceFile.statements[0];

  assert.ok(
    firstStatement &&
      ts.isExpressionStatement(firstStatement) &&
      ts.isStringLiteral(firstStatement.expression) &&
      firstStatement.expression.text === 'use client',
    `${filename} does not begin with a recognized "use client" directive.`,
  );

  const directiveStart = firstStatement.getStart(sourceFile);
  const trailingLineBreak =
    source.slice(firstStatement.end).match(/^\r?\n/u)?.[0] ?? '';
  return `${source.slice(0, directiveStart)}${source.slice(
    firstStatement.end + trailingLineBreak.length,
  )}`;
}
