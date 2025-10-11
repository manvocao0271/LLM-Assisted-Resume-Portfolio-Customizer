import { useMemo, useRef, useEffect } from 'react';

import { usePortfolioStore, REVIEW_SECTION_KEYS } from '../store/usePortfolioStore.js';

function SectionCard({ title, description, controls, children }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow-card">
      <header className="flex items-start justify-between gap-3 border-b border-slate-700 pb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
        </div>
        {controls ? <div className="shrink-0 flex items-center gap-2">{controls}</div> : null}
      </header>
      <div className="mt-4 space-y-4 text-sm text-slate-200">{children}</div>
    </section>
  );
}

function AutoResizeTextarea({ value, onChange, className, minRows = 2, maxHeight, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.overflowY = 'hidden';
    const next = el.scrollHeight;
    if (maxHeight && next > maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${next}px`;
    }
  }, [value, maxHeight]);

  // Ensure initial sizing after first paint
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.overflowY = 'hidden';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className={className}
      rows={minRows}
      {...props}
    />
  );
}

export function ReviewStep() {
  const data = usePortfolioStore((state) => state.data);
  const updateData = usePortfolioStore((state) => state.updateData);
  const reviewOrder = usePortfolioStore((state) => state.reviewOrder);
  const setReviewOrder = usePortfolioStore((state) => state.setReviewOrder);

  const experience = Array.isArray(data.experience) ? data.experience : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const contact = data && typeof data.contact === 'object' ? data.contact : {};
  const emails = Array.isArray(contact.emails) ? contact.emails : [];
  const phones = Array.isArray(contact.phones) ? contact.phones : [];
  const urls = Array.isArray(contact.urls) ? contact.urls : [];

  const hasContact = emails.length > 0 || phones.length > 0 || urls.length > 0;
  const hasExperience = experience.length > 0;
  const hasProjects = projects.length > 0;
  const hasEducation = education.length > 0;
  const hasSkills = skills.length > 0;

  const handleSummaryChange = (event) => {
    const value = event.target.value;
    updateData((previous) => ({ ...previous, summary: value }));
  };

  const handleSkillsChange = (event) => {
    const nextSkills = event.target.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    updateData((previous) => ({ ...previous, skills: nextSkills }));
  };

  const handleContactChange = (field) => (event) => {
    const values = event.target.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    updateData((previous) => ({
      ...previous,
      contact: {
        emails: field === 'emails' ? values : previous.contact?.emails ?? emails,
        phones: field === 'phones' ? values : previous.contact?.phones ?? phones,
        urls: field === 'urls' ? values : previous.contact?.urls ?? urls,
      },
    }));
  };

  const renderExperienceContent = () => (
    <>
      {experience.map((item) => (
        <article key={item.id} className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-brand-200/90">
            <span>{item.period}</span>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Role</label>
            <input
              value={item.role}
              onChange={(event) => {
                const value = event.target.value;
                updateData((previous) => ({
                  ...previous,
                  experience: (Array.isArray(previous.experience) ? previous.experience : []).map((entry) =>
                    entry.id === item.id ? { ...entry, role: value } : entry,
                  ),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Company</label>
            <input
              value={item.company}
              onChange={(event) => {
                const value = event.target.value;
                updateData((previous) => ({
                  ...previous,
                  experience: (Array.isArray(previous.experience) ? previous.experience : []).map((entry) =>
                    entry.id === item.id ? { ...entry, company: value } : entry,
                  ),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Highlights (one per line)</label>
            <AutoResizeTextarea
              value={(Array.isArray(item.bullets) ? item.bullets : []).join('\n')}
              onChange={(event) => {
                const value = event.target.value.split('\n').map((line) => line.trim()).filter(Boolean);
                updateData((previous) => ({
                  ...previous,
                  experience: (Array.isArray(previous.experience) ? previous.experience : []).map((entry) =>
                    entry.id === item.id ? { ...entry, bullets: value } : entry,
                  ),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        </article>
      ))}
    </>
  );

  const renderProjectsContent = () => {
    const normalizeLines = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) {
        return raw
          .map((line) => (typeof line === 'string' ? line.trim() : ''))
          .flatMap((line) => line.split('\n'))
          .map((line) => line.replace(/^[\s•·\-\u2022\u2219]+/, '').trim())
          .filter(Boolean);
      }
      if (typeof raw === 'string') {
        return raw
          .split('\n')
          .map((line) => line.replace(/^[\s•·\-\u2022\u2219]+/, '').trim())
          .filter(Boolean);
      }
      return [];
    };

    return (
      <>
        {projects.map((project) => {
          const bulletLines = normalizeLines(project.bullets);
          const fallbackLines = bulletLines.length ? bulletLines : normalizeLines(project.description);
          const textareaValue = fallbackLines.join('\n');

          return (
            <article key={project.id} className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400">Project name</label>
                <input
                  value={project.name}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateData((previous) => ({
                      ...previous,
                      projects: (Array.isArray(previous.projects) ? previous.projects : []).map((entry) =>
                        entry.id === project.id ? { ...entry, name: value } : entry,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400">Highlights (one per line)</label>
                <AutoResizeTextarea
                  value={textareaValue}
                  onChange={(event) => {
                    const lines = event.target.value
                      .split('\n')
                      .map((line) => line.replace(/^[\s•·\-\u2022\u2219]+/, '').trim())
                      .filter(Boolean);
                    const nextDescription = lines.join('\n');
                    updateData((previous) => ({
                      ...previous,
                      projects: (Array.isArray(previous.projects) ? previous.projects : []).map((entry) =>
                        entry.id === project.id
                          ? { ...entry, description: nextDescription, bullets: lines }
                          : entry,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400">Link</label>
                <input
                  value={project.link || ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateData((previous) => ({
                      ...previous,
                      projects: (Array.isArray(previous.projects) ? previous.projects : []).map((entry) =>
                        entry.id === project.id ? { ...entry, link: value } : entry,
                      ),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </article>
          );
        })}
      </>
    );
  };

  const renderEducationContent = () => (
    <>
      {education.map((entry) => (
        <article key={entry.id} className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Institution</label>
            <input
              value={entry.school}
              onChange={(event) => {
                const value = event.target.value;
                updateData((previous) => ({
                  ...previous,
                  education: (Array.isArray(previous.education) ? previous.education : []).map((item) =>
                    item.id === entry.id ? { ...item, school: value } : item,
                  ),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Degree / Program</label>
            <input
              value={entry.degree}
              onChange={(event) => {
                const value = event.target.value;
                updateData((previous) => ({
                  ...previous,
                  education: (Array.isArray(previous.education) ? previous.education : []).map((item) =>
                    item.id === entry.id ? { ...item, degree: value } : item,
                  ),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Dates</label>
            <input
              value={entry.period}
              onChange={(event) => {
                const value = event.target.value;
                updateData((previous) => ({
                  ...previous,
                  education: (Array.isArray(previous.education) ? previous.education : []).map((item) =>
                    item.id === entry.id ? { ...item, period: value } : item,
                  ),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        </article>
      ))}
    </>
  );

  const renderContactContent = () => (
    <>
      {emails.length > 0 && (
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-400">Emails (comma separated)</span>
          <input
            value={emails.join(', ')}
            onChange={handleContactChange('emails')}
            className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
          />
        </label>
      )}
      {phones.length > 0 && (
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-400">Phone numbers</span>
          <input
            value={phones.join(', ')}
            onChange={handleContactChange('phones')}
            className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
          />
        </label>
      )}
      {urls.length > 0 && (
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-400">Links</span>
          <AutoResizeTextarea
            value={urls.join('\n')}
            onChange={(event) => {
              const values = event.target.value
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean);
              updateData((previous) => ({
                ...previous,
                contact: {
                  emails: previous.contact?.emails ?? emails,
                  phones: previous.contact?.phones ?? phones,
                  urls: values,
                },
              }));
            }}
            className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
          />
        </label>
      )}
    </>
  );

  const renderSkillsContent = () => (
    <>
      <AutoResizeTextarea
        value={skills.join(', ')}
        onChange={handleSkillsChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
      />
      <p className="text-xs text-slate-500">Separate skills with commas. These power the tag cloud on your portfolio.</p>
    </>
  );

  const baseSectionEntries = [
    {
      key: 'name',
      title: 'Your Name',
      description: 'First and last name that appear on your portfolio.',
      shouldRender: true,
      render: () => (
        <input
          value={data.name || ''}
          onChange={(event) => {
            const value = event.target.value;
            updateData((previous) => ({ ...previous, name: value }));
          }}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
          placeholder="Jane Doe"
        />
      ),
    },
    {
      key: 'summary',
      title: 'Professional Summary',
      description: 'Fine tune the elevator pitch visitors will read first.',
      shouldRender: true,
      render: () => (
        <AutoResizeTextarea
          value={data.summary || ''}
          onChange={handleSummaryChange}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
        />
      ),
    },
    {
      key: 'contact',
      title: 'Contact details',
      description: 'Keep emails, phone numbers, and portfolio URLs up to date.',
      shouldRender: hasContact,
      render: renderContactContent,
    },
    {
      key: 'experience',
      title: 'Experience',
      description: 'Review titles, companies, and highlight bullets for each role.',
      shouldRender: hasExperience,
      render: renderExperienceContent,
    },
    {
      key: 'projects',
      title: 'Projects',
      description: 'Document the project impact and responsibilities. List each highlight on its own line.',
      shouldRender: hasProjects,
      render: renderProjectsContent,
    },
    {
      key: 'education',
      title: 'Education',
      description: 'Tidy school names, degrees, and date ranges.',
      shouldRender: hasEducation,
      render: renderEducationContent,
    },
    {
      key: 'skills',
      title: 'Skills',
      description: 'Comma-separated list that feeds the tag cloud in your preview.',
      shouldRender: hasSkills,
      render: renderSkillsContent,
    },
  ];

  const activeSectionEntries = useMemo(() => baseSectionEntries.filter((entry) => entry.shouldRender), [baseSectionEntries]);
  const sectionEntries = useMemo(() => {
    const orderIndex = (key) => {
      const order = reviewOrder.indexOf(key);
      if (order === -1) {
        return REVIEW_SECTION_KEYS.indexOf(key);
      }
      return order;
    };
    return [...activeSectionEntries].sort((a, b) => orderIndex(a.key) - orderIndex(b.key));
  }, [activeSectionEntries, reviewOrder]);

  const swapWithIndex = (index, direction) => {
    setReviewOrder((current) => {
      const visibleKeys = activeSectionEntries.map((e) => e.key);
      const orderedVisible = current.filter((k) => visibleKeys.includes(k));
      const original = [...current];
      const key = orderedVisible[index];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= orderedVisible.length) return current;
      const neighborKey = orderedVisible[swapIndex];
      const a = original.indexOf(key);
      const b = original.indexOf(neighborKey);
      if (a === -1 || b === -1) return current;
      const next = [...original];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {sectionEntries.map((section, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === sectionEntries.length - 1;
        const controls = (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => swapWithIndex(idx, 'up')}
              disabled={isFirst}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-600 bg-slate-900/60 px-3 text-xs font-medium text-slate-300 transition hover:border-brand-400 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Move ${section.title} up`}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => swapWithIndex(idx, 'down')}
              disabled={isLast}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-600 bg-slate-900/60 px-3 text-xs font-medium text-slate-300 transition hover:border-brand-400 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Move ${section.title} down`}
            >
              ↓
            </button>
          </div>
        );

        return (
          <div key={section.key} className="transition-all">
            <SectionCard title={section.title} description={section.description} controls={controls}>
              {section.render()}
            </SectionCard>
          </div>
        );
      })}

      {sectionEntries.length === 1 && (
        <p className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
          We generated a starter summary. Upload a richer résumé to unlock more sections to edit.
        </p>
      )}
    </div>
  );
}
