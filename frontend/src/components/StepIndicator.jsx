import clsx from 'classnames';
const steps = ['Upload PDF', 'Review & Edit', 'Customize & Preview'];

export function StepIndicator({ currentStep, onSelect }) {
  return (
    <nav className="flex flex-wrap gap-3" aria-label="Workflow steps">
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
    </nav>
  );
}
