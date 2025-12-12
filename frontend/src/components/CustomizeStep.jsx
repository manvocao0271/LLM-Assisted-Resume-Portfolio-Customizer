import clsx from 'classnames';
import { usePortfolioStore } from '../store/usePortfolioStore.js';
import { PencilIcon, GlobeIcon } from './icons.jsx';

const sections = [
  { id: 'summary', label: 'Summary', description: 'Intro blurb shown at the top of the portfolio.' },
  { id: 'experience', label: 'Experience', description: 'Timeline of roles, companies, and achievements.' },
  { id: 'projects', label: 'Projects', description: 'Showcase personal or professional work highlight cards.' },
  { id: 'education', label: 'Education', description: 'Academic background and certifications.' },
  { id: 'skills', label: 'Skills', description: 'Tag cloud generated from your key skills.' },
];

export function CustomizeStep() {
  const { data, meta, updateTheme, setMeta, saveState, openPreviewDraft } = usePortfolioStore((state) => ({
    data: state.data,
    meta: state.meta,
    updateTheme: state.updateTheme,
    setMeta: state.setMeta,
    saveState: state.saveState,
    openPreviewDraft: state.openPreviewDraft,
  }));
  const handleSlugChange = (event) => {
    const rawValue = event.target.value;
    const sanitized = rawValue
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
    setMeta((previous) => ({ ...previous, slug: sanitized }));
  };

  const handleVisibilityChange = (event) => {
    const value = event.target.value;
    setMeta((previous) => ({ ...previous, visibility: value }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700 bg-slate-800/70 p-6 shadow-card">
        <header className="flex items-center gap-3 border-b border-slate-700 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
            <GlobeIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-white">Publishing settings</h3>
            <p className="text-sm text-slate-400">Control the slug and visibility of your portfolio page.</p>
          </div>
        </header>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Portfolio slug</span>
            <input
              type="text"
              value={meta.slug || ''}
              placeholder="your-name"
              onChange={handleSlugChange}
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
            />
            <span className="text-xs text-slate-500">Will appear after your domain: <code>/[slug]</code>.</span>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-200">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Visibility</span>
            <select
              value={meta.visibility}
              onChange={handleVisibilityChange}
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="private">Private (only you)</option>
              <option value="unlisted">Unlisted (shared link)</option>
              <option value="public">Public (discoverable)</option>
            </select>
            <span className="text-xs text-slate-500">Match visibility to how broadly you want to share the page.</span>
          </label>
        </div>
        <div className="mt-6 space-y-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Preview draft</p>
          <p className="text-sm text-slate-300">Open your current draft in a new tab. A slug will be auto-generated from your name if not set.</p>
          <button
            type="button"
            onClick={openPreviewDraft}
            disabled={saveState === 'saving'}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold text-white transition',
              'bg-gradient-to-r from-brand-400 to-pink-500 shadow-lg shadow-brand-500/20',
              saveState === 'saving' ? 'opacity-60' : 'hover:from-brand-300 hover:to-pink-400'
            )}
          >
            {saveState === 'saving' ? 'Saving…' : 'Preview draft'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-800/70 p-6 shadow-card">
        <header className="flex items-center gap-3 border-b border-slate-700 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
            <PencilIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-white">Themes &amp; Colorways</h3>
            <p className="text-sm text-slate-400">Pick a base layout, then fine-tune the feel of your published site.</p>
          </div>
        </header>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {data.themes.options.map((option) => {
            const isActive = data.themes.selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updateTheme(option.id)}
                className={clsx(
                  'flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200',
                  'bg-slate-900/60 hover:border-brand-400/60 hover:shadow-card',
                  isActive ? 'border-brand-500 text-white' : 'border-slate-700 text-slate-300'
                )}
              >
                <div
                  className="flex h-24 items-center justify-center rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${option.primary}, ${option.accent})`,
                  }}
                >
                  <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium uppercase tracking-widest">
                    {option.name}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{option.name}</p>
                  <p className="text-xs text-slate-400">Primary {option.primary} · Accent {option.accent}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-800/70 p-6 shadow-card">
        <header className="flex items-center gap-3 border-b border-slate-700 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
            <GlobeIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-white">Section visibility</h3>
            <p className="text-sm text-slate-400">Toggle sections you want to keep or hide before publishing.</p>
          </div>
        </header>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <label
              key={section.id}
              className="flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/50 p-4 transition hover:border-brand-400/60"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{section.label}</span>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-slate-600 text-brand-500 focus:ring-brand-500" />
              </div>
              <p className="text-xs text-slate-400">{section.description}</p>
            </label>
          ))}
        </div>
      </section>

    </div>
  );
}
