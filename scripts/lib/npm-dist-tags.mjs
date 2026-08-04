const bootstrapVersion = '0.1.0-next.0';

export function assertEarlyCanaryDistTags(distTags, expectedVersion) {
  if (distTags.next !== expectedVersion) {
    throw new Error(`The next dist-tag must point to ${expectedVersion}.`);
  }

  if (distTags.latest !== bootstrapVersion) {
    throw new Error(
      `The latest dist-tag must remain on ${bootstrapVersion} until stable promotion.`,
    );
  }
}
