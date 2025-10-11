import { create } from 'zustand';

export const REVIEW_SECTION_KEYS = ['summary', 'contact', 'experience', 'projects', 'education', 'skills'];

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
  meta: {
    resume_id: null,
    portfolio_id: null,
    status: 'draft',
    visibility: 'private',
  },
};

const initialMeta = {
  resumeId: null,
  portfolioId: null,
  status: 'draft',
  visibility: 'private',
  slug: '',
  publishedAt: null,
};

const normalizeReviewOrder = (order) => {
  const nextOrder = Array.isArray(order) ? order.filter((key) => typeof key === 'string') : [];
  const unique = [];

  for (const key of nextOrder) {
    if (REVIEW_SECTION_KEYS.includes(key) && !unique.includes(key)) {
      unique.push(key);
    }
  }

  for (const key of REVIEW_SECTION_KEYS) {
    if (!unique.includes(key)) {
      unique.push(key);
    }
  }

  return unique;
};

const generateSummary = (payload) => {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const experience = Array.isArray(payload.experience) ? payload.experience : [];
  const skills = Array.isArray(payload.skills) ? payload.skills : [];

  const leadExperience = experience.find((entry) => entry && (entry.role || entry.company || entry.period));

  const skillHighlights = skills.filter(Boolean).slice(0, 3);

  if (leadExperience) {
    const role = leadExperience.role || leadExperience.title || 'experienced professional';
    const company = leadExperience.company || leadExperience.organization || '';
    const period = leadExperience.period || '';

    const segments = [
      name ? `${name} is a` : 'Experienced',
      `${role}${company ? ` at ${company}` : ''}`,
      period ? `with a track record spanning ${period}.` : 'with a track record of delivering impact.',
    ];

    if (skillHighlights.length) {
      segments.push(`Skilled in ${skillHighlights.join(', ')} and eager to showcase work through a polished portfolio.`);
    } else {
      segments.push('Eager to translate recent achievements into a standout portfolio presentation.');
    }

    return segments.join(' ').replace(/\s+/g, ' ').trim();
  }

  if (skillHighlights.length) {
    return (
      name
        ? `${name} brings strengths in ${skillHighlights.join(', ')} and is ready to highlight accomplishments in a tailored portfolio.`
        : `Skilled in ${skillHighlights.join(', ')}, ready to highlight accomplishments in a tailored portfolio.`
    );
  }

  return (
    name
      ? `${name} is preparing a portfolio to spotlight key achievements, strengths, and career story.`
      : 'Preparing a portfolio to spotlight key achievements, strengths, and career story.'
  );
};

const normalizedBaseUrl = (() => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (!fromEnv) return '';
  return fromEnv.trim().replace(/\/$/, '');
})();

const withBaseUrl = (path) => {
  if (!path.startsWith('/')) {
    return path;
  }
  return normalizedBaseUrl ? `${normalizedBaseUrl}${path}` : path;
};

const SESSION_KEY = 'resumeparser.session';

const readSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Unable to read session storage', error);
    return null;
  }
};

const writeSession = (meta) => {
  if (typeof window === 'undefined') return;
  try {
    if (meta?.portfolioId) {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        portfolioId: meta.portfolioId,
        resumeId: meta.resumeId,
      }));
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
    console.warn('Unable to update session storage', error);
  }
};

const clearSessionStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear session storage', error);
  }
};

