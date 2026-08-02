import { spawnSync } from 'node:child_process';

const allowHumanGate = process.argv.includes('--allow-human-gate');
const result = spawnSync('npm', ['whoami'], {
  encoding: 'utf8',
  shell: false,
});

if (result.status === 0) {
  console.log(
    JSON.stringify(
      {
        gate: 'mpi-g7a',
        identity: result.stdout.trim(),
        status: 'authenticated-owner-verification-required',
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
        action: 'Authenticate with npm, verify @whiteee scope ownership, then rerun.',
        gate: 'mpi-g7a',
        status: 'blocked',
      },
      null,
      2,
    ),
  );
  process.exitCode = allowHumanGate ? 0 : 2;
}
