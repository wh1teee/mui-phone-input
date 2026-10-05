'use client';

import { useEffect, useState } from 'react';

export type TocGroup = {
  title: string;
  links: ReadonlyArray<readonly [label: string, href: string]>;
};

/** Section index that marks the section currently being read. */
export function DocsToc({ toc }: { toc: readonly TocGroup[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = toc
      .flatMap((group) => group.links.map(([, href]) => href.slice(1)))
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // The first visible section in document order is the one being read.
        const current = sections.find((section) => visible.has(section.id));
        if (current) setActive(current.id);
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [toc]);

  return (
    <nav className="docs-toc" aria-label="On this page">
      {toc.map((group) => (
        <div className="docs-toc-group" key={group.title}>
          <span className="docs-toc-label">{group.title}</span>
          {group.links.map(([label, href]) => (
            <a
              aria-current={active === href.slice(1) ? 'location' : undefined}
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
