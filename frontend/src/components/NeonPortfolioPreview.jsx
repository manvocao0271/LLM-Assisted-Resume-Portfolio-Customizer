import clsx from 'classnames';
import { useMemo } from 'react';
import { THEME_OPTIONS } from '../store/usePortfolioStore.js';
import { AnimatedWebBackground } from './AnimatedWebBackground.jsx';

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
  const textColor = accentColor || '#ffffffaa';
  const glowColor = withAlpha(accentColor, 0.5, 'rgba(255,255,255,0.3)');
  return (
    <h4 
      className="font-semibold uppercase tracking-[0.35em] text-sm mb-1" 
      style={{ 
        color: textColor,
        textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`
      }}
    >
      {label}
    </h4>
  );
}

export function PortfolioPreviewFrame({ children }) {
  return (
    <div
      className={clsx('relative rounded-2xl border bg-black/40 p-8 shadow-card overflow-hidden')}
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <AnimatedWebBackground opacity={0.12} />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function NeonPortfolioPreview({ data, reviewOrder: propReviewOrder, sectionTitles: propSectionTitles }) {
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
  const sectionVisibility = data?.sectionVisibility || {};
  const sectionOrder = Array.isArray(propReviewOrder) && propReviewOrder.length
    ? propReviewOrder
    : (Array.isArray(data?.layout?.sectionOrder) && data.layout.sectionOrder.length
      ? data.layout.sectionOrder
      : ORDER_KEYS);

  // If the review/editor data contains dynamic keys that are not present in
  // the saved `sectionOrder`, include them at render time so visibility
  // toggles in the editor show up in the preview without mutating the
  // stored layout order. This keeps visual ordering stable while ensuring
  // newly toggled sections appear.
  const dynamicRenderOrder = (() => {
    try {
      const knownExcludes = new Set(['job_description', 'job_type', 'resume_job_type', 'embedded_links', 'themes', 'raw', 'meta', 'raw_resume_text', 'layout', 'urls', 'url', 'links', 'websites', 'profiles', 'emails', 'email', 'phones', 'phone', 'phone_number']);
      const keys = Object.keys(data || {}).filter((k) => !knownExcludes.has(k));
      const extras = keys.filter((k) => !sectionOrder.includes(k));
      // Only include extras that have content and aren't explicitly hidden
      const meaningfulExtras = extras.filter((k) => {
        const v = data[k];
        if (sectionVisibility[k] === false) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (v && typeof v === 'object') return Object.keys(v).length > 0;
        return Boolean(v);
      });
      return [...sectionOrder, ...meaningfulExtras];
    } catch (err) {
      return sectionOrder;
    }
  })();

  // Allow review/edit stage to provide user-friendly section titles.
  const sectionTitleMap = propSectionTitles || data?.sectionTitles || (data?.generatedSpec && Array.isArray(data.generatedSpec.sections)
    ? Object.fromEntries(data.generatedSpec.sections.map((s) => [s.key || s.id || s.name, s.title || s.name || s.label]))
    : {});

  const getSectionLabel = (key) => {
    if (!key) return '';
    if (sectionTitleMap && sectionTitleMap[key]) return sectionTitleMap[key];
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

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

  const glowShadow = `0 0 20px ${withAlpha(accentColor, 0.4, 'rgba(255,255,255,0.2)')}, 0 0 40px ${withAlpha(accentColor, 0.2, 'rgba(255,255,255,0.1)')}, 0 30px 90px -30px rgba(15,23,42,0.9)`;
  
  return (
    <div
      className="rounded-2xl border bg-black/60 p-8 backdrop-blur"
      style={{
        backgroundImage: `linear-gradient(135deg, ${gradientPrimary}, ${gradientAccent})`,
        borderColor: containerBorder,
        boxShadow: glowShadow,
      }}
    >
      {dynamicRenderOrder.map((key) => {
        // Check if section is hidden
        if (sectionVisibility[key] === false) {
          return null;
        }

        if (key === 'name') {
          return (
            <header key="name" className="space-y-2 text-white">
              <p
                className="text-sm uppercase tracking-[0.6em]"
                style={{ color: withAlpha(accentColor, 0.8, '#ffffffcc') }}
              >
                {theme?.name || 'Theme'}
              </p>
              <h2 
                className="font-display text-3xl font-bold text-white" 
                style={{ textShadow: `0 0 20px ${withAlpha(accentColor, 0.6, 'rgba(255,255,255,0.4)')}, 0 0 40px ${withAlpha(accentColor, 0.3, 'rgba(255,255,255,0.2)')}` }}
              >
                {data?.name || 'Your Name'}
              </h2>
            </header>
          );
        }

        if (key === 'summary') {
          return (
            <section key="summary" className="space-y-4 text-white">
              <p className="text-base leading-relaxed text-white/70">
                {data?.summary || 'Upload a résumé to generate a professional summary preview.'}
              </p>
            </section>
          );
        }

        if (key === 'contact') {
          return contactChips.length > 0 ? (
            <div key="contact" className="mt-4 flex flex-wrap gap-3 text-sm">
              {contactChips.map((chip) => {
                const chipGlow = `0 0 10px ${withAlpha(accentColor, 0.4, 'rgba(255,255,255,0.2)')}, inset 0 0 10px ${withAlpha(accentColor, 0.2, 'rgba(255,255,255,0.1)')}`;
                const chipStyle = {
                  borderColor: chipBorderColor,
                  backgroundColor: chipBackground,
                  color: withAlpha(accentColor, 0.98, '#ffffff'),
                  boxShadow: chipGlow,
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
              <SectionHeading label={getSectionLabel('experience') || 'Experience'} accentColor={accentColor} />
              {experience.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
                  style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                >
                  Experience entries will appear here after parsing.
                </p>
              ) : (
                experience.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                    style={{ 
                      borderColor: experienceBorder, 
                      backgroundColor: experienceBackground,
                      boxShadow: `0 0 15px ${withAlpha(accentColor, 0.15, 'rgba(255,255,255,0.05)')}, inset 0 0 15px ${withAlpha(accentColor, 0.1, 'rgba(255,255,255,0.03)')}`
                    }}
                  >
                    <header className="flex flex-wrap items-center justify-between gap-2 text-base text-white">
                      <span className="font-semibold text-white">{item.role}</span>
                      <span className="text-white/60">{item.period}</span>
                    </header>
                    <p className="text-white/70 text-base">{item.company}</p>
                    {Array.isArray(item.bullets) && item.bullets.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
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
              <SectionHeading label={getSectionLabel('education') || 'Education'} accentColor={accentColor} />
              {education.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
                  style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                >
                  Education items will display here once parsed.
                </p>
              ) : (
                education.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
                    <p className="text-base font-semibold text-white">{entry.school}</p>
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
              <SectionHeading label={getSectionLabel('projects') || 'Projects'} accentColor={accentColor} />
              <div className="grid gap-3">
                {projects.length === 0 ? (
                  <p
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
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
                      <header className="flex items-center justify-between text-base text-white">
                        <span className="font-semibold">{project.name}</span>
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-white/80 hover:text-white"
                          >
                            Link to project →
                          </a>
                        )}
                      </header>
                      {project.description && (
                        <p className="mt-2 whitespace-pre-line text-sm text-white/70">{project.description}</p>
                      )}
                      {Array.isArray(project.bullets) && project.bullets.length > 0 && !project.description && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
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
              <SectionHeading label={getSectionLabel('skills') || 'Skills'} accentColor={accentColor} />
              {skills.length === 0 ? (
                <p
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
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
                      className="rounded-full border px-3 py-1 text-sm uppercase tracking-[0.3em] text-white/80"
                      style={{ 
                        borderColor: skillBorderColor, 
                        backgroundColor: chipBackground,
                        boxShadow: `0 0 10px ${withAlpha(accentColor, 0.3, 'rgba(255,255,255,0.15)')}, inset 0 0 10px ${withAlpha(accentColor, 0.15, 'rgba(255,255,255,0.08)')}`
                      }}
                    >
                      {skill.name || skill}
                    </span>
                  ))}
                </div>
              )}
            </section>
          );
        }

        // Handle dynamic sections (e.g., certifications, languages, awards, etc.)
        // Check if section exists in data and is not a core section
        if (data?.[key]) {
          const sectionData = data[key];
          
          // Simple list sections (array of strings)
          if (Array.isArray(sectionData) && sectionData.length > 0 && typeof sectionData[0] === 'string') {
            return (
              <section key={key} className="mt-8 space-y-3">
                <SectionHeading label={getSectionLabel(key)} accentColor={accentColor} />
                <div className="flex flex-wrap gap-3">
                  {sectionData.map((item, idx) => (
                    <span
                      key={`${key}-${idx}`}
                      className="rounded-full border px-3 py-1 text-sm text-white/80"
                      style={{ 
                        borderColor: chipBorderColor, 
                        backgroundColor: chipBackground,
                        boxShadow: `0 0 10px ${withAlpha(accentColor, 0.3, 'rgba(255,255,255,0.15)')}, inset 0 0 10px ${withAlpha(accentColor, 0.15, 'rgba(255,255,255,0.08)')}`
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            );
          }
          
          // Structured sections (array of objects)
          if (Array.isArray(sectionData) && sectionData.length > 0 && typeof sectionData[0] === 'object') {
            return (
              <section key={key} className="mt-8 space-y-3">
                <SectionHeading label={getSectionLabel(key)} accentColor={accentColor} />
                {sectionData.map((entry, idx) => (
                  <article
                    key={entry.id || idx}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
                    style={{ borderColor: experienceBorder, backgroundColor: experienceBackground }}
                  >
                    {Object.entries(entry).map(([fieldKey, fieldValue]) => {
                      if (fieldKey === 'id') return null;
                      
                      const isArray = Array.isArray(fieldValue);
                      const label = fieldKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      
                      return (
                        <div key={fieldKey}>
                          <p className="text-xs uppercase tracking-widest text-white/60 mb-1">{label}</p>
                          {isArray ? (
                            <ul className="list-disc space-y-1 pl-5 text-sm text-white/70">
                              {fieldValue.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-white/80">{String(fieldValue)}</p>
                          )}
                        </div>
                      );
                    })}
                  </article>
                ))}
              </section>
            );
          }
        }

        return null;
      })}
    </div>
  );
}

// Export alias for backward compatibility
export { NeonPortfolioPreview as PortfolioPreview };

export default NeonPortfolioPreview;
