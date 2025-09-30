import { useCallback, useRef, useState } from 'react';
import clsx from 'classnames';
import { UploadIcon } from './icons.jsx';
import { usePortfolioStore } from '../store/usePortfolioStore.js';

const MAX_FILE_SIZE_MB = 5;

const normalizedBaseUrl = (() => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (!fromEnv) return '';
  return fromEnv.trim().replace(/\/$/, '');
})();

const candidateEndpoints = normalizedBaseUrl
  ? [`${normalizedBaseUrl}/api/parse`]
  : ['/api/parse', 'http://localhost:8000/api/parse', 'http://127.0.0.1:8000/api/parse'];

export function UploadStep() {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const { rawFile, setRawFile, setUploadStatus, uploadStatus, setParsedData, nextStep } = usePortfolioStore(
    (state) => ({
      rawFile: state.rawFile,
      setRawFile: state.setRawFile,
      setUploadStatus: state.setUploadStatus,
      uploadStatus: state.uploadStatus,
      setParsedData: state.setParsedData,
      nextStep: state.nextStep,
    }),
  );

  const handleFiles = useCallback(
    async (files) => {
      const file = files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      setError('');
      setRawFile(file);
      setUploadStatus('uploading');

      try {
        let lastNetworkError = null;

        for (const endpoint of candidateEndpoints) {
          const formData = new FormData();
          formData.append('file', file, file.name);

          let response;
          try {
            response = await fetch(endpoint, {
              method: 'POST',
              body: formData,
            });
          } catch (networkError) {
            lastNetworkError = networkError;
            continue;
          }

          const text = await response.text();
          let payload = null;
          try {
            payload = text ? JSON.parse(text) : null;
          } catch (parseError) {
            console.warn('Unable to parse API response JSON', parseError);
          }

          if (!response.ok) {
            const detail = payload?.detail || payload?.message;
            throw new Error(detail || 'Failed to parse résumé.');
          }

          if (!payload?.data) {
            throw new Error('Unexpected API response.');
          }

          setParsedData(payload.data);
          setUploadStatus('parsed');
          nextStep();
          return;
        }

        const networkMessage =
          lastNetworkError instanceof Error && lastNetworkError.message
            ? lastNetworkError.message
            : 'Could not reach the résumé parsing service.';
        throw new Error(
          `${networkMessage} Ensure the backend is running on http://localhost:8000 or set VITE_API_BASE_URL.`,
        );
      } catch (apiError) {
        console.error(apiError);
        setUploadStatus('error');
        setError(apiError.message || 'Something went wrong while parsing the résumé.');
      }
    },
    [setRawFile, setUploadStatus, setParsedData, nextStep],
  );

  const onDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleFiles(event.dataTransfer.files);
  };

  const onClickBrowse = () => {
    inputRef.current?.click();
  };

  const statusMessage = {
    idle: 'Drop your résumé PDF here or browse files',
    uploading: 'Uploading résumé…',
    parsed: 'Résumé parsed! Move to the next step to review data.',
    error: 'We hit a snag while parsing. Please try again.',
  }[uploadStatus];

  return (
    <section
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      className={clsx(
        'relative flex min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors duration-200',
        'bg-slate-800/60 border-slate-600 hover:border-brand-400/80 hover:bg-slate-800'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={(event) => handleFiles(event.target.files)}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
          <UploadIcon className="h-8 w-8" />
        </span>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-white">{statusMessage}</p>
          <p className="text-sm text-slate-400">
            We support up to {MAX_FILE_SIZE_MB}MB PDFs. Parsing happens on the server — no data is stored until you publish.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={onClickBrowse}
            className="rounded-full bg-brand-500/90 px-5 py-2 font-medium text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-500"
          >
            Browse files
          </button>
          {rawFile && (
            <span className="rounded-full bg-slate-700/80 px-4 py-2 text-slate-300">
              Selected: <strong className="text-white">{rawFile.name}</strong>
            </span>
          )}
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
