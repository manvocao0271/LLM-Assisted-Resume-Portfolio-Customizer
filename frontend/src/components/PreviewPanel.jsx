import clsx from 'classnames';
import { useMemo } from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore.js';

function SectionHeading({ label }) {
  return (
    <div className="border-l-4 border-white/70 pl-3">
      <h4 className="font-semibold uppercase tracking-[0.35em] text-xs text-white/70">{label}</h4>
    </div>
  );
}

export function PreviewPanel() {
  const data = usePortfolioStore((state) => state.data);

  const theme = useMemo(
    () => data.themes.options.find((option) => option.id === data.themes.selected) ?? data.themes.options[0],
    [data.themes.options, data.themes.selected],
  );

  const experience = Array.isArray(data.experience) ? data.experience : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const contact = data.contact || {};

  const contactChips = [
    ...(Array.isArray(contact.emails) ? contact.emails : []),
    ...(Array.isArray(contact.phones) ? contact.phones : []),
    ...(Array.isArray(contact.urls) ? contact.urls : []),
  ];

  return (
    <aside
      className="sticky top-10 hidden h-fit rounded-3xl border border-slate-700/70 bg-slate-900/70 p-8 shadow-card lg:block"
      aria-label="Live portfolio preview"
    >
      <div
        className="rounded-2xl bg-slate-950/40 p-8"
        style={{
          backgroundImage: `linear-gradient(135deg, ${theme.primary}22, transparent)` ,
        }}
      >
        <header className="space-y-4 text-white">
          <p className="text-sm uppercase tracking-[0.6em] text-white/60">{theme.name} Theme</p>
          <h2 className="font-display text-3xl font-bold">{data.name || 'Your Name'}</h2>
          <p className="text-sm leading-relaxed text-white/70">
            {data.summary || 'Upload a résumé to generate a professional summary preview.'}
          </p>
          {contactChips.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs text-white/70">
              {contactChips.map((chip) => (
                <span key={chip} className="rounded-full border border-white/40 px-3 py-1">
                  {chip}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="mt-8 space-y-6">
          <section className="space-y-3">
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

          <section className="space-y-3">
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

          <section className="space-y-3">
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
                    <p className="mt-2 text-xs text-white/70">{project.description}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="space-y-3">
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
        </div>
      </div>

      <footer className="mt-6 flex items-center justify-between rounded-2xl bg-slate-900/80 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Preview URL</p>
          <p className="text-sm font-medium text-white">https://portfolio-demo.vercel.app/demo</p>
        </div>
        <button
          type="button"
          className={clsx(
            'rounded-full px-4 py-2 text-sm font-semibold text-white transition',
            'bg-gradient-to-r from-brand-400 to-pink-500 shadow-lg shadow-brand-500/20 hover:from-brand-300 hover:to-pink-400'
          )}
        >
          Publish draft
        </button>
      </footer>
    </aside>
  );
}
