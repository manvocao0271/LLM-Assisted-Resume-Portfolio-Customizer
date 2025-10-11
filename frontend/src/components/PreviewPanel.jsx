import clsx from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { PortfolioPreview } from './PortfolioPreview.jsx';
import { usePortfolioStore } from '../store/usePortfolioStore.js';

export function PreviewPanel() {
  const { data, meta, saveDraft, setMeta, saveState, lastError } = usePortfolioStore((state) => ({
    data: state.data,
    meta: state.meta,
    saveDraft: state.saveDraft,
    setMeta: state.setMeta,
    saveState: state.saveState,
    lastError: state.lastError,
  }));

  const [publishHint, setPublishHint] = useState('');
  const [copyState, setCopyState] = useState('idle');

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

  const shareUrl = useMemo(() => {
    if (!meta?.slug || meta.visibility === 'private') {
      return '';
    }
    if (typeof window === 'undefined') {
      return `/p/${meta.slug}`;
    }
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}/p/${meta.slug}`;
  }, [meta?.slug, meta?.visibility]);

  const publishDisabled =
    !meta?.portfolioId || saveState === 'saving' || !meta?.slug || meta.visibility === 'private';

  useEffect(() => {
    if (copyState !== 'copied') {
      return;
    }
    const timeout = setTimeout(() => setCopyState('idle'), 2000);
    return () => clearTimeout(timeout);
  }, [copyState]);

  const handleCopyLink = async () => {
    if (!shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
    } catch (error) {
      console.warn('Unable to copy share link', error);
      setCopyState('error');
    }
  };

  const shareMessage = useMemo(() => {
    if (!meta?.slug) {
      return 'Choose a slug to generate your shareable link.';
    }
    if (meta.visibility === 'private') {
      return 'Switch visibility to Unlisted or Public to share this page.';
    }
    return '';
  }, [meta?.slug, meta?.visibility]);

  const reviewOrder = usePortfolioStore((state) => state.reviewOrder);

  return (
    <aside
      className="sticky top-10 hidden h-fit rounded-3xl border border-slate-700/70 bg-slate-900/70 p-8 shadow-card lg:block"
      aria-label="Live portfolio preview"
    >
  <PortfolioPreview data={{ ...data, layout: { sectionOrder: reviewOrder } }} />

      <footer className="mt-6 space-y-3 rounded-2xl bg-slate-900/80 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Preview URL</p>
            {shareUrl ? (
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="break-words text-sm font-medium text-brand-200 underline-offset-4 hover:text-brand-100 hover:underline"
              >
                {shareUrl}
              </a>
            ) : (
              <p className="break-words text-sm font-medium text-slate-200">{shareMessage}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishDisabled}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold text-white transition',
              'bg-gradient-to-r from-brand-400 to-pink-500 shadow-lg shadow-brand-500/20',
              publishDisabled
                ? 'cursor-not-allowed opacity-60'
                : 'hover:from-brand-300 hover:to-pink-400'
            )}
          >
            {saveState === 'saving' ? 'Saving…' : meta?.status === 'published' ? 'Republish' : 'Publish draft'}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!shareUrl}
            className={clsx(
              'rounded-full border px-4 py-2 text-sm font-medium transition',
              shareUrl
                ? 'border-brand-400/70 text-brand-100 hover:border-brand-300 hover:text-brand-50'
                : 'border-slate-700 text-slate-400 opacity-50'
            )}
          >
            {copyState === 'copied' ? 'Link copied!' : 'Copy share link'}
          </button>
        </div>
        {publishHint && <p className="text-xs text-slate-400">{publishHint}</p>}
        {lastError && saveState === 'error' && <p className="text-xs text-rose-400">{lastError}</p>}
      </footer>
    </aside>
  );
}
