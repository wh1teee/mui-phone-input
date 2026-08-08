import {
  resolveNumberingPlan,
  serializeRfc3966,
  validatePhoneValue,
} from '@wh1teee/mui-phone-input/server';
import { createPhoneFormSchema } from '@wh1teee/mui-phone-input/zod';

import { DocsShell, ReleaseStatus } from '../docs-ui';
import { Playground } from './playground';

export default function PlaygroundPage() {
  const zodResult = createPhoneFormSchema({
    extension: { maxLength: 8 },
  }).parse({
    extension: '42',
    phone: '+12025550123',
  });
  const serverEvidence = {
    geographic: resolveNumberingPlan('+375291234567').kind,
    nonGeographic: resolveNumberingPlan('+80012345678').kind,
    possibleAccepted: validatePhoneValue('+12025550123').accepted,
    rfc3966: serializeRfc3966('+12025550123', '42'),
    unresolved: resolveNumberingPlan('+1').kind,
    zod: zodResult,
  };

  return (
    <DocsShell>
      <div className="docs-hero">
        <p className="docs-kicker">Interactive consumer</p>
        <h1>Playground</h1>
        <p>
          Every field below imports the real package surface. The playground contains no
          phone parser, calling-code table, validity table, or formatting authority of
          its own.
        </p>
      </div>

      <Playground />

      <section
        className="docs-section playground-server-proof"
        aria-labelledby="server-evidence-title"
      >
        <h2 id="server-evidence-title">Server entrypoint proof</h2>
        <p>
          This block is rendered by the Next.js Server Component from the package's
          <code>/server</code> and <code>/zod</code> subpaths before the interactive
          client playground hydrates.
        </p>
        <output data-testid="server-evidence">{JSON.stringify(serverEvidence)}</output>
      </section>

      <ReleaseStatus />
    </DocsShell>
  );
}
