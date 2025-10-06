import clsx from 'classnames';
import { ArrowLeftIcon, ArrowRightIcon } from './icons.jsx';
import { usePortfolioStore } from '../store/usePortfolioStore.js';

const labels = ['Upload résumé PDF', 'Review parsed data', 'Customize and preview'];

export function StepNavigation() {
  const {
    step,
    prevStep,
    nextStep,
    saveDraft,
    meta,
    dirty,
    saveState,
    lastSavedAt,
    lastError,
  } = usePortfolioStore((state) => ({
    step: state.step,
    prevStep: state.prevStep,
    nextStep: state.nextStep,
    saveDraft: state.saveDraft,
    meta: state.meta,
    dirty: state.dirty,
    saveState: state.saveState,
    lastSavedAt: state.lastSavedAt,
    lastError: state.lastError,
  }));

  const isAtBeginning = step === 0;
  const isAtEnd = step === labels.length - 1;
  const isSaving = saveState === 'saving';
  const hasIds = Boolean(meta?.portfolioId);
  const canSave = hasIds && (dirty || saveState === 'error');

  const handleNext = async () => {
    if (isAtEnd) {
      return;
    }

    if (step >= 1 && hasIds) {
      const didSave = await saveDraft();
      if (!didSave) {
        return;
      }
    }

    nextStep();
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    await saveDraft();
  };

  const savedLabel = (() => {
    if (!hasIds) {
      return 'Changes stay local until you upload a résumé.';
    }
    if (saveState === 'saving') {
      return 'Saving draft…';
    }
    if (saveState === 'error') {
      return lastError ? `Error: ${lastError}` : 'We could not save — try again.';
    }
    if (saveState === 'saved' && lastSavedAt) {
      const timestamp = new Date(lastSavedAt).toLocaleTimeString();
      return `Draft saved at ${timestamp}`;
    }
    return dirty ? 'Unsaved changes pending.' : 'Draft is up to date.';
  })();

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 px-5 py-4">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Current stage</span>
        <span className="font-medium text-slate-200">{labels[step]}</span>
        <span className="text-[11px] text-slate-500">{savedLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        {step >= 1 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className={clsx(
              'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
              canSave && !isSaving
                ? 'border-brand-400/70 text-brand-100 hover:border-brand-300 hover:text-brand-50'
                : 'border-slate-700 text-slate-400 opacity-50'
            )}
          >
            {isSaving ? 'Saving…' : saveState === 'error' ? 'Retry save' : dirty ? 'Save draft' : 'Saved'}
          </button>
        )}
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
          onClick={handleNext}
          disabled={isAtEnd || isSaving}
          className={clsx(
            'flex items-center gap-2 rounded-full bg-brand-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition',
            isAtEnd && 'cursor-not-allowed opacity-40',
            !isAtEnd && !isSaving && 'hover:bg-brand-500',
            isSaving && 'cursor-wait opacity-70'
          )}
        >
          Next
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
