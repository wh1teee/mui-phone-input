const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;

export function resolveReleaseChannel(version) {
  const match = version.match(semverPattern);
  if (!match) throw new Error(`Unsupported package version: ${version}`);
  const prerelease = match[4] !== undefined;
  return Object.freeze({
    distTag: prerelease ? 'next' : 'latest',
    prerelease,
    releaseTag: `v${version}`,
  });
}
