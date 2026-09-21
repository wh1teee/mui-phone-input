import metadata from 'libphonenumber-js/metadata.max.json';

import { type PhoneMetadata, validatePhoneMetadata } from '../phone-metadata-core';

const phoneMetadata: PhoneMetadata = validatePhoneMetadata(metadata);

export default phoneMetadata;
