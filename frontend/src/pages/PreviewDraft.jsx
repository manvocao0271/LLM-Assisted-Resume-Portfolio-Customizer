import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { resolveApiUrl, usePortfolioStore } from '../store/usePortfolioStore.js';
import { SchemaRenderer } from '../components/SchemaRenderer.jsx';
import { PortfolioPreview } from '../components/NeonPortfolioPreview.jsx';
import { AnimatedWebBackground } from '../components/AnimatedWebBackground.jsx';

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
      console.log('Fetching preview from:', fetchUrl);
      setState((s) => ({ ...s, loading: true, error: '' }));
      try {
        const res = await fetch(fetchUrl);
        console.log('Preview response status:', res.status);
        console.log('Preview response headers:', Object.fromEntries(res.headers.entries()));
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Preview fetch failed:', res.status, errorText);
          throw new Error(errorText || `HTTP ${res.status}: Failed to load preview`);
        }
        
        const contentType = res.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        const text = await res.text();
        console.log('Raw response text:', text);
        
        if (!text) {
          throw new Error('Server returned empty response. The portfolio may not exist or has no content.');
        }
        
        const json = JSON.parse(text);
        console.log('Preview data received:', json);
        const data = json?.data || null;
        const spec = data?.generatedSpec || null;
        
        if (!data) {
          throw new Error('No portfolio data in response. Check that the slug and portfolio_id are correct.');
        }
        
        if (!cancelled) {
          setState({ loading: false, error: '', data, spec });
        }
      } catch (err) {
        console.error('Preview error:', err);
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
        <p className="text-rose-300 text-lg font-semibold mb-4">Failed to Load Preview</p>
        <p className="text-slate-300 mb-4">{state.error}</p>
        <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-4 mb-4">
          <p className="text-sm text-slate-400 font-semibold mb-2">Troubleshooting:</p>
          <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5">
            <li>Ensure you've saved your draft before previewing</li>
            <li>Check that both slug and portfolio_id are present in the URL</li>
            <li>Verify the backend is running and accessible</li>
            <li>Check browser console (F12) for detailed error messages</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Link
            to="/"
            className="rounded-full border border-brand-500 bg-brand-500/10 px-4 py-2 text-sm text-brand-200 hover:bg-brand-500/20 hover:border-brand-400"
          >
            Back to editor
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-600 hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { data, spec } = state;

  return (
    <div className="relative bg-black min-h-screen text-slate-100 overflow-hidden">
      <AnimatedWebBackground opacity={0.2} />
      <div className="relative z-10 mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border border-brand-500/30 bg-slate-950/70 p-6 shadow-card">
          <header className="mb-6">
            <h1 className="text-xl font-semibold">Unpublished Preview: {data?.meta?.slug || slug}</h1>
          </header>
          {/* For now, render generatedSpec via SchemaRenderer. If absent, fall back to theme preview. */}
          {spec ? (
            <SchemaRenderer spec={spec} />
          ) : (
            <PortfolioPreview data={data} />
          )}
        </div>
      </div>
    </div>
  );
}
