import defaultMetadata from '#phone-default-metadata';

import { type PhoneMetadata, validatePhoneMetadata } from './phone-metadata-core';

export type { PhoneMetadata } from './phone-metadata-core';
export { validatePhoneMetadata } from './phone-metadata-core';

export const DEFAULT_PHONE_METADATA: PhoneMetadata =
  validatePhoneMetadata(defaultMetadata);
