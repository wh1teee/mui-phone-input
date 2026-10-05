import type { ReactNode } from 'react';
import { highlight } from 'sugar-high';

import { CopyButton } from './copy-button';
import { DocsToc, type TocGroup } from './docs-toc';

export type { TocGroup };

const REPOSITORY_URL = 'https://github.com/wh1teee/mui-phone-input';
const NPM_URL = 'https://www.npmjs.com/package/@wh1teee/mui-phone-input';

export function DocsHeader() {
  return (
    <header className="docs-header">
      <div className="docs-header-inner">
        <a className="docs-brand" href="/" aria-label="Phone Input documentation home">
          <span className="docs-brand-mark" aria-hidden="true">
            +
          </span>
          <span>Phone Input</span>
          <span className="docs-badge">v1.x</span>
        </a>
        <nav className="docs-nav" aria-label="Documentation">
          <a href="/#quick-start">Docs</a>
          <a href="/playground">Playground</a>
          <a href="/migration">Migration</a>
          <a href={REPOSITORY_URL}>GitHub</a>
          <a href={NPM_URL}>npm</a>
        </nav>
      </div>
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
      <main id="docs-content" className="docs-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="docs-footer">
        <span>MIT licensed · numbering data from libphonenumber-js</span>
        <span>
          <a href={REPOSITORY_URL}>GitHub</a>
          <a href={NPM_URL}>npm</a>
          <a href={`${REPOSITORY_URL}/blob/main/packages/mui-phone-input/CHANGELOG.md`}>
            Changelog
          </a>
          <a href={`${REPOSITORY_URL}/discussions/new?category=q-a`}>Ask a question</a>
        </span>
      </footer>
    </div>
  );
}

/** Two-column reference layout: a sticky section index beside readable prose. */
export function DocsLayout({
  children,
  toc,
}: {
  children: ReactNode;
  toc: readonly TocGroup[];
}) {
  return (
    <div className="docs-layout">
      <DocsToc toc={toc} />
      <div className="docs-content">{children}</div>
    </div>
  );
}

export function CodeBlock({ children, title }: { children: string; title?: string }) {
  const label = title ?? 'tsx';
  // Shell snippets stay plain; everything else is TypeScript/JSX.
  const isShell = label === 'Terminal';
  return (
    <figure className="docs-code-block">
      <figcaption>
        <span>{label}</span>
        <CopyButton text={children} />
      </figcaption>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Horizontally scrollable code must be keyboard-reachable. */}
      <pre className="docs-code" data-language={isShell ? 'shell' : 'tsx'} tabIndex={0}>
        {isShell ? (
          <code>{children}</code>
        ) : (
          <code
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sugar-high escapes the static snippet source and only adds token spans.
            dangerouslySetInnerHTML={{ __html: highlight(children) }}
          />
        )}
      </pre>
    </figure>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return <aside className="docs-callout">{children}</aside>;
}

export function Section({
  children,
  id,
  lead,
  title,
}: {
  children: ReactNode;
  id: string;
  lead?: ReactNode;
  title: string;
}) {
  return (
    <section className="docs-section" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>
        <a href={`#${id}`}>{title}</a>
      </h2>
      {lead ? <p className="docs-lead">{lead}</p> : null}
      {children}
    </section>
  );
}
