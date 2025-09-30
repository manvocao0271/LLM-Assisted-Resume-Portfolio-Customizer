import { usePortfolioStore } from '../store/usePortfolioStore.js';

function SectionCard({ title, children, action }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-slate-700 pb-3">
        <h3 className="font-semibold text-white">{title}</h3>
        {action}
      </div>
      <div className="mt-4 space-y-4 text-sm text-slate-200">{children}</div>
    </div>
  );
}

export function ReviewStep() {
  const data = usePortfolioStore((state) => state.data);
  const updateData = usePortfolioStore((state) => state.updateData);

  const experience = Array.isArray(data.experience) ? data.experience : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];

  const handleSummaryChange = (event) => {
    const value = event.target.value;
    updateData((previous) => ({ ...previous, summary: value }));
  };

  const handleSkillsChange = (event) => {
    const skills = event.target.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    updateData((previous) => ({ ...previous, skills }));
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Professional Summary">
        <textarea
          value={data.summary || ''}
          onChange={handleSummaryChange}
          rows={4}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
        />
      </SectionCard>

      <SectionCard title="Experience">
        {experience.length === 0 && (
          <p className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-400">
            No experience entries yet. Upload a résumé or add items manually.
          </p>
        )}
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
                value={item.bullets.join('\n')}
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

      <SectionCard title="Skills">
        <textarea
          value={skills.join(', ')}
          onChange={handleSkillsChange}
          rows={2}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
        />
        <p className="text-xs text-slate-500">Separate skills with commas. These power the tag cloud on your portfolio.</p>
      </SectionCard>
    </div>
  );
}
