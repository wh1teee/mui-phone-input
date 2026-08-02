'use client';

import '@whiteee/mui-phone-input';

import TextField from '@mui/material/TextField';

export function PhoneInputSmoke() {
  return (
    <TextField label="Phone number" slotProps={{ htmlInput: { inputMode: 'tel' } }} />
  );
}
