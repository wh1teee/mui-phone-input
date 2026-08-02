import { resolveNumberingPlan } from '@whiteee/mui-phone-input/server';

import { PhoneInputSmoke } from './phone-input-smoke';

export default function Page() {
  const serverPlans = {
    empty: resolveNumberingPlan(undefined).kind,
    geographic: resolveNumberingPlan('+375291234567').kind,
    nonGeographic: resolveNumberingPlan('+80012345678').kind,
    territory: resolveNumberingPlan('+358412345678', { selectedCountry: 'AX' }).kind,
    unresolved: resolveNumberingPlan('+1').kind,
  };

  return (
    <main>
      <h1>Packed Next.js consumer</h1>
      <output data-testid="server-plan-matrix">{JSON.stringify(serverPlans)}</output>
      <PhoneInputSmoke />
    </main>
  );
}
