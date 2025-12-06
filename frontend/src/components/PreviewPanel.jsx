import clsx from 'classnames';
import { useState } from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore.js';

export function PreviewPanel() {
  const { meta, saveDraft, setMeta, saveState, lastError, openPreviewDraft } = usePortfolioStore((state) => ({
    meta: state.meta,
    saveDraft: state.saveDraft,
    setMeta: state.setMeta,
    saveState: state.saveState,
    lastError: state.lastError,
    openPreviewDraft: state.openPreviewDraft,
  }));

  const [publishHint, setPublishHint] = useState('');

  const handlePublish = async () => {
    if (!meta?.portfolioId) {
      return;
    }
    if (!meta.slug) {
      setPublishHint('Add a portfolio slug before publishing.');
      return;
    }
    if (meta.visibility === 'private') {
      setPublishHint('Set visibility to Unlisted or Public to make the page accessible.');
      return;
    }

    setPublishHint('Publishing…');
    setMeta((previous) => ({
      ...previous,
      status: 'published',
    }));
    const success = await saveDraft();
    if (success) {
      setPublishHint('Published! Share the link below.');
    } else {
      setPublishHint(lastError || 'Publishing failed. Try again.');
    }
  };

  const publishDisabled =
    !meta?.portfolioId || saveState === 'saving' || !meta?.slug || meta.visibility === 'private';

  return (
    <div className="mt-8 grid w-full gap-4 rounded-3xl border border-brand-500/30 bg-slate-950/60 p-6 shadow-card">
      <div className="space-y-2 rounded-2xl border border-brand-500/50 bg-slate-900/80 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Preview</p>
        <p className="text-sm text-slate-300">Open an unpublished preview in a new tab. A slug will be auto-generated if not set.</p>
        <button
          type="button"
          onClick={openPreviewDraft}
          disabled={saveState === 'saving'}
          className={clsx(
            'rounded-full px-4 py-2 text-sm font-semibold text-white transition',
            'bg-gradient-to-r from-brand-500 via-brand-400 to-accent-400 shadow-lg shadow-brand-500/30',
            saveState === 'saving'
              ? 'opacity-60'
              : 'hover:from-brand-400 hover:via-brand-300 hover:to-accent-300'
          )}
        >
          {saveState === 'saving' ? 'Saving…' : 'Preview draft'}
        </button>
      </div>
      <div className="space-y-3 rounded-2xl border border-brand-500/40 bg-slate-900/80 p-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Publishing</p>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishDisabled}
          className={clsx(
            'rounded-full px-4 py-2 text-sm font-semibold text-white transition',
            'bg-gradient-to-r from-brand-500 via-brand-400 to-accent-400 shadow-lg shadow-brand-500/30',
            publishDisabled
              ? 'cursor-not-allowed opacity-60'
              : 'hover:from-brand-400 hover:via-brand-300 hover:to-accent-300'
          )}
        >
          {saveState === 'saving' ? 'Saving…' : meta?.status === 'published' ? 'Republish' : 'Publish draft'}
        </button>
        {publishHint && <p className="text-xs text-slate-400">{publishHint}</p>}
        {lastError && saveState === 'error' && <p className="text-xs text-rose-400">{lastError}</p>}
      </div>
    </div>
  );
}
