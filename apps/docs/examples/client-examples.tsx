'use client';

import { createTheme } from '@mui/material/styles';
import {
  MuiPhoneInput,
  muiPhoneInputClasses,
  type PhoneExtension,
  type PhoneValue,
} from '@wh1teee/mui-phone-input';
import { ru } from '@wh1teee/mui-phone-input/locales/ru';
import { MuiPhoneInputController } from '@wh1teee/mui-phone-input/react-hook-form';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

type ContactForm = {
  extension: PhoneExtension;
  phone: PhoneValue;
};

export const compiledDocsTheme = createTheme({
  components: {
    MuiPhoneInput: {
      defaultProps: { validationDisplay: 'blur' },
      styleOverrides: {
        root: {
          variants: [
            {
              props: { size: 'small' },
              style: {
                [`& .${muiPhoneInputClasses.input}`]: {
                  fontVariantNumeric: 'tabular-nums',
                },
              },
            },
          ],
        },
      },
    },
  },
});

export function CompiledCoreExample() {
  const [phone, setPhone] = useState<PhoneValue>();

  return (
    <MuiPhoneInput
      defaultCountry="US"
      label="Phone"
      onChange={setPhone}
      slotProps={{
        countrySelector: {
          locale: ru.locale,
          messages: ru.messages,
          preferredCountries: ['US', 'CA'],
          resultLimit: 50,
        },
      }}
      value={phone}
    />
  );
}

export function CompiledReactHookFormExample() {
  const form = useForm<ContactForm>({
    defaultValues: async () => ({
      extension: '42',
      phone: '+12025550123',
    }),
    shouldFocusError: true,
  });

  return (
    <MuiPhoneInputController
      control={form.control}
      extensionName="extension"
      extensionPresentation="separate"
      name="phone"
      rules={{ required: 'Phone is required' }}
    />
  );
}
