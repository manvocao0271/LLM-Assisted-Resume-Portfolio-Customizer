import { Header } from './components/Header.jsx';
import { StepIndicator } from './components/StepIndicator.jsx';
import { UploadStep } from './components/UploadStep.jsx';
import { ReviewStep } from './components/ReviewStep.jsx';
import { CustomizeStep } from './components/CustomizeStep.jsx';
import { StepNavigation } from './components/StepNavigation.jsx';
import { PreviewPanel } from './components/PreviewPanel.jsx';
import { usePortfolioStore } from './store/usePortfolioStore.js';

const steps = [UploadStep, ReviewStep, CustomizeStep];

export default function App() {
  const { step, setStep } = usePortfolioStore((state) => ({
    step: state.step,
    setStep: state.setStep,
  }));

  const ActiveStepComponent = steps[step] ?? UploadStep;

  return (
    <div className="bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-12 px-6 py-10 lg:flex-row">
        <div className="flex-1 space-y-10">
          <Header />
          <StepIndicator currentStep={step} onSelect={setStep} />
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-card">
            <ActiveStepComponent />
          </div>
          <StepNavigation />
        </div>
        <div className="lg:w-[420px]">
          <PreviewPanel />
        </div>
      </div>
    </div>
  );
}
