import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PortfolioPreview } from '../components/NeonPortfolioPreview.jsx';
import { resolveApiUrl } from '../store/usePortfolioStore.js';

function LoadingState() {
  return (
    <div className="space-y-4 text-center text-slate-200">
      <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Loading portfolio</p>
      <p className="text-lg font-semibold">Rendering your published résumé…</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="space-y-4 text-center text-slate-200">
      <p className="text-sm uppercase tracking-[0.4em] text-rose-400">Unavailable</p>
      <p className="text-lg font-semibold">{message}</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-full border border-brand-400/70 px-4 py-2 text-sm font-medium text-brand-100 transition hover:border-brand-300 hover:text-brand-50"
      >
        Back to builder
      </Link>
    </div>
  );
}

export default function PublicPortfolioPage() {
  const { slug = '' } = useParams();
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    if (!slug) {
      setState({ status: 'error', data: null, error: 'No portfolio slug supplied.' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', data: null, error: '' });

    const fetchPortfolio = async () => {
      try {
        const response = await fetch(resolveApiUrl(`/api/portfolios/by-slug/${encodeURIComponent(slug)}`));
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'This portfolio could not be found.' : 'Failed to load portfolio.');
        }
        const result = await response.json();
        if (!cancelled) {
          setState({ status: 'loaded', data: result?.data ?? null, error: '' });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: 'error', data: null, error: error.message || 'Failed to load portfolio.' });
        }
      }
    };

    fetchPortfolio();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const data = useMemo(() => (state.data && typeof state.data === 'object' ? state.data : null), [state.data]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-brand-300 hover:text-brand-200">
            ← Launch builder
          </Link>
          {data?.meta?.updated_at && (
            <p className="text-xs text-slate-500">
              Last updated {new Date(data.meta.updated_at).toLocaleString()}
            </p>
          )}
        </header>

        <main className="flex flex-1 items-center justify-center">
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'error' && <ErrorState message={state.error} />}
          {state.status === 'loaded' && data && (
            <div className="w-full">
              <PortfolioPreview data={data} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