const deepClone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const sanitizeData = (payload) => {
  const base = payload && typeof payload === 'object' ? payload : {};
  const contact = base.contact && typeof base.contact === 'object' ? base.contact : {};
  const themes = base.themes && typeof base.themes === 'object' ? base.themes : {};

  const themeOptions = Array.isArray(themes.options) && themes.options.length > 0 ? themes.options : THEME_OPTIONS;
  const selectedTheme = themes.selected || themeOptions[0]?.id || THEME_OPTIONS[0].id;
  const normalizedSummary = Array.isArray(base.summary)
    ? base.summary.map((line) => String(line).trim()).filter(Boolean).join(' ')
    : typeof base.summary === 'string'
      ? base.summary.trim()
      : '';
  const summary = normalizedSummary || generateSummary(base);

  const extractText = (value) => {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim();
    }
    if (Array.isArray(value)) {
      return value.map(extractText).filter(Boolean).join(' ');
    }
    if (typeof value === 'object') {
      const preferredKeys = ['text', 'description', 'summary', 'detail', 'value', 'content'];
      for (const key of preferredKeys) {
        if (key in value && value[key] != null) {
          const result = extractText(value[key]);
          if (result) {
            return result;
          }
        }
      }
      const combined = Object.values(value).map(extractText).filter(Boolean);
      if (combined.length) {
        return combined.join(' ');
      }
    }
    return '';
  };

  const normalizeStringArray = (value) => {
    if (Array.isArray(value)) {
      return value.map(extractText).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }
    return [];
  };

  const splitIntoLines = (value) => {
    if (typeof value !== 'string') {
      return [];
    }
    return value
      .split(/\r?\n+/)
      .map((line) => line.replace(/^[\s•·\-\u2022\u2219]+/, '').trim())
      .filter(Boolean);
  };

  const expandLines = (values) => {
    if (!Array.isArray(values)) {
      return [];
    }
    return values
      .flatMap((entry) => (typeof entry === 'string' ? splitIntoLines(entry) : []))
      .filter(Boolean);
  };

  const normalizedExperience = Array.isArray(base.experience)
    ? base.experience.map((entry) => {
        const bullets = normalizeStringArray(entry?.bullets ?? entry?.achievements);
        return {
          ...entry,
          id: entry?.id ?? crypto.randomUUID?.() ?? `exp-${Math.random().toString(36).slice(2, 10)}`,
          role: String(entry?.role ?? entry?.title ?? '').trim(),
          company: String(entry?.company ?? entry?.organization ?? '').trim(),
          period: String(entry?.period ?? '').trim(),
          bullets,
        };
      })
    : [];

  const normalizedProjects = Array.isArray(base.projects)
    ? base.projects.map((project) => {
        const bulletSources = [project?.bullets, project?.highlights, project?.achievements, project?.details];
        const explicitBullets = bulletSources.flatMap((source) => {
          if (Array.isArray(source)) {
            return expandLines(source);
          }
          if (typeof source === 'string') {
            return splitIntoLines(source);
          }
          return [];
        });
        const descriptionCandidates = [project?.description, project?.summary];

        let bullets = explicitBullets;
        if (!bullets.length) {
          for (const candidate of descriptionCandidates) {
            if (typeof candidate === 'string') {
              const lines = splitIntoLines(candidate);
              if (lines.length) {
                bullets = lines;
                break;
              }
            }
          }
        }

        const description = bullets.length ? bullets.join('\n') : '';

        return {
          ...project,
          id: project?.id ?? crypto.randomUUID?.() ?? `proj-${Math.random().toString(36).slice(2, 10)}`,
          name: String(project?.name ?? project?.title ?? '').trim(),
          role: String(project?.role ?? '').trim(),
          description,
          link: String(project?.link ?? project?.url ?? '').trim(),
          bullets,
        };
      })
    : [];

  const normalizedEducation = Array.isArray(base.education)
    ? base.education.map((entry) => ({
        ...entry,
        id: entry?.id ?? crypto.randomUUID?.() ?? `edu-${Math.random().toString(36).slice(2, 10)}`,
        school: String(entry?.school ?? entry?.institution ?? '').trim(),
        degree: String(entry?.degree ?? entry?.program ?? '').trim(),
        period: String(entry?.period ?? '').trim(),
      }))
    : [];

  return {
    ...initialData,
    ...base,
    summary,
    experience: normalizedExperience,
    projects: normalizedProjects,
    education: normalizedEducation,
    contact: {
      emails: Array.isArray(contact.emails) ? contact.emails : [],
      phones: Array.isArray(contact.phones) ? contact.phones : [],
      urls: Array.isArray(contact.urls) ? contact.urls : [],
    },
    themes: {
      options: themeOptions,
      selected: selectedTheme,
    },
    meta: base.meta && typeof base.meta === 'object' ? base.meta : { ...initialData.meta },
  };
};

const extractMeta = (metaPayload, previousMeta = initialMeta) => {
  const source = metaPayload && typeof metaPayload === 'object' ? metaPayload : {};
  return {
    ...initialMeta,
    ...previousMeta,
    resumeId: source.resume_id || source.resumeId || previousMeta.resumeId || null,
    portfolioId: source.portfolio_id || source.portfolioId || previousMeta.portfolioId || null,
    status: source.status || previousMeta.status || initialMeta.status,
    visibility: source.visibility || previousMeta.visibility || initialMeta.visibility,
    slug: source.slug ?? previousMeta.slug ?? initialMeta.slug,
    publishedAt: source.published_at || source.publishedAt || previousMeta.publishedAt || null,
  };
};

const applyMetaToData = (data, meta) => {
  const nextData = deepClone(data);
  const nextMeta = {
    ...(nextData.meta && typeof nextData.meta === 'object' ? nextData.meta : {}),
    resume_id: meta.resumeId,
    portfolio_id: meta.portfolioId,
    status: meta.status,
    visibility: meta.visibility,
  };

  if (meta.slug) {
    nextMeta.slug = meta.slug;
  } else if ('slug' in nextMeta) {
    delete nextMeta.slug;
  }

  if (meta.publishedAt) {
    nextMeta.published_at = meta.publishedAt;
  } else if ('published_at' in nextMeta) {
    delete nextMeta.published_at;
  }

  nextData.meta = nextMeta;
  return nextData;
};

