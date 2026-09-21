import metadata from 'libphonenumber-js/metadata.min.json';

import { type PhoneMetadata, validatePhoneMetadata } from '../phone-metadata-core';

const phoneMetadata: PhoneMetadata = validatePhoneMetadata(metadata);

export default phoneMetadata;
