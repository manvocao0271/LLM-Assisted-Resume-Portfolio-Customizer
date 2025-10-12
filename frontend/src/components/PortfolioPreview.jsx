import clsx from 'classnames';
import { useMemo } from 'react';

const ORDER_KEYS = ['name', 'summary', 'contact', 'experience', 'education', 'projects', 'skills'];

function SectionHeading({ label }) {
  return (
    <div className="border-l-4 border-white/70 pl-3">
      <h4 className="font-semibold uppercase tracking-[0.35em] text-xs text-white/70">{label}</h4>
    </div>
  );
}

export function PortfolioPreview({ data }) {
  const theme = useMemo(() => {
    const options = Array.isArray(data?.themes?.options) && data.themes.options.length > 0
      ? data.themes.options
      : [{ id: 'aurora', name: 'Aurora', primary: '#42a5f5', accent: '#f472b6' }];
    const selected = data?.themes?.selected;
    return options.find((option) => option.id === selected) ?? options[0];
  }, [data?.themes]);

  const experience = Array.isArray(data?.experience) ? data.experience : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const skills = Array.isArray(data?.skills) ? data.skills : [];
  const education = Array.isArray(data?.education) ? data.education : [];
  const contact = data?.contact || {};
  const sectionOrder = Array.isArray(data?.layout?.sectionOrder) && data.layout.sectionOrder.length
    ? data.layout.sectionOrder
    : ORDER_KEYS;

  const contactChips = (() => {
    const result = [];
    const emails = Array.isArray(contact.emails) ? contact.emails : [];
    const phones = Array.isArray(contact.phones) ? contact.phones : [];
    const urls = Array.isArray(contact.urls) ? contact.urls : [];

    const isEmail = (v) => /^(?:[^\s@]+)@(?:[^\s@]+)\.[^\s@]+$/.test(String(v).trim());
    const isHttps = (v) => {
      try {
        const u = new URL(String(v).trim());
        return u.protocol === 'https:' || u.protocol === 'http:'; // allow http just in case
      } catch {
        return false;
      }
    };
    const isPhoneLike = (v) => /^[+()\d][\d\s().-]{6,}$/.test(String(v).trim());
    const toTelHref = (v) => `tel:${String(v).replace(/[^+\d]/g, '')}`;

    for (const e of emails) {
      const label = String(e).trim();
      if (!label) continue;
      result.push({ key: `email:${label}`, label, href: isEmail(label) ? `mailto:${label}` : undefined });
    }
    for (const p of phones) {
      const label = String(p).trim();
      if (!label) continue;
      result.push({ key: `phone:${label}`, label, href: isPhoneLike(label) ? toTelHref(label) : undefined });
    }
    for (const u of urls) {
      const label = String(u).trim();
      if (!label) continue;
      result.push({ key: `url:${label}`, label, href: isHttps(label) ? label : undefined });
    }
    return result;
  })();

  return (
    <div
      className="rounded-2xl bg-slate-950/40 p-8"
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.primary}22, transparent)` ,
      }}
    >
      {sectionOrder.map((key) => {
        if (key === 'name') {
          return (
            <header key="name" className="space-y-2 text-white">
              <p className="text-sm uppercase tracking-[0.6em] text-white/60">{theme.name} Theme</p>
              <h2 className="font-display text-3xl font-bold">{data?.name || 'Your Name'}</h2>
            </header>
          );
        }

        if (key === 'summary') {
          return (
            <section key="summary" className="space-y-4 text-white">
              <p className="text-sm leading-relaxed text-white/70">
                {data?.summary || 'Upload a résumé to generate a professional summary preview.'}
              </p>
            </section>
          );
        }

        if (key === 'contact') {
          return contactChips.length > 0 ? (
            <div key="contact" className="mt-4 flex flex-wrap gap-3 text-xs text-white/70">
              {contactChips.map((chip) =>
                chip.href ? (
                  <a
                    key={chip.key}
                    href={chip.href}
                    target={chip.href.startsWith('http') ? '_blank' : undefined}
                    rel={chip.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="rounded-full border border-white/40 px-3 py-1 text-white/80 hover:text-white hover:border-white/60"
                  >
                    {chip.label}
                  </a>
                ) : (
                  <span key={chip.key} className="rounded-full border border-white/40 px-3 py-1">
                    {chip.label}
                  </span>
                ),
              )}
            </div>
          ) : null;
        }

        if (key === 'experience') {
          return (
            <section key="experience" className="mt-8 space-y-3">
              <SectionHeading label="Experience" />
              {experience.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                  Experience entries will appear here after parsing.
                </p>
              ) : (
                experience.map((item) => (
                  <article key={item.id} className="rounded-xl bg-white/5 p-4">
                    <header className="flex flex-wrap items-center justify-between gap-2 text-sm text-white">
                      <span className="font-semibold text-white">{item.role}</span>
                      <span className="text-white/60">{item.period}</span>
                    </header>
                    <p className="text-white/70 text-sm">{item.company}</p>
                    {Array.isArray(item.bullets) && item.bullets.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/70">
                        {item.bullets.map((bullet, index) => (
                          <li key={`${item.id}-${index}`}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))
              )}
            </section>
          );
        }

        if (key === 'education') {
          return (
            <section key="education" className="mt-8 space-y-3">
              <SectionHeading label="Education" />
              {education.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                  Education items will display here once parsed.
                </p>
              ) : (
                education.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/80">
                    <p className="text-sm font-semibold text-white">{entry.school}</p>
                    <p>{entry.degree}</p>
                    <p className="text-white/60">{entry.period}</p>
                  </article>
                ))
              )}
            </section>
          );
        }

        if (key === 'projects') {
          return (
            <section key="projects" className="mt-8 space-y-3">
              <SectionHeading label="Projects" />
              <div className="grid gap-3">
                {projects.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                    Projects will showcase here with links and blurbs.
                  </p>
                ) : (
                  projects.map((project) => (
                    <article key={project.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <header className="flex items-center justify-between text-sm text-white">
                        <span className="font-semibold">{project.name}</span>
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-white/80 hover:text-white"
                          >
                            View →
                          </a>
                        )}
                      </header>
                      {project.description && (
                        <p className="mt-2 whitespace-pre-line text-xs text-white/70">{project.description}</p>
                      )}
                      {Array.isArray(project.bullets) && project.bullets.length > 0 && !project.description && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/70">
                          {project.bullets.map((bullet, index) => (
                            <li key={`${project.id}-${index}`}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        }

        if (key === 'skills') {
          return (
            <section key="skills" className="mt-8 space-y-3">
              <SectionHeading label="Skills" />
              <div className="flex flex-wrap gap-2">
                {skills.length === 0 ? (
                  <span className="rounded-full border border-white/30 bg-white/5 px-3 py-1 text-xs text-white/70">
                    Skills will populate once parsed.
                  </span>
                ) : (
                  skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white"
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}

export function PortfolioPreviewFrame({ children }) {
  return (
    <div className={clsx('rounded-2xl border border-slate-700/70 bg-slate-900/70 p-8 shadow-card')}>
      {children}
    </div>
  );
}
