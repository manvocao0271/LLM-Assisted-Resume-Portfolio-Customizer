import { usePortfolioStore } from '../store/usePortfolioStore.js';

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow-card">
      <header className="border-b border-slate-700 pb-3">
        <h3 className="font-semibold text-white">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
      </header>
      <div className="mt-4 space-y-4 text-sm text-slate-200">{children}</div>
    </section>
  );
}

export function ReviewStep() {
  const data = usePortfolioStore((state) => state.data);
  const updateData = usePortfolioStore((state) => state.updateData);

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

  const renderExperience = () => (
    <SectionCard
      key="experience"
      title="Experience"
      description="Review titles, companies, and highlight bullets for each role."
    >
      {experience.map((item) => (
        <article key={item.id} className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase text-brand-200/90 tracking-[0.3em]">
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
            <textarea
              value={(Array.isArray(item.bullets) ? item.bullets : []).join('\n')}
              rows={3}
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
    </SectionCard>
  );

  const renderProjects = () => (
    <SectionCard
      key="projects"
      title="Projects"
      description="Document the project impact and responsibilities. List each highlight on its own line."
    >
      {projects.map((project) => {
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
              <textarea
                value={textareaValue}
                rows={3}
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
    </SectionCard>
  );

  const renderEducation = () => (
    <SectionCard
      key="education"
      title="Education"
      description="Tidy school names, degrees, and date ranges."
    >
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
    </SectionCard>
  );

  const renderContact = () => (
    <SectionCard
      key="contact"
      title="Contact details"
      description="Keep emails, phone numbers, and portfolio URLs up to date."
    >
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
          <textarea
            value={urls.join('\n')}
            rows={urls.length > 3 ? 4 : 3}
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
    </SectionCard>
  );

  const sections = [
    <SectionCard
      key="summary"
      title="Professional Summary"
      description="Fine tune the elevator pitch visitors will read first."
    >
      <textarea
        value={data.summary || ''}
        onChange={handleSummaryChange}
        rows={4}
        className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
      />
    </SectionCard>,
  ];

  if (hasContact) {
    sections.push(renderContact());
  }
  if (hasExperience) {
    sections.push(renderExperience());
  }
  if (hasProjects) {
    sections.push(renderProjects());
  }
  if (hasEducation) {
    sections.push(renderEducation());
  }
  if (hasSkills) {
    sections.push(
      <SectionCard
        key="skills"
        title="Skills"
        description="Comma-separated list that feeds the tag cloud in your preview."
      >
        <textarea
          value={skills.join(', ')}
          onChange={handleSkillsChange}
          rows={2}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
        />
        <p className="text-xs text-slate-500">Separate skills with commas. These power the tag cloud on your portfolio.</p>
      </SectionCard>,
    );
  }

  return (
    <div className="space-y-6">
      {sections}
      {sections.length === 1 && (
        <p className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
          We generated a starter summary. Upload a richer résumé to unlock more sections to edit.
        </p>
      )}
    </div>
  );
}
