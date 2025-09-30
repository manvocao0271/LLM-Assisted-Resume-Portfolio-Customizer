import clsx from 'classnames';
import { ArrowLeftIcon, ArrowRightIcon } from './icons.jsx';
import { usePortfolioStore } from '../store/usePortfolioStore.js';

const labels = ['Upload résumé PDF', 'Review parsed data', 'Customize and preview'];

export function StepNavigation() {
  const { step, prevStep, nextStep } = usePortfolioStore((state) => ({
    step: state.step,
    prevStep: state.prevStep,
    nextStep: state.nextStep,
  }));

  const isAtBeginning = step === 0;
  const isAtEnd = step === labels.length - 1;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 px-5 py-4">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Current stage</span>
        <span className="font-medium text-slate-200">{labels[step]}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={prevStep}
          disabled={isAtBeginning}
          className={clsx(
            'flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition',
            isAtBeginning
              ? 'cursor-not-allowed opacity-40'
              : 'hover:border-brand-400/80 hover:text-brand-100'
          )}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          disabled={isAtEnd}
          className={clsx(
            'flex items-center gap-2 rounded-full bg-brand-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition',
            isAtEnd && 'cursor-not-allowed opacity-40',
            !isAtEnd && 'hover:bg-brand-500'
          )}
        >
          Next
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
