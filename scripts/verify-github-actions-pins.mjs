import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import process from 'node:process';

const REQUIRED_FORMAT =
  'uses: owner/repository[/path]@<40 lowercase hexadecimal commit SHA> or uses: ./local-path';
const WORKFLOW_FILE_PATTERN = /\.ya?ml$/u;
const USES_KEY_PATTERN =
  /^(?<indent> *)(?:-\s*)?(?:uses|'uses'|"uses")\s*:\s*(?<value>.*)$/u;
const FLOW_USES_KEY_PATTERN =
  /(?:^|[{,]\s*)(?:uses|'uses'|"uses")\s*:\s*(?<value>'(?:[^']|'')*'|"(?:\\.|[^"\\])*"|[^,}]+)(?=\s*[,}])/u;
const FLOW_MAPPING_PREFIX_PATTERN =
  /^\s*(?:-\s*)?(?:(?:[A-Za-z0-9_.-]+|'(?:[^']|'')*'|"(?:\\.|[^"\\])*")\s*:\s*)?\{/u;
const BLOCK_SCALAR_PATTERN =
  /^(?<indent> *)(?:-\s*)?[^#\n]+:\s*[>|](?:(?:[+-][1-9]?)|(?:[1-9][+-]?))?\s*(?:#.*)?$/u;
const FULL_LOWERCASE_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const FULL_HEXADECIMAL_SHA_PATTERN = /^[0-9a-fA-F]{40}$/u;
const GITHUB_REFERENCE_PATH_PATTERN =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u;

const parseSingleQuotedScalar = (source) => {
  let value = '';

  for (let index = 1; index < source.length; index += 1) {
    if (source[index] !== "'") {
      value += source[index];
      continue;
    }

    if (source[index + 1] === "'") {
      value += "'";
      index += 1;
      continue;
    }

    const trailing = source.slice(index + 1).trimStart();
    if (trailing !== '' && !trailing.startsWith('#')) {
      return { error: 'unexpected content after the quoted uses value' };
    }

    return { value };
  }

  return { error: 'unterminated single-quoted uses value' };
};

const parseDoubleQuotedScalar = (source) => {
  let escaped = false;

  for (let index = 1; index < source.length; index += 1) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (source[index] === '\\') {
      escaped = true;
      continue;
    }

    if (source[index] !== '"') {
      continue;
    }

    const quotedValue = source.slice(0, index + 1);
    const trailing = source.slice(index + 1).trimStart();
    if (trailing !== '' && !trailing.startsWith('#')) {
      return { error: 'unexpected content after the quoted uses value' };
    }

    try {
      return { value: JSON.parse(quotedValue) };
    } catch {
      return { error: 'invalid double-quoted uses value' };
    }
  }

  return { error: 'unterminated double-quoted uses value' };
};

const parseUnquotedScalar = (source) => {
  let commentIndex = source.length;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '#' && (index === 0 || /\s/u.test(source[index - 1] ?? ''))) {
      commentIndex = index;
      break;
    }
  }

  const value = source.slice(0, commentIndex).trim();
  if (value === '') {
    return { error: 'missing uses value' };
  }

  return { value };
};

const parseUsesScalar = (source) => {
  const trimmed = source.trimStart();

  if (trimmed.startsWith("'")) {
    return parseSingleQuotedScalar(trimmed);
  }

  if (trimmed.startsWith('"')) {
    return parseDoubleQuotedScalar(trimmed);
  }

  return parseUnquotedScalar(trimmed);
};

const stripYamlComment = (source) => {
  let inDoubleQuotes = false;
  let inSingleQuotes = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inDoubleQuotes) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inDoubleQuotes = false;
      }
      continue;
    }

    if (inSingleQuotes) {
      if (character !== "'") {
        continue;
      }

      if (source[index + 1] === "'") {
        index += 1;
      } else {
        inSingleQuotes = false;
      }
      continue;
    }

    if (character === '"') {
      inDoubleQuotes = true;
      continue;
    }

    if (character === "'") {
      inSingleQuotes = true;
      continue;
    }

    if (character === '#' && (index === 0 || /\s/u.test(source[index - 1] ?? ''))) {
      return source.slice(0, index);
    }
  }

  return source;
};

