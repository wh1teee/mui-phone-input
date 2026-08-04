import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const allowHumanGate = process.argv.includes('--allow-human-gate');
const packageManifest = JSON.parse(
  readFileSync('packages/mui-phone-input/package.json', 'utf8'),
);
const packageScope = packageManifest.name.match(/^@([^/]+)\//u)?.[1];
const repositoryOwner = packageManifest.repository?.url.match(
  /github\.com[/:]([^/]+)\//u,
)?.[1];

if (!packageScope || !repositoryOwner || packageScope !== repositoryOwner) {
  console.error(
    JSON.stringify(
      {
        action:
          'Make the npm package scope match the GitHub repository owner before publishing.',
        gate: 'mpi-g7a',
        package: packageManifest.name,
        repository: packageManifest.repository?.url,
        status: 'invalid-package-identity-contract',
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const result = spawnSync('npm', ['whoami'], {
  encoding: 'utf8',
  shell: false,
});

if (result.status === 0) {
  const identity = result.stdout.trim();
  if (identity !== packageScope) {
    console.error(
      JSON.stringify(
        {
          action: `Authenticate as ${packageScope} before publishing ${packageManifest.name}.`,
          gate: 'mpi-g7a',
          identity,
          package: packageManifest.name,
          status: 'authenticated-identity-mismatch',
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  console.log(
    JSON.stringify(
      {
        gate: 'mpi-g7a',
        identity,
        package: packageManifest.name,
        status: 'authenticated-package-identity-verified',
      },
      null,
      2,
    ),
  );
  process.exitCode = 0;
} else {
  console.error(
    JSON.stringify(
      {
        action: `Authenticate with npm as ${packageScope}, then rerun.`,
        gate: 'mpi-g7a',
        package: packageManifest.name,
        status: 'blocked',
      },
      null,
      2,
    ),
  );
  process.exitCode = allowHumanGate ? 0 : 2;
}
