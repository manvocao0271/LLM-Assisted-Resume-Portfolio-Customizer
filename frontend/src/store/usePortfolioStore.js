import { create } from 'zustand';

const THEME_OPTIONS = [
  { id: 'aurora', name: 'Aurora', primary: '#42a5f5', accent: '#f472b6' },
  { id: 'midnight', name: 'Midnight', primary: '#6366f1', accent: '#22d3ee' },
  { id: 'dawn', name: 'Dawn', primary: '#f97316', accent: '#facc15' },
];

const initialData = {
  name: '',
  summary: '',
  experience: [],
  education: [],
  projects: [],
  skills: [],
  contact: {
    emails: [],
    phones: [],
    urls: [],
  },
  embedded_links: [],
  themes: {
    selected: THEME_OPTIONS[0].id,
    options: THEME_OPTIONS,
  },
  raw: {},
};

export const usePortfolioStore = create((set) => ({
  step: 0,
  data: initialData,
  uploadStatus: 'idle',
  rawFile: null,
  setStep: (step) => set({ step }),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 2) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 0) })),
  setRawFile: (file) => set({ rawFile: file }),
  setUploadStatus: (status) => set({ uploadStatus: status }),
  setParsedData: (payload) =>
    set((state) => ({
      data: {
        ...state.data,
        ...payload,
        themes: payload.themes || state.data.themes,
      },
    })),
  updateData: (updater) =>
    set((state) => ({
      data: typeof updater === 'function' ? updater(state.data) : updater,
    })),
  updateTheme: (themeId) =>
    set((state) => ({
      data: {
        ...state.data,
        themes: {
          ...state.data.themes,
          selected: themeId,
        },
      },
    })),
}));
