import type { ReactNode } from 'react';

export function DocsHeader() {
  return (
    <header className="docs-header">
      <a href="/" aria-label="MUI Phone Input documentation home">
        <strong>@wh1teee/mui-phone-input</strong>
      </a>
      <nav className="docs-nav" aria-label="Documentation">
        <a href="/#quick-start">Quick start</a>
        <a href="/playground">Playground</a>
        <a href="/#phone-semantics">API</a>
        <a href="/#forms">Examples</a>
        <a href="/migration">Migration</a>
        <a href="/#release-status">Release status</a>
      </nav>
    </header>
  );
}

export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <main className="docs-shell">
      <DocsHeader />
      {children}
    </main>
  );
}

export function ReleaseStatus() {
  return (
    <aside className="docs-status" id="release-status" aria-labelledby="release-title">
      <p className="docs-kicker">Release gate</p>
      <h2 id="release-title">
        Automated evidence is green; physical-device evidence is pending
      </h2>
      <p>
        Browser automation and the WCAG 2.2 AA automated contract have been proven in
        the repository. Bead <code>mpi-oan.24</code> remains the mandatory
        physical-device and assistive-technology gate. No iOS, Android, VoiceOver, NVDA,
        or JAWS result is treated as passed while that evidence is unavailable.
      </p>
      <p>
        A release candidate cannot publish until <code>mpi-oan.24</code> is genuinely
        resolved or its residual gaps receive explicit owner approval.
      </p>
    </aside>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="docs-code">
      <code>{children}</code>
    </pre>
  );
}

export function Section({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section className="docs-section" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}
