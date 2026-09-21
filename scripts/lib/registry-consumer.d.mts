export function createRegistryConsumerDependencies(manifest: {
  name: string;
  version: string;
  exports?: Record<string, unknown>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): Record<string, string>;
