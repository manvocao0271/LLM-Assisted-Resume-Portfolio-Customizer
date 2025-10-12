import { useMemo, useRef, useEffect, useState } from 'react';

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

  const hasContact = true; // Always show contact editors so users can add details
  const hasExperience = experience.length > 0;
  const hasProjects = projects.length > 0;
  const hasEducation = education.length > 0;
  const hasSkills = skills.length > 0;

  // Summary local buffer
  const [summaryValue, setSummaryValue] = useState(data.summary || '');
  useEffect(() => {
    setSummaryValue(data.summary || '');
  }, [data.summary]);

  // Local buffer for skills to avoid stripping spaces/commas while typing
  const [skillsValue, setSkillsValue] = useState((Array.isArray(skills) ? skills : []).join(', '));
  useEffect(() => {
    // Keep local buffer in sync when store.skills changes externally (e.g., after upload)
    const joined = (Array.isArray(skills) ? skills : []).join(', ');
    setSkillsValue(joined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills.join('|')]);

  // Validator for https URLs
  const isValidHttpsUrl = (value) => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Contact local buffers (single email, single phone, and dynamic URL inputs)
  const [emailValue, setEmailValue] = useState(emails[0] || '');
  const [phoneValue, setPhoneValue] = useState(phones[0] || '');
  const [urlInputs, setUrlInputs] = useState(() => {
    const initial = Array.isArray(urls) ? urls.filter((u) => isValidHttpsUrl(u)) : [];
    return initial.length ? initial : [''];
  });
  useEffect(() => setEmailValue(emails[0] || ''), [emails[0] || '']);
  useEffect(() => setPhoneValue(phones[0] || ''), [phones[0] || '']);
  useEffect(() => {
    const next = Array.isArray(urls) ? urls.filter((u) => isValidHttpsUrl(u)) : [];
    setUrlInputs(next.length ? next : ['']);
  }, [urls.map?.((u) => u || '').join('|') || '']);

  // Experience bullets local buffers (per entry)
  const [expBuffers, setExpBuffers] = useState({});
  useEffect(() => {
    // Initialize buffers for any new experience entries
    setExpBuffers((prev) => {
      const next = { ...prev };
      for (const item of experience) {
        if (next[item.id] === undefined) {
          next[item.id] = (Array.isArray(item.bullets) ? item.bullets : []).join('\n');
        }
      }
      return next;
    });
  }, [experience.map((e) => e.id).join('|')]);

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
              value={expBuffers[item.id] ?? (Array.isArray(item.bullets) ? item.bullets : []).join('\n')}
              onChange={(event) => {
                const raw = event.target.value;
                setExpBuffers((prev) => ({ ...prev, [item.id]: raw }));
              }}
              onBlur={() => {
                const lines = String(expBuffers[item.id] ?? '')
                  .split('\n')
                  .map((line) => line.replace(/^[\s•·\-\u2022\u2219]+/, '').trim())
                  .filter(Boolean);
                updateData((previous) => ({
                  ...previous,
                  experience: (Array.isArray(previous.experience) ? previous.experience : []).map((entry) =>
                    entry.id === item.id ? { ...entry, bullets: lines } : entry,
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

    // Project highlights local buffers (per project)
    const [projBuffers, setProjBuffers] = useState({});
    useEffect(() => {
      setProjBuffers((prev) => {
        const next = { ...prev };
        for (const p of projects) {
          if (next[p.id] === undefined) {
            const bulletLines = normalizeLines(p.bullets);
            const fallbackLines = bulletLines.length ? bulletLines : normalizeLines(p.description);
            next[p.id] = fallbackLines.join('\n');
          }
        }
        return next;
      });
    }, [projects.map((p) => p.id).join('|')]);

    return (
      <>
        {projects.map((project) => {
          const bulletLines = normalizeLines(project.bullets);
          const fallbackLines = bulletLines.length ? bulletLines : normalizeLines(project.description);
          const textareaValue = projBuffers[project.id] ?? fallbackLines.join('\n');

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
                    const raw = event.target.value;
                    setProjBuffers((prev) => ({ ...prev, [project.id]: raw }));
                  }}
                  onBlur={() => {
                    const lines = String(projBuffers[project.id] ?? '')
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
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-2 sm:col-span-1">
        <span className="text-xs uppercase tracking-widest text-slate-400">Email</span>
        <input
          type="email"
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          onBlur={() => {
            const val = emailValue.trim();
            updateData((previous) => ({
              ...previous,
              contact: { ...previous.contact, emails: val ? [val] : [] },
            }));
          }}
          placeholder="jane.doe@example.com"
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <label className="flex flex-col gap-2 sm:col-span-1">
        <span className="text-xs uppercase tracking-widest text-slate-400">Phone</span>
        <input
          type="tel"
          value={phoneValue}
          onChange={(e) => setPhoneValue(e.target.value)}
          onBlur={() => {
            const val = phoneValue.trim();
            updateData((previous) => ({
              ...previous,
              contact: { ...previous.contact, phones: val ? [val] : [] },
            }));
          }}
          placeholder="(555) 123-4567"
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-slate-400">Links (HTTPS)</span>
          <button
            type="button"
            onClick={() => setUrlInputs((prev) => [...prev, ''])}
            className="rounded-md border border-slate-600 bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-300 hover:border-brand-400 hover:text-brand-300"
          >
            + Add URL
          </button>
        </div>
        <div className="space-y-2">
          {urlInputs.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="url"
                value={val}
                onChange={(e) => {
                  const v = e.target.value;
                  setUrlInputs((prev) => {
                    const next = [...prev];
                    next[idx] = v;
                    return next;
                  });
                }}
                onBlur={() => {
                  const values = urlInputs
                    .map((u) => u.trim())
                    .filter((u) => u.length > 0 && isValidHttpsUrl(u));
                  updateData((previous) => ({
                    ...previous,
                    contact: { ...previous.contact, urls: values },
                  }));
                }}
                placeholder={idx === 0 ? 'https://www.linkedin.com/in/username' : idx === 1 ? 'https://github.com/username' : 'https://your-site.com'}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
              />
              <button
                type="button"
                onClick={() => {
                  setUrlInputs((prev) => {
                    const next = prev.filter((_, i) => i !== idx);
                    // Also update store after removal
                    const values = next.map((u) => u.trim()).filter((u) => u.length > 0 && isValidHttpsUrl(u));
                    updateData((previous) => ({
                      ...previous,
                      contact: { ...previous.contact, urls: values },
                    }));
                    return next.length ? next : [''];
                  });
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 text-slate-300 hover:border-rose-400 hover:text-rose-300"
                aria-label={`Remove URL #${idx + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSkillsContent = () => (
    <>
      <AutoResizeTextarea
        value={skillsValue}
        onChange={(e) => setSkillsValue(e.target.value)}
        onBlur={() => {
          const nextSkills = skillsValue
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean);
          updateData((previous) => ({ ...previous, skills: nextSkills }));
        }}
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
          value={summaryValue}
          onChange={(e) => setSummaryValue(e.target.value)}
          onBlur={() => updateData((previous) => ({ ...previous, summary: summaryValue }))}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
        />
      ),
    },
    {
      key: 'contact',
      title: 'Contact details',
      description: 'Add your email, phone, and up to three social/portfolio links.',
      shouldRender: true,
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
