import React from 'react';

function SectionHeading({ title }) {
  if (!title) return null;
  return <h3 className="mt-8 text-lg font-semibold text-white">{title}</h3>;
}

function Hero({ title, subtitle }) {
  return (
    <section className="mb-6">
      <h1 className="text-2xl font-bold text-white">{title || 'Your Name'}</h1>
      {subtitle ? <p className="mt-2 text-slate-300 whitespace-pre-line">{subtitle}</p> : null}
    </section>
  );
}

function List({ title, items = [], variant = 'bullets' }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className="mb-6">
      <SectionHeading title={title} />
      {variant === 'tags' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((it, idx) => (
            <span key={idx} className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-200">
              {typeof it === 'string' ? it : it?.title}
            </span>
          ))}
        </div>
      ) : (
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-200">
          {items.map((it, idx) => (
            <li key={idx}>
              {typeof it === 'string' ? (
                it
              ) : (
                <div>
                  <div className="font-medium">{it.title}</div>
                  {it.body ? <div className="text-slate-300 whitespace-pre-line">{it.body}</div> : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Grid({ title, items = [], columns = 2 }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const colClass = columns >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
  return (
    <section className="mb-6">
      <SectionHeading title={title} />
      <div className={`mt-3 grid grid-cols-1 gap-4 ${colClass}`}>
        {items.map((card, idx) => (
          <article key={idx} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h4 className="font-semibold text-white">{card.title}</h4>
            {card.body ? <p className="mt-1 text-sm text-slate-300 whitespace-pre-line">{card.body}</p> : null}
            {card.link && card.link.startsWith('https://') ? (
              <a
                href={card.link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-brand-200 underline-offset-4 hover:underline"
              >
                Visit
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function Contact({ items = [] }) {
  const chips = Array.isArray(items) ? items.slice(0, 9) : [];
  if (!chips.length) return null;
  return (
    <section className="mb-6">
      <SectionHeading title="Contact" />
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip, idx) => (
          <a
            key={idx}
            href={chip.href}
            target={chip.type === 'url' ? '_blank' : undefined}
            rel={chip.type === 'url' ? 'noreferrer' : undefined}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-brand-400"
          >
            {chip.label}
          </a>
        ))}
      </div>
    </section>
  );
}

const COMPONENTS = {
  hero: Hero,
  heading: ({ title }) => <SectionHeading title={title} />,
  paragraph: ({ text }) => (
    <p className="mb-6 whitespace-pre-line text-slate-200">{text}</p>
  ),
  list: List,
  grid: Grid,
  contact: Contact,
};

export function SchemaRenderer({ spec }) {
  if (!spec || !Array.isArray(spec.sections)) {
    return null;
  }
  return (
    <div>
      {spec.sections.map((section, idx) => {
        const Cmp = COMPONENTS[section?.type];
        if (!Cmp) return null;
        const safeProps = section?.props && typeof section.props === 'object' ? section.props : {};
        return <Cmp key={idx} {...safeProps} />;
      })}
    </div>
  );
}

export default SchemaRenderer;