const buildPutBody = (data, meta) => {
  const payload = applyMetaToData(data, meta);
  const body = {
    data: payload,
    status: meta.status,
    visibility: meta.visibility,
  };

  if (meta.slug) {
    body.slug = meta.slug;
  }

  return body;
};

export const usePortfolioStore = create((set, get) => ({
  step: 0,
  data: initialData,
  meta: initialMeta,
  reviewOrder: REVIEW_SECTION_KEYS.slice(),
  uploadStatus: 'idle',
  saveState: 'idle',
  loadState: 'idle',
  lastSavedAt: null,
  lastError: '',
  rawFile: null,
  dirty: false,
  setStep: (step) => set({ step }),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 2) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 0) })),
  setRawFile: (file) => set({ rawFile: file }),
  setUploadStatus: (status) => set({ uploadStatus: status }),
  setParsedData: (payload) => {
    const sanitized = sanitizeData(payload);
    const nextMeta = extractMeta(sanitized.meta, get().meta);
    const dataWithMeta = applyMetaToData(sanitized, nextMeta);
    writeSession(nextMeta);
    set({
      data: dataWithMeta,
      meta: nextMeta,
      uploadStatus: 'parsed',
      dirty: false,
      saveState: 'idle',
      lastError: '',
    });
  },
  updateData: (updater) => {
    const previous = get().data;
    const candidate = typeof updater === 'function' ? updater(previous) : updater;
    const sanitized = sanitizeData(candidate);
    const nextMeta = extractMeta(sanitized.meta, get().meta);
    const dataWithMeta = applyMetaToData(sanitized, nextMeta);
    set({ data: dataWithMeta, meta: nextMeta, dirty: true });
  },
  updateTheme: (themeId) => {
    const { data } = get();
    const nextThemes = {
      ...data.themes,
      selected: themeId,
    };
    const sanitized = sanitizeData({ ...data, themes: nextThemes });
    const nextMeta = extractMeta(sanitized.meta, get().meta);
    const dataWithMeta = applyMetaToData(sanitized, nextMeta);
    set({ data: dataWithMeta, meta: nextMeta, dirty: true });
  },
  setReviewOrder: (updater) => {
    set((state) => {
      const current = normalizeReviewOrder(state.reviewOrder);
      const candidate = typeof updater === 'function' ? updater(current) : updater;
      return {
        reviewOrder: normalizeReviewOrder(candidate),
      };
    });
  },
  setMeta: (updater) => {
    const previous = get().meta;
    const nextMeta = typeof updater === 'function' ? updater(previous) : { ...previous, ...updater };
    const dataWithMeta = applyMetaToData(get().data, nextMeta);
    set({ meta: nextMeta, data: dataWithMeta, dirty: true });
  },
  saveDraft: async () => {
    const { meta, data } = get();
    if (!meta.portfolioId) {
      return false;
    }

    set({ saveState: 'saving', lastError: '' });

    try {
      const response = await fetch(withBaseUrl(`/api/portfolios/${meta.portfolioId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPutBody(data, meta)),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to save draft.');
      }

      const result = await response.json();
      const sanitized = sanitizeData(result?.data);
      const nextMeta = extractMeta(sanitized.meta, meta);
      const dataWithMeta = applyMetaToData(sanitized, nextMeta);

      writeSession(nextMeta);
      set({
        data: dataWithMeta,
        meta: nextMeta,
        saveState: 'saved',
        dirty: false,
        lastSavedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error(error);
      set({ saveState: 'error', lastError: error?.message || 'Failed to save draft.' });
      return false;
    }
  },
  loadDraft: async (portfolioId) => {
    if (!portfolioId) {
      return false;
    }

    set({ loadState: 'loading', lastError: '' });

    try {
      const response = await fetch(withBaseUrl(`/api/portfolios/${portfolioId}`));
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to load saved draft.');
      }

      const result = await response.json();
      const sanitized = sanitizeData(result?.data);
      const nextMeta = extractMeta(sanitized.meta, get().meta);
      const dataWithMeta = applyMetaToData(sanitized, nextMeta);

      writeSession(nextMeta);
      set({
        data: dataWithMeta,
        meta: nextMeta,
        loadState: 'loaded',
        uploadStatus: 'parsed',
        dirty: false,
        step: Math.max(get().step, 1),
      });

      return true;
    } catch (error) {
      console.error(error);
      set({ loadState: 'error', lastError: error?.message || 'Unable to load saved draft.' });
      clearSessionStorage();
      return false;
    }
  },
  restoreSession: async () => {
    const session = readSession();
    if (!session?.portfolioId) {
      return false;
    }
    return get().loadDraft(session.portfolioId);
  },
  clearSession: () => {
    clearSessionStorage();
    set({ meta: initialMeta, data: sanitizeData(initialData), dirty: false, lastSavedAt: null });
  },
}));

export const resolveApiUrl = withBaseUrl;