const validateExternalReference = (reference) => {
  if (reference.startsWith('./')) {
    return null;
  }

  if (reference.startsWith('docker://')) {
    return 'Docker action references are not permitted by this commit-SHA policy';
  }

  const atIndex = reference.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === reference.length - 1) {
    return 'external action or reusable workflow reference is malformed';
  }

  const repositoryPath = reference.slice(0, atIndex);
  const revision = reference.slice(atIndex + 1);

  if (!GITHUB_REFERENCE_PATH_PATTERN.test(repositoryPath)) {
    return 'external action or reusable workflow repository path is malformed';
  }

  if (FULL_LOWERCASE_SHA_PATTERN.test(revision)) {
    return null;
  }

  if (FULL_HEXADECIMAL_SHA_PATTERN.test(revision)) {
    return 'full commit SHA must use lowercase hexadecimal characters';
  }

  return 'external action or reusable workflow must use a full 40-character commit SHA';
};

const inspectWorkflowSource = (source, file) => {
  const findings = [];
  const lines = source.replace(/^\uFEFF/u, '').split(/\r?\n/u);
  let blockScalarIndent = null;
  let externalCount = 0;
  let localCount = 0;

  const inspectUsesValue = (rawValue, lineNumber) => {
    const parsed = parseUsesScalar(rawValue);
    if ('error' in parsed) {
      findings.push({
        file,
        line: lineNumber,
        reason: parsed.error,
        reference: rawValue.trim() || '<missing>',
      });
      return;
    }

    const reason = validateExternalReference(parsed.value);
    if (parsed.value.startsWith('./')) {
      localCount += 1;
    } else {
      externalCount += 1;
    }

    if (reason !== null) {
      findings.push({
        file,
        line: lineNumber,
        reason,
        reference: parsed.value,
      });
    }
  };

  for (const [lineIndex, line] of lines.entries()) {
    const trimmed = line.trim();

    if (blockScalarIndent !== null) {
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue;
      }

      const indentation = line.length - line.trimStart().length;
      if (indentation > blockScalarIndent) {
        continue;
      }

      blockScalarIndent = null;
    }

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const usesMatch = line.match(USES_KEY_PATTERN);
    if (usesMatch?.groups) {
      inspectUsesValue(usesMatch.groups.value ?? '', lineIndex + 1);
      continue;
    }

    const uncommentedLine = stripYamlComment(line);
    const flowUsesMatch = FLOW_MAPPING_PREFIX_PATTERN.test(uncommentedLine)
      ? uncommentedLine.match(FLOW_USES_KEY_PATTERN)
      : null;
    if (flowUsesMatch?.groups) {
      inspectUsesValue(flowUsesMatch.groups.value ?? '', lineIndex + 1);
      continue;
    }

    const blockScalarMatch = line.match(BLOCK_SCALAR_PATTERN);
    if (blockScalarMatch?.groups) {
      blockScalarIndent = (blockScalarMatch.groups.indent ?? '').length;
    }
  }

  return { externalCount, findings, localCount };
};

const collectWorkflowFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectWorkflowFiles(path)));
    } else if (entry.isFile() && WORKFLOW_FILE_PATTERN.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
};

const workflowsDirectory = resolve(process.argv[2] ?? '.github/workflows');
const workflowFiles = await collectWorkflowFiles(workflowsDirectory);
const findings = [];
let externalCount = 0;
let localCount = 0;

for (const workflowFile of workflowFiles) {
  const displayPath = relative(process.cwd(), workflowFile) || workflowFile;
  const result = inspectWorkflowSource(
    await readFile(workflowFile, 'utf8'),
    displayPath,
  );
  externalCount += result.externalCount;
  localCount += result.localCount;
  findings.push(...result.findings);
}

if (findings.length > 0) {
  console.error('GitHub Actions pin verification failed:');
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line}: ${finding.reference} (${finding.reason})`,
    );
    console.error(`  Required format: ${REQUIRED_FORMAT}`);
  }
  console.error(`Found ${findings.length} invalid uses reference(s).`);
  process.exitCode = 1;
} else {
  console.log(
    `GitHub Actions pins verified: ${externalCount} external and ${localCount} local uses reference(s) across ${workflowFiles.length} workflow file(s).`,
  );
}
