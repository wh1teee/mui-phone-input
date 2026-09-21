import defaultMetadata from './metadata/default';

import { type PhoneMetadata, validatePhoneMetadata } from './phone-metadata-core';

export type { PhoneMetadata } from './phone-metadata-core';
export { validatePhoneMetadata } from './phone-metadata-core';

export const DEFAULT_PHONE_METADATA: PhoneMetadata =
  validatePhoneMetadata(defaultMetadata);
