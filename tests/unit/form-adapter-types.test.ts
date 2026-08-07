import { describe, expectTypeOf, it } from 'vitest';

import type { PhoneExtension } from '../../packages/mui-phone-input/src/phone-extension';
import type { PhoneValue } from '../../packages/mui-phone-input/src/phone-value';
import type {
  MuiPhoneInputControllerProps,
  PhoneControllerFieldPath,
  PhoneExtensionControllerFieldPath,
} from '../../packages/mui-phone-input/src/react-hook-form';

type ContactForm = {
  contacts: Array<{
    extension: PhoneExtension;
    phone: PhoneValue;
  }>;
  extension: PhoneExtension;
  phone: PhoneValue;
  unrelated: number;
};

describe('form adapter type inference', () => {
  it('restricts RHF phone and extension names to compatible value paths', () => {
    expectTypeOf<PhoneControllerFieldPath<ContactForm>>().toEqualTypeOf<
      'phone' | `contacts.${number}.phone`
    >();
    expectTypeOf<PhoneExtensionControllerFieldPath<ContactForm>>().toEqualTypeOf<
      'extension' | `contacts.${number}.extension`
    >();
  });

  it('preserves precise controller prop names for separate bindings', () => {
    type Props = MuiPhoneInputControllerProps<ContactForm, 'phone', 'extension'>;

    expectTypeOf<Props['name']>().toEqualTypeOf<'phone'>();
    expectTypeOf<Props['extensionName']>().toEqualTypeOf<'extension' | undefined>();
  });
});
