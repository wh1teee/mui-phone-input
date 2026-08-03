import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const POLICY_PATH = 'docs/security/production-dependency-policy.json';

function runPnpm(args, { allowFailure = false } = {}) {
  const result = spawnSync('pnpm', args, {
    encoding: 'utf8',
    env: process.env,
  });
  const output = result.stdout || result.stderr;

  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `pnpm ${args.join(' ')} failed with status ${result.status}.\n${output}`,
    );
  }

  return { output, status: result.status };
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/u.exec(version);
  assert.ok(match, `Expected a stable semver version, received ${version}.`);
  return match.slice(1).map(Number);
}

function versionAtLeast(version, minimum) {
  const actualParts = parseVersion(version);
  const minimumParts = parseVersion(minimum);

  for (let index = 0; index < minimumParts.length; index += 1) {
    if (actualParts[index] !== minimumParts[index]) {
      return actualParts[index] > minimumParts[index];
    }
  }
  return true;
}

function collectVersions(value, packageName, versions = new Set()) {
  if (!value || typeof value !== 'object') {
    return versions;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (
      key === packageName &&
      entry &&
      typeof entry === 'object' &&
      typeof entry.version === 'string'
    ) {
      versions.add(entry.version);
    }
    collectVersions(entry, packageName, versions);
  }

  return versions;
}

function normalizeAdvisories(audit) {
  if (audit.advisories && typeof audit.advisories === 'object') {
    return Object.entries(audit.advisories).map(([id, advisory]) => ({
      id: /GHSA-[\w-]+/iu.exec(advisory.url ?? '')?.[0] ?? id,
      module: advisory.module_name,
      severity: advisory.severity,
      title: advisory.title,
      url: advisory.url,
    }));
  }

  if (audit.vulnerabilities && typeof audit.vulnerabilities === 'object') {
    return Object.entries(audit.vulnerabilities).map(([module, advisory]) => {
      const detail = advisory.via?.find((entry) => typeof entry === 'object');
      return {
        id:
          /GHSA-[\w-]+/iu.exec(detail?.url ?? '')?.[0] ??
          String(detail?.source ?? module),
        module,
        severity: advisory.severity,
        title: advisory.name ?? module,
        url: detail?.url,
      };
    });
  }

  return [];
}

function validateAllowlist(entries) {
  const today = new Date().toISOString().slice(0, 10);
  const ids = new Set();

  for (const entry of entries) {
    assert.equal(typeof entry.id, 'string');
    assert.ok(!ids.has(entry.id), `Duplicate advisory allowlist entry ${entry.id}.`);
    ids.add(entry.id);
    assert.equal(typeof entry.reason, 'string');
    assert.ok(entry.reason.length > 0, `Advisory ${entry.id} requires a reason.`);
    assert.match(entry.expiresOn, /^\d{4}-\d{2}-\d{2}$/u);
    assert.ok(
      entry.expiresOn >= today,
      `Advisory allowlist entry ${entry.id} expired on ${entry.expiresOn}.`,
    );
  }
}

const policy = JSON.parse(await readFile(POLICY_PATH, 'utf8'));
const workspacePolicy = await readFile('pnpm-workspace.yaml', 'utf8');
assert.equal(policy.schemaVersion, 1);
validateAllowlist(policy.allowedAdvisories);

for (const [packageName, overrideVersion] of Object.entries(policy.overrides)) {
  assert.ok(
    versionAtLeast(overrideVersion, policy.minimumVersions[packageName]),
    `${packageName}@${overrideVersion} is below its policy floor.`,
  );
  assert.match(
    workspacePolicy,
    new RegExp(
      `['"]?next@16\\.2\\.12>${packageName}['"]?:\\s*${overrideVersion.replaceAll('.', '\\.')}`,
      'u',
    ),
    `Missing scoped Next.js override for ${packageName}@${overrideVersion}.`,
  );
}

const productionTree = JSON.parse(
  runPnpm([
    'list',
    ...Object.keys(policy.minimumVersions),
    '--prod',
    '--json',
    '--depth',
    'Infinity',
  ]).output,
);

for (const [packageName, minimumVersion] of Object.entries(policy.minimumVersions)) {
  const versions = [...collectVersions(productionTree, packageName)];
  assert.ok(versions.length > 0, `Expected ${packageName} in the production graph.`);
  for (const version of versions) {
    assert.ok(
      versionAtLeast(version, minimumVersion),
      `${packageName}@${version} is below the required floor ${minimumVersion}.`,
    );
  }
}

const auditResult = runPnpm(['audit', '--prod', '--json'], { allowFailure: true });
const audit = JSON.parse(auditResult.output);
const advisories = normalizeAdvisories(audit);
const allowedIds = new Set(policy.allowedAdvisories.map((entry) => String(entry.id)));
const forbidden = advisories.filter(
  (advisory) =>
    advisory.severity === 'high' ||
    advisory.severity === 'critical' ||
    !allowedIds.has(String(advisory.id)),
);

assert.deepEqual(
  forbidden,
  [],
  `Production dependency audit reported unaccepted advisories:\n${JSON.stringify(forbidden, null, 2)}`,
);

console.log('Production dependency policy verified.');
