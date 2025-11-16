import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { resolveApiUrl, usePortfolioStore } from '../store/usePortfolioStore.js';
import { SchemaRenderer } from '../components/SchemaRenderer.jsx';
import { PortfolioPreview } from '../components/PortfolioPreview.jsx';

export default function PreviewDraftPage() {
  const { slug } = useParams();
  const [search] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: '', data: null, spec: null });

  const fetchUrl = useMemo(() => {
    const pid = search.get('portfolio_id');
    if (pid) {
      const id = encodeURIComponent(pid);
      const s = encodeURIComponent(slug);
      return resolveApiUrl(`/api/portfolios/preview/${s}?portfolio_id=${id}`);
    }
    return resolveApiUrl(`/api/portfolios/by-slug/${encodeURIComponent(slug)}`);
  }, [slug, search]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setState((s) => ({ ...s, loading: true, error: '' }));
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const json = await res.json();
        const data = json?.data || null;
        const spec = data?.generatedSpec || null;
        if (!cancelled) {
          setState({ loading: false, error: '', data, spec });
        }
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err?.message || 'Failed to load preview', data: null, spec: null });
      }
    }
    run();
    return () => { cancelled = true; };
  }, [fetchUrl]);

  if (state.loading) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-slate-200">
        <p>Preparing preview…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-slate-200">
        <p className="text-rose-300">{state.error}</p>
        <p className="text-sm text-slate-400 mt-2">If this is a draft, ensure the backend supports draft previews by slug.</p>
        <Link to="/" className="text-brand-200 underline-offset-4 hover:underline">Back to editor</Link>
      </div>
    );
  }

  const { data, spec } = state;

  return (
    <div className="bg-slate-900 min-h-screen text-slate-100">
      <div className="mx-auto max-w-4xl p-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Unpublished Preview: {data?.meta?.slug || slug}</h1>
          <Link to="/" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-brand-400 hover:text-brand-100">Return to editor</Link>
        </header>
        {/* For now, render generatedSpec via SchemaRenderer. If absent, fall back to theme preview. */}
        {spec ? (
          <SchemaRenderer spec={spec} />
        ) : (
          <PortfolioPreview data={data} />
        )}
      </div>
    </div>
  );
}
