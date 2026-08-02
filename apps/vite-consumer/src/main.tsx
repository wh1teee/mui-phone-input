import '@whiteee/mui-phone-input';
import '@whiteee/mui-phone-input/server';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const theme = createTheme({ cssVariables: true });
const root = document.querySelector('#root');

if (!root) {
  throw new Error('Missing Vite consumer root element.');
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <main>
        <h1>Packed Vite consumer</h1>
        <TextField
          label="Phone number"
          slotProps={{ htmlInput: { inputMode: 'tel' } }}
        />
      </main>
    </ThemeProvider>
  </StrictMode>,
);
