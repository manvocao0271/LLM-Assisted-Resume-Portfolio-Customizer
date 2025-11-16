import clsx from 'classnames';
import { useMemo } from 'react';
import { THEME_OPTIONS } from '../store/usePortfolioStore.js';

const ORDER_KEYS = ['name', 'summary', 'contact', 'experience', 'education', 'projects', 'skills'];

const parseHexColor = (value) => {
  if (typeof value !== 'string') return null;
  let hex = value.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const numeric = parseInt(hex, 16);
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
};

const hexToRgba = (value, alpha = 1) => {
  const components = parseHexColor(value);
  if (!components) return '';
  const clampedAlpha = Math.max(0, Math.min(alpha, 1));
  const [r, g, b] = components;
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
};

const withAlpha = (color, alpha, fallback) => {
  const rgba = hexToRgba(color, alpha);
  if (rgba) return rgba;
  return fallback || color || '';
};

function SectionHeading({ label, accentColor }) {
  const borderColor = withAlpha(accentColor, 0.5, accentColor || '#ffffff44');
  const textColor = accentColor || '#ffffffaa';
  return (
    <div className="border-l-4 pl-3" style={{ borderColor }}>
      <h4 className="font-semibold uppercase tracking-[0.35em] text-xs" style={{ color: textColor }}>
        {label}
      </h4>
    </div>
  );
}

export function PortfolioPreviewFrame({ children }) {
  return (
    <div
      className={clsx('rounded-2xl border bg-black/40 p-8 shadow-card')}
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  );
}

