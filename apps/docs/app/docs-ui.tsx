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
      <p className="docs-kicker">Release candidate</p>
      <h2 id="release-title">The release-candidate channel is live on npm</h2>
      <p>
        Install <code>@wh1teee/mui-phone-input@next</code> to use the latest published
        release candidate. These docs follow current source and can include fixes queued
        for the next immutable RC, so use the release notes when you need exact registry
        parity. Stable <code>1.0</code> remains intentionally separate from the RC
        channel until final consumer validation is complete.
      </p>
      <p>
        Physical iOS/Android and desktop screen-reader rows that were unavailable in the
        current device lab were accepted as explicit RC residual gaps. They are not
        represented as passing evidence.
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
