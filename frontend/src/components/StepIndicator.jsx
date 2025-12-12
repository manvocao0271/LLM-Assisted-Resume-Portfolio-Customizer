import clsx from 'classnames';
import { usePortfolioStore } from '../store/usePortfolioStore.js';

const steps = ['Upload PDF', 'Review & Edit', 'Customize & Preview'];

export function StepIndicator({ currentStep, onSelect }) {
  const {
    saveDraft,
    meta,
    dirty,
    saveState,
    lastSavedAt,
    lastError,
  } = usePortfolioStore((state) => ({
    saveDraft: state.saveDraft,
    meta: state.meta,
    dirty: state.dirty,
    saveState: state.saveState,
    lastSavedAt: state.lastSavedAt,
    lastError: state.lastError,
  }));

  const isSaving = saveState === 'saving';
  const hasIds = Boolean(meta?.portfolioId);
  const canSave = hasIds && (dirty || saveState === 'error');
  const showSaveButton = currentStep >= 1;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    await saveDraft();
  };

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Workflow steps">
      <div className="flex flex-wrap gap-3">
        {steps.map((label, index) => {
          const isActive = currentStep === index;
          const isComplete = index < currentStep;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(index)}
              className={clsx(
                'flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-all duration-200',
                isActive && 'bg-brand-500/20 text-brand-200 ring-2 ring-brand-500/60',
                isComplete && 'bg-emerald-500/20 text-emerald-200',
                !isActive && !isComplete && 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              )}
            >
              <span
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                  isActive && 'border-brand-400 text-brand-100',
                  isComplete && 'border-emerald-400 text-emerald-100',
                  !isActive && !isComplete && 'border-slate-600 text-slate-400'
                )}
              >
                {index + 1}
              </span>
              <span className="font-medium whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>

      {showSaveButton && (
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className={clsx(
            'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition whitespace-nowrap',
            canSave && !isSaving
              ? 'bg-brand-500/90 text-white hover:bg-brand-500 shadow-lg shadow-brand-500/20'
              : 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
          )}
        >
          {isSaving ? 'Saving…' : saveState === 'error' ? 'Retry save' : dirty ? 'Save' : 'Saved'}
        </button>
      )}
    </nav>
  );
}