export function PortfolioPreview({ data }) {
  const theme = useMemo(() => {
    const options = Array.isArray(data?.themes?.options) && data.themes.options.length > 0
      ? data.themes.options
      : THEME_OPTIONS;
    const selected = data?.themes?.selected;
    return options.find((option) => option.id === selected) ?? options[0];
  }, [data?.themes]);

  const primaryColor = theme?.primary || '#1f1f2f';
  const accentColor = theme?.accent || '#ffc371';
  const gradientPrimary = withAlpha(primaryColor, 0.22, 'rgba(255,255,255,0.08)');
  const gradientAccent = withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.16)');
  const containerBorder = withAlpha(accentColor, 0.5, 'rgba(255,255,255,0.1)');
  const chipBorderColor = withAlpha(accentColor, 0.45, 'rgba(255,255,255,0.4)');
  const chipBackground = withAlpha(accentColor, 0.12, 'rgba(255,255,255,0.06)');
  const experienceBorder = withAlpha(accentColor, 0.2, 'rgba(255,255,255,0.12)');
  const experienceBackground = withAlpha(primaryColor, 0.06, 'rgba(255,255,255,0.05)');
  const skillBorderColor = withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.3)');

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
        return u.protocol === 'https:' || u.protocol === 'http:';
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
      className="rounded-2xl border bg-black/60 p-8 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.9)] backdrop-blur"
      style={{
        backgroundImage: `linear-gradient(135deg, ${gradientPrimary}, ${gradientAccent})`,
        borderColor: containerBorder,
      }}
    >
      {sectionOrder.map((key) => {
        if (key === 'name') {
          return (
            <header key="name" className="space-y-2 text-white">
              <p
                className="text-sm uppercase tracking-[0.6em]"
                style={{ color: withAlpha(accentColor, 0.8, '#ffffffcc') }}
              >
                {theme?.name || 'Theme'}
              </p>
              <h2 className="font-display text-3xl font-bold text-white">{data?.name || 'Your Name'}</h2>
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
            <div key="contact" className="mt-4 flex flex-wrap gap-3 text-xs">
              {contactChips.map((chip) => {
                const chipStyle = {
                  borderColor: chipBorderColor,
                  backgroundColor: chipBackground,
                  color: withAlpha(accentColor, 0.98, '#ffffff'),
                };
                if (chip.href) {
                  return (
                    <a
                      key={chip.key}
                      href={chip.href}
                      target={chip.href.startsWith('http') ? '_blank' : undefined}
                      rel={chip.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="rounded-full border px-3 py-1 text-white/90 transition-colors"
                      style={chipStyle}
                    >
                      {chip.label}
                    </a>
                  );
                }
                return (
                  <span
                    key={chip.key}
                    className="rounded-full border px-3 py-1 text-white/90"
                    style={chipStyle}
                  >
                    {chip.label}
                  </span>
                );
              })}
            </div>
          ) : null;
        }

        if (key === 'experience') {
          return (
            <section key="experience" className="mt-8 space-y-3">
              <SectionHeading label="Experience" accentColor={accentColor} />
              {experience.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                  style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                >
                  Experience entries will appear here after parsing.
                </p>
              ) : (
                experience.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
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
              <SectionHeading label="Education" accentColor={accentColor} />
              {education.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                  style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                >
                  Education items will display here once parsed.
                </p>
              ) : (
                education.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/80"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
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
              <SectionHeading label="Projects" accentColor={accentColor} />
              <div className="grid gap-3">
                {projects.length === 0 ? (
                  <p
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
                    Projects will showcase here with links and blurbs.
                  </p>
                ) : (
                  projects.map((project) => (
                    <article
                      key={project.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                      style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                    >
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
              <SectionHeading label="Skills" accentColor={accentColor} />
              {skills.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                  style={{
                    borderColor: skillBorderColor,
                    backgroundColor: withAlpha(accentColor, 0.08, 'rgba(255,255,255,0.04)'),
                  }}
                >
                  Skills will be listed here once detected from your résumé.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {skills.map((skill) => (
                    <span
                      key={skill.name || skill}
                      className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80"
                      style={{ borderColor: skillBorderColor, backgroundColor: chipBackground }}
                    >
                      {skill.name || skill}
                    </span>
                  ))}
                </div>
              )}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}

export default PortfolioPreview;import clsx from 'classnames';
import { useMemo } from 'react';
import { THEME_OPTIONS } from '../store/usePortfolioStore.js';

const ORDER_KEYS = ['name', 'summary', 'contact', 'experience', 'education', 'projects', 'skills'];

const parseHexColor = (value) => {
  if (typeof value !== 'string') return null;
  let hex = value.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const numeric = parseInt(hex, 16);
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
};

const hexToRgba = (value, alpha = 1) => {
  const components = parseHexColor(value);
  if (!components) return '';
  const clampedAlpha = Math.max(0, Math.min(alpha, 1));
  const [r, g, b] = components;
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
};

const withAlpha = (color, alpha, fallback) => {
  const rgba = hexToRgba(color, alpha);
  if (rgba) return rgba;
  return fallback || color || '';
};

function SectionHeading({ label, accentColor }) {
  const borderColor = withAlpha(accentColor, 0.5, accentColor || '#ffffff44');
  const textColor = accentColor || '#ffffffaa';
  return (
    <div className="border-l-4 pl-3" style={{ borderColor }}>
      <h4 className="font-semibold uppercase tracking-[0.35em] text-xs" style={{ color: textColor }}>
        {label}
      </h4>
    </div>
  );
}

export function PortfolioPreviewFrame({ children }) {
  return (
    <div
      className={clsx('rounded-2xl border bg-black/40 p-8 shadow-card')}
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  );
}

export function PortfolioPreview({ data }) {
  const theme = useMemo(() => {
    const options = Array.isArray(data?.themes?.options) && data.themes.options.length > 0
      ? data.themes.options
      : THEME_OPTIONS;
    const selected = data?.themes?.selected;
    return options.find((option) => option.id === selected) ?? options[0];
  }, [data?.themes]);

  const primaryColor = theme?.primary || '#1f1f2f';
  const accentColor = theme?.accent || '#ffc371';
  const gradientPrimary = withAlpha(primaryColor, 0.22, 'rgba(255,255,255,0.08)');
  const gradientAccent = withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.16)');
  const containerBorder = withAlpha(accentColor, 0.5, 'rgba(255,255,255,0.1)');
  const chipBorderColor = withAlpha(accentColor, 0.45, 'rgba(255,255,255,0.4)');
  const chipBackground = withAlpha(accentColor, 0.12, 'rgba(255,255,255,0.06)');
  const experienceBorder = withAlpha(accentColor, 0.2, 'rgba(255,255,255,0.12)');
  const experienceBackground = withAlpha(primaryColor, 0.06, 'rgba(255,255,255,0.05)');
  const skillBorderColor = withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.3)');

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
        return u.protocol === 'https:' || u.protocol === 'http:';
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
      className="rounded-2xl border bg-black/60 p-8 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.9)] backdrop-blur"
      style={{
        backgroundImage: `linear-gradient(135deg, ${gradientPrimary}, ${gradientAccent})`,
        borderColor: containerBorder,
      }}
    >
      {sectionOrder.map((key) => {
        if (key === 'name') {
          return (
            <header key="name" className="space-y-2 text-white">
              <p
                className="text-sm uppercase tracking-[0.6em]"
                style={{ color: withAlpha(accentColor, 0.8, '#ffffffcc') }}
              >
                {theme?.name || 'Theme'}
              </p>
              <h2 className="font-display text-3xl font-bold text-white">{data?.name || 'Your Name'}</h2>
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
            <div key="contact" className="mt-4 flex flex-wrap gap-3 text-xs">
              {contactChips.map((chip) => {
                const chipStyle = {
                  borderColor: chipBorderColor,
                  backgroundColor: chipBackground,
                  color: withAlpha(accentColor, 0.98, '#ffffff'),
                };
                if (chip.href) {
                  return (
                    <a
                      key={chip.key}
                      href={chip.href}
                      target={chip.href.startsWith('http') ? '_blank' : undefined}
                      rel={chip.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="rounded-full border px-3 py-1 text-white/90 transition-colors"
                      style={chipStyle}
                    >
                      {chip.label}
                    </a>
                  );
                }
                return (
                  <span
                    key={chip.key}
                    className="rounded-full border px-3 py-1 text-white/90"
                    style={chipStyle}
                  >
                    {chip.label}
                  </span>
                );
              })}
            </div>
          ) : null;
        }

        if (key === 'experience') {
          return (
            <section key="experience" className="mt-8 space-y-3">
              <SectionHeading label="Experience" accentColor={accentColor} />
              {experience.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                  style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                >
                  Experience entries will appear here after parsing.
                </p>
              ) : (
                experience.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
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
              <SectionHeading label="Education" accentColor={accentColor} />
              {education.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                  style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                >
                  Education items will display here once parsed.
                </p>
              ) : (
                education.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/80"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
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
              <SectionHeading label="Projects" accentColor={accentColor} />
              <div className="grid gap-3">
                {projects.length === 0 ? (
                  <p
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
                    Projects will showcase here with links and blurbs.
                  </p>
                ) : (
                  projects.map((project) => (
                    <article
                      key={project.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                      style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                    >
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
              <SectionHeading label="Skills" accentColor={accentColor} />
              {skills.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                  style={{
                    borderColor: skillBorderColor,
                    backgroundColor: withAlpha(accentColor, 0.08, 'rgba(255,255,255,0.04)'),
                  }}
                >
                  Skills will be listed here once detected from your résumé.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {skills.map((skill) => (
                    <span
                      key={skill.name || skill}
                      className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80"
                      style={{ borderColor: skillBorderColor, backgroundColor: chipBackground }}
                    >
                      {skill.name || skill}
                    </span>
                  ))}
                </div>
              )}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}

export default PortfolioPreview;import clsx from 'classnames';import clsx from 'classnames';

import { useMemo } from 'react';import { useMemo } from 'react';

import { THEME_OPTIONS } from '../store/usePortfolioStore.js';import { THEME_OPTIONS } from '../store/usePortfolioStore.js';



const ORDER_KEYS = ['name', 'summary', 'contact', 'experience', 'education', 'projects', 'skills'];const ORDER_KEYS = ['name', 'summary', 'contact', 'experience', 'education', 'projects', 'skills'];



const parseHexColor = (value) => {const parseHexColor = (value) => {

  if (typeof value !== 'string') return null;  if (typeof value !== 'string') return null;

  let hex = value.trim().replace(/^#/, '');  let hex = value.trim().replace(/^#/, '');

  if (hex.length === 3) {  if (hex.length === 3) {

    hex = hex.split('').map((char) => char + char).join('');    hex = hex.split('').map((char) => char + char).join('');

  }  }

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;

  const numeric = parseInt(hex, 16);  const numeric = parseInt(hex, 16);

  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];

};};

                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}

const hexToRgba = (value, alpha = 1) => {                  >

  const components = parseHexColor(value);                    <p className="text-sm font-semibold text-white">{entry.school}</p>

  if (!components) return '';                    <p>{entry.degree}</p>

  const clampedAlpha = Math.max(0, Math.min(alpha, 1));                    <p className="text-white/60">{entry.period}</p>

  const [r, g, b] = components;                  </article>

  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;                ))

};              )}

            </section>

const withAlpha = (color, alpha, fallback) => {          );

  const rgba = hexToRgba(color, alpha);        }

  if (rgba) return rgba;

  return fallback || color || '';        if (key === 'projects') {

};          return (

            <section key="projects" className="mt-8 space-y-3">

function SectionHeading({ label, accentColor }) {              <SectionHeading label="Projects" accentColor={accentColor} />

  const borderColor = withAlpha(accentColor, 0.5, accentColor || '#ffffff44');              <div className="grid gap-3">

  const textColor = accentColor || '#ffffffaa';                {projects.length === 0 ? (

  return (                  <p

    <div className="border-l-4 pl-3" style={{ borderColor }}>                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"

      <h4 className="font-semibold uppercase tracking-[0.35em] text-xs" style={{ color: textColor }}>                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}

        {label}                  >

      </h4>                    Projects will showcase here with links and blurbs.

    </div>                  </p>

  );                ) : (

}                  projects.map((project) => (

                    <article

export function PortfolioPreviewFrame({ children }) {                      key={project.id}

  return (                      className="rounded-xl border border-white/10 bg-white/5 p-4"

    <div                      style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}

      className={clsx('rounded-2xl border bg-black/40 p-8 shadow-card')}                    >

      style={{ borderColor: 'rgba(255,255,255,0.08)' }}                      <header className="flex items-center justify-between text-sm text-white">

    >                        <span className="font-semibold">{project.name}</span>

      {children}                        {project.link && (

    </div>                          <a

  );                            href={project.link}

}                            target="_blank"

                            rel="noreferrer"

export function PortfolioPreview({ data }) {                            className="text-xs font-medium text-white/80 hover:text-white"

  const theme = useMemo(() => {                          >

    const options = Array.isArray(data?.themes?.options) && data.themes.options.length > 0                            View →

      ? data.themes.options                          </a>

      : THEME_OPTIONS;                        )}

    const selected = data?.themes?.selected;                      </header>

    return options.find((option) => option.id === selected) ?? options[0];                      {project.description && (

  }, [data?.themes]);                        <p className="mt-2 whitespace-pre-line text-xs text-white/70">{project.description}</p>

                      )}

  const primaryColor = theme?.primary || '#1f1f2f';                      {Array.isArray(project.bullets) && project.bullets.length > 0 && !project.description && (

  const accentColor = theme?.accent || '#ffc371';                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/70">

  const gradientPrimary = withAlpha(primaryColor, 0.22, 'rgba(255,255,255,0.08)');                          {project.bullets.map((bullet, index) => (

  const gradientAccent = withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.16)');                            <li key={`${project.id}-${index}`}>{bullet}</li>

  const containerBorder = withAlpha(accentColor, 0.5, 'rgba(255,255,255,0.1)');                          ))}

  const chipBorderColor = withAlpha(accentColor, 0.45, 'rgba(255,255,255,0.4)');                        </ul>

  const chipBackground = withAlpha(accentColor, 0.12, 'rgba(255,255,255,0.06)');                      )}

  const experienceBorder = withAlpha(accentColor, 0.2, 'rgba(255,255,255,0.12)');                    </article>

  const experienceBackground = withAlpha(primaryColor, 0.06, 'rgba(255,255,255,0.05)');                  ))

  const skillBorderColor = withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.3)');                )}

              </div>

  const experience = Array.isArray(data?.experience) ? data.experience : [];            </section>

  const projects = Array.isArray(data?.projects) ? data.projects : [];          );

  const skills = Array.isArray(data?.skills) ? data.skills : [];        }

  const education = Array.isArray(data?.education) ? data.education : [];

  const contact = data?.contact || {};        if (key === 'skills') {

  const sectionOrder = Array.isArray(data?.layout?.sectionOrder) && data.layout.sectionOrder.length          return (

    ? data.layout.sectionOrder            <section key="skills" className="mt-8 space-y-3">

    : ORDER_KEYS;              <SectionHeading label="Skills" accentColor={accentColor} />

              <div className="flex flex-wrap gap-2">

  const contactChips = (() => {                {skills.length === 0 ? (

    const result = [];                  <span

    const emails = Array.isArray(contact.emails) ? contact.emails : [];                    className="rounded-full border bg-white/5 px-3 py-1 text-xs"

    const phones = Array.isArray(contact.phones) ? contact.phones : [];                    style={{

    const urls = Array.isArray(contact.urls) ? contact.urls : [];                      borderColor: skillBorderColor,

                      color: '#ffffffc0',

    const isEmail = (v) => /^(?:[^\s@]+)@(?:[^\s@]+)\.[^\s@]+$/.test(String(v).trim());                      backgroundColor: withAlpha(accentColor, 0.08, 'rgba(255,255,255,0.04)'),

    const isHttps = (v) => {                    }}

      try {                  >

        const u = new URL(String(v).trim());                    Skills will populate once parsed.

        return u.protocol === 'https:' || u.protocol === 'http:';                  </span>

      } catch {                ) : (

        return false;                  skills.map((skill) => (

      }                    <span

    };                      key={skill}

    const isPhoneLike = (v) => /^[+()\d][\d\s().-]{6,}$/.test(String(v).trim());                      className="rounded-full border px-3 py-1 text-xs font-semibold text-white"

    const toTelHref = (v) => `tel:${String(v).replace(/[^+\d]/g, '')}`;                      style={{

                        borderColor: skillBorderColor,

    for (const e of emails) {                        backgroundColor: withAlpha(accentColor, 0.12, 'rgba(255,255,255,0.05)'),

      const label = String(e).trim();                      }}

      if (!label) continue;                    >

      result.push({ key: `email:${label}`, label, href: isEmail(label) ? `mailto:${label}` : undefined });                      {skill}

    }                    </span>

    for (const p of phones) {                  ))

      const label = String(p).trim();                )}

      if (!label) continue;              </div>

      result.push({ key: `phone:${label}`, label, href: isPhoneLike(label) ? toTelHref(label) : undefined });            </section>

    }          );

    for (const u of urls) {        }

      const label = String(u).trim();

      if (!label) continue;        return null;

      result.push({ key: `url:${label}`, label, href: isHttps(label) ? label : undefined });      })}

    }    </div>

    return result;  );

  })();}



  return (export function PortfolioPreviewFrame({ children }) {

    <div  return (

      className="rounded-2xl border bg-black/60 p-8 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.9)] backdrop-blur"    <div

      style={{      className={clsx('rounded-2xl border bg-black/40 p-8 shadow-card')}

        backgroundImage: `linear-gradient(135deg, ${gradientPrimary}, ${gradientAccent})`,      style={{ borderColor: 'rgba(255,255,255,0.08)' }}

        borderColor: containerBorder,    >

      }}      {children}

    >    </div>

      {sectionOrder.map((key) => {  );

        if (key === 'name') {}import clsx from 'classnames';

          return (import { useMemo } from 'react';

            <header key="name" className="space-y-2 text-white">import { THEME_OPTIONS } from '../store/usePortfolioStore.js';

              <p

                className="text-sm uppercase tracking-[0.6em]"const ORDER_KEYS = ['name', 'summary', 'contact', 'experience', 'education', 'projects', 'skills'];

                style={{ color: withAlpha(accentColor, 0.8, '#ffffffcc') }}

              >const parseHexColor = (value) => {

                {theme?.name || 'Theme'}  if (typeof value !== 'string') return null;

              </p>  let hex = value.trim().replace(/^#/, '');

              <h2 className="font-display text-3xl font-bold text-white">{data?.name || 'Your Name'}</h2>  if (hex.length === 3) {

            </header>    hex = hex.split('').map((char) => char + char).join('');

          );  }

        }  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;

  const numeric = parseInt(hex, 16);

        if (key === 'summary') {  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];

          return (};

            <section key="summary" className="space-y-4 text-white">

              <p className="text-sm leading-relaxed text-white/70">const hexToRgba = (value, alpha = 1) => {

                {data?.summary || 'Upload a résumé to generate a professional summary preview.'}  const components = parseHexColor(value);

              </p>  if (!components) return '';

            </section>  const clampedAlpha = Math.max(0, Math.min(alpha, 1));

          );  const [r, g, b] = components;

        }  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;

};

        if (key === 'contact') {

          return contactChips.length > 0 ? (const withAlpha = (color, alpha, fallback) => {

            <div key="contact" className="mt-4 flex flex-wrap gap-3 text-xs">  const rgba = hexToRgba(color, alpha);

              {contactChips.map((chip) => {  if (rgba) return rgba;

                const chipStyle = {  return fallback || color || '';

                  borderColor: chipBorderColor,};

                  backgroundColor: chipBackground,

                  color: withAlpha(accentColor, 0.98, '#ffffff'),function SectionHeading({ label, accentColor }) {

                };  const borderColor = withAlpha(accentColor, 0.5, accentColor || '#ffffff44');

                if (chip.href) {  const textColor = accentColor || '#ffffffaa';

                  return (  return (

                    <a    <div className="border-l-4 pl-3" style={{ borderColor }}>

                      key={chip.key}      <h4 className="font-semibold uppercase tracking-[0.35em] text-xs" style={{ color: textColor }}>

                      href={chip.href}        {label}

                      target={chip.href.startsWith('http') ? '_blank' : undefined}      </h4>

                      rel={chip.href.startsWith('http') ? 'noopener noreferrer' : undefined}    </div>

                      className="rounded-full border px-3 py-1 text-white/90 transition-colors"  );

                      style={chipStyle}}

                    >

                      {chip.label}export function PortfolioPreview({ data }) {

                    </a>  const theme = useMemo(() => {

                  );    const options = Array.isArray(data?.themes?.options) && data.themes.options.length > 0

                }      ? data.themes.options

                return (      : THEME_OPTIONS;

                  <span    const selected = data?.themes?.selected;

                    key={chip.key}    return options.find((option) => option.id === selected) ?? options[0];

                    className="rounded-full border px-3 py-1 text-white/90"  }, [data?.themes]);

                    style={chipStyle}

                  >  const primaryColor = theme?.primary || '#1f1f2f';

                    {chip.label}  const accentColor = theme?.accent || '#ffc371';

                  </span>  const gradientPrimary = withAlpha(primaryColor, 0.22, 'rgba(255,255,255,0.08)');

                );  const gradientAccent = withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.16)');

              })}  const containerBorder = withAlpha(accentColor, 0.5, 'rgba(255,255,255,0.1)');

            </div>  const chipBorderColor = withAlpha(accentColor, 0.45, 'rgba(255,255,255,0.4)');

          ) : null;  const chipBackground = withAlpha(accentColor, 0.12, 'rgba(255,255,255,0.06)');

        }  const experienceBorder = withAlpha(accentColor, 0.2, 'rgba(255,255,255,0.12)');

  const experienceBackground = withAlpha(primaryColor, 0.06, 'rgba(255,255,255,0.05)');

        if (key === 'experience') {  const skillBorderColor = withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.3)');

          return (

            <section key="experience" className="mt-8 space-y-3">  const experience = Array.isArray(data?.experience) ? data.experience : [];

              <SectionHeading label="Experience" accentColor={accentColor} />  const projects = Array.isArray(data?.projects) ? data.projects : [];

              {experience.length === 0 ? (  const skills = Array.isArray(data?.skills) ? data.skills : [];

                <p  const education = Array.isArray(data?.education) ? data.education : [];

                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"  const contact = data?.contact || {};

                  style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}  const sectionOrder = Array.isArray(data?.layout?.sectionOrder) && data.layout.sectionOrder.length

                >    ? data.layout.sectionOrder

                  Experience entries will appear here after parsing.    : ORDER_KEYS;

                </p>

              ) : (  const contactChips = (() => {

                experience.map((item) => (    const result = [];

                  <article    const emails = Array.isArray(contact.emails) ? contact.emails : [];

                    key={item.id}    const phones = Array.isArray(contact.phones) ? contact.phones : [];

                    className="rounded-xl border border-white/10 bg-white/5 p-4"    const urls = Array.isArray(contact.urls) ? contact.urls : [];

                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}

                  >    const isEmail = (v) => /^(?:[^\s@]+)@(?:[^\s@]+)\.[^\s@]+$/.test(String(v).trim());

                    <header className="flex flex-wrap items-center justify-between gap-2 text-sm text-white">    const isHttps = (v) => {

                      <span className="font-semibold text-white">{item.role}</span>      try {

                      <span className="text-white/60">{item.period}</span>        const u = new URL(String(v).trim());

                    </header>        return u.protocol === 'https:' || u.protocol === 'http:';

                    <p className="text-white/70 text-sm">{item.company}</p>      } catch {

                    {Array.isArray(item.bullets) && item.bullets.length > 0 && (        return false;

                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/70">      }

                        {item.bullets.map((bullet, index) => (    };

                          <li key={`${item.id}-${index}`}>{bullet}</li>    const isPhoneLike = (v) => /^[+()\d][\d\s().-]{6,}$/.test(String(v).trim());

                        ))}    const toTelHref = (v) => `tel:${String(v).replace(/[^+\d]/g, '')}`;

                      </ul>

                    )}    for (const e of emails) {

                  </article>      const label = String(e).trim();

                ))      if (!label) continue;

              )}      result.push({ key: `email:${label}`, label, href: isEmail(label) ? `mailto:${label}` : undefined });

            </section>    }

          );    for (const p of phones) {

        }      const label = String(p).trim();

      if (!label) continue;

        if (key === 'education') {      result.push({ key: `phone:${label}`, label, href: isPhoneLike(label) ? toTelHref(label) : undefined });

          return (    }

            <section key="education" className="mt-8 space-y-3">    for (const u of urls) {

              <SectionHeading label="Education" accentColor={accentColor} />      const label = String(u).trim();

              {education.length === 0 ? (      if (!label) continue;

                <p      result.push({ key: `url:${label}`, label, href: isHttps(label) ? label : undefined });

                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"    }

                  style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}    return result;

                >  })();

                  Education items will display here once parsed.

                </p>  return (

              ) : (    <div

                education.map((entry) => (      className="rounded-2xl border bg-black/60 p-8 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.9)] backdrop-blur"

                  <article      style={{

                    key={entry.id}        backgroundImage: `linear-gradient(135deg, ${gradientPrimary}, ${gradientAccent})`,

                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/80"        borderColor: containerBorder,

                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}      }}

                  >    >

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
              <SectionHeading label="Projects" accentColor={accentColor} />
              <div className="grid gap-3">
                {projects.length === 0 ? (
                  <p
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
                    Projects will showcase here with links and blurbs.
                  </p>
                ) : (
                  projects.map((project) => (
                    <article
                      key={project.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                      style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                    >
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
              <SectionHeading label="Skills" accentColor={accentColor} />
              {skills.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
                  style={{
                    borderColor: skillBorderColor,
                    backgroundColor: withAlpha(accentColor, 0.08, 'rgba(255,255,255,0.04)'),
                  }}
                >
                  Skills will be listed here once detected from your résumé.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {skills.map((skill) => (
                    <span
                      key={skill.name || skill}
                      className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80"
                      style={{ borderColor: skillBorderColor, backgroundColor: chipBackground }}
                    >
                      {skill.name || skill}
                    </span>
                  ))}
                </div>
              )}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}

export default PortfolioPreview;
