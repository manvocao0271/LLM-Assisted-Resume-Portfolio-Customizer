import { SparklesIcon } from './icons.jsx';

export function Header() {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-brand-300 uppercase tracking-[0.35em] text-xs font-semibold">
        <SparklesIcon className="h-4 w-4" />
        <span>Resume to Portfolio</span>
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight text-white">
          Turn your résumé into a live & customizable portfolio in minutes.
        </h1>
        <p className="text-slate-300 text-base sm:text-lg max-w-2xl">
          Upload a PDF, let our LLM-based parser do the heavy lifting, then refine the sections and publish a pixel-perfect landing page.
        </p>
      </div>
    </header>
  );
}
