import {
  parseNationalPhoneValue,
  resolveNumberingPlan,
} from '@wh1teee/mui-phone-input/server';
import { createPhoneFormSchema } from '@wh1teee/mui-phone-input/zod';

import { PhoneInputSmoke } from './phone-input-smoke';

export default function Page() {
  const adapterResult = createPhoneFormSchema().parse({
    extension: '42',
    phone: '+375291234567',
  });
  const serverPlans = {
    empty: resolveNumberingPlan(undefined).kind,
    geographic: resolveNumberingPlan('+375291234567').kind,
    nonGeographic: resolveNumberingPlan('+80012345678').kind,
    national: parseNationalPhoneValue('80291234567', 'BY'),
    territory: resolveNumberingPlan('+358412345678', { selectedCountry: 'AX' }).kind,
    unresolved: resolveNumberingPlan('+1').kind,
  };

  return (
    <main>
      <h1>Packed Next.js consumer</h1>
      <output data-testid="server-plan-matrix">{JSON.stringify(serverPlans)}</output>
      <output data-testid="zod-adapter-result">{JSON.stringify(adapterResult)}</output>
      <PhoneInputSmoke />
    </main>
  );
}
