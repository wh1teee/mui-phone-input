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
    <div className="docs-shell">
      <a className="docs-skip-link" href="#docs-content">
        Skip to content
      </a>
      <DocsHeader />
      <main id="docs-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

export function ReleaseStatus() {
  return (
    <aside className="docs-status" id="release-status" aria-labelledby="release-title">
      <p className="docs-kicker">Stable release</p>
      <h2 id="release-title">Stable 1.x is live on npm</h2>
      <p>
        Install <code>@wh1teee/mui-phone-input</code> from the default{' '}
        <code>latest</code> tag or pin an exact 1.x version. Docs follow current source,
        so check the changelog when you need exact registry parity. The historical{' '}
        <code>0.1.0-next.x</code> prereleases remain on the <code>next</code> tag only
        for reproducibility; do not use them for new work.
      </p>
      <p>
        Physical iOS/Android and desktop screen-reader runs were unavailable in the
        current device lab. They remain documented residual gaps and are not represented
        as passing evidence.
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
