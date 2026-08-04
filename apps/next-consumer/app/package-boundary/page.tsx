import { MuiPhoneInput } from '@whiteee/mui-phone-input';

export default function PackageBoundaryPage() {
  return (
    <main>
      <h1>Direct package-owned client boundary</h1>
      <MuiPhoneInput
        defaultCountry="BY"
        label="Direct package boundary phone"
        slotProps={{
          countrySelector: {
            'data-testid': 'direct-package-boundary-country',
            mode: 'desktop',
          },
          htmlInput: { 'data-testid': 'direct-package-boundary-input' },
        }}
      />
    </main>
  );
}
