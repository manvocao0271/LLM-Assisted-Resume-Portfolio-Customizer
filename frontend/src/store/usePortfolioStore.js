import { create } from 'zustand';

// Core section keys that are always available
export const CORE_SECTION_KEYS = ['name', 'summary', 'contact'];
// Common section keys (may or may not be present)
export const COMMON_SECTION_KEYS = ['experience', 'projects', 'education', 'skills'];
// Combined for backwards compatibility
export const REVIEW_SECTION_KEYS = [...CORE_SECTION_KEYS, ...COMMON_SECTION_KEYS];

export const THEME_OPTIONS = [
  { id: 'aurora', name: 'Aurora Pulse', primary: '#9333ea', accent: '#ec4899' },
  { id: 'midnight', name: 'Neon Night', primary: '#7c3aed', accent: '#22d3ee' },
  { id: 'dawn', name: 'Electric Dawn', primary: '#10b981', accent: '#f472b6' },
  { id: 'sunset', name: 'Sunset Glow', primary: '#f97316', accent: '#fbbf24' },
  { id: 'ocean', name: 'Ocean Breeze', primary: '#0ea5e9', accent: '#06b6d4' },
  { id: 'forest', name: 'Forest Mist', primary: '#059669', accent: '#84cc16' },
];

const initialData = {
  name: '',
  summary: '',
  job_description: '',
  job_type: {
    category: 'General',
    category_id: 'general',
    confidence: 0,
    matches: [],
  },
  resume_job_type: {
    category: 'General',
    category_id: 'general',
    confidence: 0,
    matches: [],
  },
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
  layout: {
    sectionOrder: [],
  },
  sectionVisibility: {
    summary: true,
    experience: true,
    projects: true,
    education: true,
    skills: true,
  },
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

const normalizeReviewOrder = (order, availableKeys = REVIEW_SECTION_KEYS) => {
  const nextOrder = Array.isArray(order) ? order.filter((key) => typeof key === 'string') : [];
  const unique = [];

  // First, preserve existing order from the parameter
  for (const key of nextOrder) {
    if (availableKeys.includes(key) && !unique.includes(key)) {
      unique.push(key);
    }
  }

  // Then add any missing keys from availableKeys
  for (const key of availableKeys) {
    if (!unique.includes(key)) {
      unique.push(key);
    }
  }

  return unique;
};

// Try to derive a sensible section key order from a rendered UI spec (generatedSpec)
const deriveOrderFromSpec = (spec, availableKeys = REVIEW_SECTION_KEYS) => {
  if (!spec || !Array.isArray(spec.sections)) return [];
  const matched = [];

  const normalize = (s) => (s ? String(s).toLowerCase().replace(/[^a-z0-9 _]/g, '').trim() : '');

  const findMatch = (candidate) => {
    if (!candidate) return null;
    const c = normalize(candidate);
    if (!c) return null;
    // Direct match against available keys
    for (const key of availableKeys) {
      if (c === key) return key;
    }
    // Partial includes (title -> key) heuristic
    for (const key of availableKeys) {
      if (c.includes(key) || key.includes(c)) return key;
    }
    // Token overlap
    const tokens = c.split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      for (const key of availableKeys) {
        if (key.includes(t) || t.includes(key)) return key;
      }
    }
    return null;
  };

  for (const section of spec.sections) {
    const candidates = [];
    if (section.key) candidates.push(section.key);
    if (section.id) candidates.push(section.id);
    if (section.title) candidates.push(section.title);
    if (section.name) candidates.push(section.name);
    if (section.props && typeof section.props === 'object') {
      if (section.props.key) candidates.push(section.props.key);
      if (section.props.id) candidates.push(section.props.id);
      if (section.props.title) candidates.push(section.props.title);
      if (section.props.name) candidates.push(section.props.name);
    }

    let found = null;
    for (const c of candidates) {
      found = findMatch(c);
      if (found) break;
    }
    if (found && !matched.includes(found)) matched.push(found);
  }

  return matched;
};

const generateSummary = (payload) => {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const experience = Array.isArray(payload.experience) ? payload.experience : [];
  const skills = Array.isArray(payload.skills) ? payload.skills : [];
  const jobDescription = typeof payload.job_description === 'string' ? payload.job_description.trim() : '';
  const jobDescriptionPreview = jobDescription
    ? `${jobDescription.slice(0, 157)}${jobDescription.length > 160 ? '…' : ''}`
    : '';
  const appendJobHint = (text) =>
    jobDescriptionPreview
      ? `${text} Tailored to the job description: ${jobDescriptionPreview}.`
      : text;

  const leadExperience = experience.find((entry) => entry && (entry.role || entry.company || entry.period));

  const skillHighlights = skills.filter(Boolean).slice(0, 3);

  if (leadExperience) {
    const role = leadExperience.role || leadExperience.title || 'experienced professional';
    const company = leadExperience.company || leadExperience.organization || '';
    const period = leadExperience.period || '';

    const segments = [
      'Experienced',
      `${role}${company ? ` at ${company}` : ''}`,
      period ? `with a track record spanning ${period}.` : 'with a track record of delivering impact.',
    ];

    if (skillHighlights.length) {
      segments.push(`Skilled in ${skillHighlights.join(', ')} and eager to showcase work through a polished portfolio.`);
    } else {
      segments.push('Eager to translate recent achievements into a standout portfolio presentation.');
    }

    return appendJobHint(segments.join(' ').replace(/\s+/g, ' ').trim());
  }

  if (skillHighlights.length) {
    return appendJobHint(
      `Skilled in ${skillHighlights.join(', ')}, ready to highlight accomplishments in a tailored portfolio.`,
    );
  }

  return appendJobHint('Preparing a portfolio to spotlight key achievements, strengths, and career story.');
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
  const layout = base.layout && typeof base.layout === 'object' ? base.layout : {};

  const themeOptions = Array.isArray(themes.options) && themes.options.length > 0 ? themes.options : THEME_OPTIONS;
  const selectedTheme = themes.selected || themeOptions[0]?.id || THEME_OPTIONS[0].id;
  const normalizedSummary = Array.isArray(base.summary)
    ? base.summary.map((line) => String(line).trim()).filter(Boolean).join(' ')
    : typeof base.summary === 'string'
      ? base.summary.trim()
      : '';
  const stripNameFromSummary = (text, fullName) => {
    if (!text) return '';
    if (!fullName) return text;
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Remove leading occurrences like "John Doe —", "John Doe:", or "John Doe is a/an ..."
    const nameRe = new RegExp(`^\\s*${escapeRegExp(fullName)}\\s*(?:[–—-]|:)?\\s*`, 'i');
    const isARe = new RegExp(`^\\s*${escapeRegExp(fullName)}\\s+is\\s+an?\\b\\s*`, 'i');
    let result = text.replace(nameRe, '').replace(isARe, '');
    return result.trim();
  };
  const summary = stripNameFromSummary(normalizedSummary, String(base.name || '').trim()) || generateSummary(base);

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

  const normalizeJobTypeValue = (value) => {
    const source = value && typeof value === 'object' ? value : {};
    const normalizedMatches = Array.isArray(source.matches)
      ? source.matches
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      : [];
    const confidence =
      typeof source.confidence === 'number' && Number.isFinite(source.confidence)
        ? Math.min(1, Math.max(0, source.confidence))
        : 0;
    return {
      category: typeof source.category === 'string' ? source.category : '',
      category_id: typeof source.category_id === 'string' ? source.category_id : '',
      confidence,
      matches: normalizedMatches,
    };
  };

  const rawJobDescription = extractText(base.job_description);
  const jobDescription = rawJobDescription.length > 4096 ? `${rawJobDescription.slice(0, 4093)}…` : rawJobDescription;
  const normalizedJobType = normalizeJobTypeValue(base.job_type);
  const normalizedResumeJobType = normalizeJobTypeValue(base.resume_job_type);

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
    job_description: jobDescription,
    job_type: normalizedJobType,
    resume_job_type: normalizedResumeJobType,
    experience: normalizedExperience,
    projects: normalizedProjects,
    education: normalizedEducation,
    contact: {
      emails: Array.isArray(contact.emails) ? contact.emails : [],
      phones: Array.isArray(contact.phones) ? contact.phones : [],
      urls: Array.isArray(contact.urls) ? contact.urls : [],
    },
    layout: {
      sectionOrder: normalizeReviewOrder(layout.sectionOrder),
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
    // ALWAYS use IDs from API response if present, don't fall back to previous values
    resumeId: source.resume_id || source.resumeId || null,
    portfolioId: source.portfolio_id || source.portfolioId || null,
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

const buildPutBody = (data, meta, generatedSpec) => {
  const payload = applyMetaToData(data, meta);
  if (generatedSpec && typeof generatedSpec === 'object') {
    payload.generatedSpec = generatedSpec;
  } else if ('generatedSpec' in payload && !payload.generatedSpec) {
    delete payload.generatedSpec;
  }
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
  generatedSpec: null,
  genState: 'idle', // idle | generating | ready | error
  genError: '',
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
    console.log('[setParsedData] Received payload:', JSON.stringify(payload).slice(0, 500));
    const sanitized = sanitizeData(payload);
    console.log('[setParsedData] Sanitized meta:', sanitized.meta);
    const nextMeta = extractMeta(sanitized.meta, get().meta);
    console.log('[setParsedData] Extracted meta:', nextMeta);
    
    // Dynamically detect available section keys from the payload
    const detectedKeys = Object.keys(sanitized).filter(key => {
      const value = sanitized[key];
      const isExcluded = ['job_description', 'job_type', 'resume_job_type', 'embedded_links', 
                          'themes', 'raw', 'meta', 'raw_resume_text', 'layout', 'urls', 'url', 
                          'links', 'websites', 'profiles', 'emails', 'email', 'phones', 'phone', 
                          'phone_number'].includes(key);
      if (isExcluded) return false;
      
      // Include if it's an array (even empty for core sections) or truthy value
      return Array.isArray(value) || (value && typeof value === 'object');
    });
    
    // Combine core keys with detected keys
    const allAvailableKeys = [...new Set([...CORE_SECTION_KEYS, ...detectedKeys])];
    
    // derive review order from payload layout if present, using detected keys
    let nextOrder = normalizeReviewOrder(sanitized.layout?.sectionOrder, allAvailableKeys);
    // If no explicit layout.order provided, try to derive order from a generatedSpec (preview)
    if ((!(Array.isArray(sanitized.layout?.sectionOrder) && sanitized.layout.sectionOrder.length > 0)) && sanitized.generatedSpec) {
      const derived = deriveOrderFromSpec(sanitized.generatedSpec, allAvailableKeys);
      if (Array.isArray(derived) && derived.length > 0) {
        nextOrder = normalizeReviewOrder(derived, allAvailableKeys);
      }
    }
    const withOrder = { ...sanitized, layout: { sectionOrder: nextOrder } };
    const dataWithMeta = applyMetaToData(withOrder, nextMeta);
    writeSession(nextMeta);
    set({
      data: dataWithMeta,
      meta: nextMeta,
      reviewOrder: nextOrder,
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
    
    // Dynamically detect available section keys
    const detectedKeys = Object.keys(sanitized).filter(key => {
      const value = sanitized[key];
      const isExcluded = ['job_description', 'job_type', 'resume_job_type', 'embedded_links', 
                          'themes', 'raw', 'meta', 'raw_resume_text', 'layout', 'urls', 'url', 
                          'links', 'websites', 'profiles', 'emails', 'email', 'phones', 'phone', 
                          'phone_number'].includes(key);
      if (isExcluded) return false;
      return Array.isArray(value) || (value && typeof value === 'object');
    });
    
    const allAvailableKeys = [...new Set([...CORE_SECTION_KEYS, ...detectedKeys])];
    
    // keep layout.sectionOrder in sync
    const nextOrder = normalizeReviewOrder(sanitized.layout?.sectionOrder, allAvailableKeys);
    sanitized.layout = { sectionOrder: nextOrder };
    const nextMeta = extractMeta(sanitized.meta, get().meta);
    const dataWithMeta = applyMetaToData(sanitized, nextMeta);
    set({ data: dataWithMeta, meta: nextMeta, reviewOrder: nextOrder, dirty: true });
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
      const next = normalizeReviewOrder(candidate);
      const nextData = { ...state.data, layout: { sectionOrder: next } };
      return { reviewOrder: next, data: nextData, dirty: true };
    });
  },
  toggleSectionVisibility: (sectionKey) => {
    set((state) => {
      const currentVisibility = state.data.sectionVisibility || {};
      const nextVisibility = {
        ...currentVisibility,
        [sectionKey]: !currentVisibility[sectionKey],
      };
      const nextData = { ...state.data, sectionVisibility: nextVisibility };
      return { data: nextData, dirty: true };
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
    console.log('[saveDraft] Attempting to save with meta:', meta);
    if (!meta.portfolioId) {
      console.error('[saveDraft] No portfolio ID found!');
      return false;
    }

    set({ saveState: 'saving', lastError: '' });

    try {
      const response = await fetch(withBaseUrl(`/api/portfolios/${meta.portfolioId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPutBody(data, meta, get().generatedSpec)),
      });

      if (!response.ok) {
        const message = await response.text();
        console.error('Save failed:', response.status, message);
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
  generateDesign: async (prompt) => {
    set({ genState: 'generating', genError: '' });
    try {
      const body = { prompt: String(prompt || '').slice(0, 2000), data: get().data };
      const response = await fetch(withBaseUrl('/api/generative/preview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Generation failed');
      }
      const result = await response.json();
      const spec = result?.uiSpec || result?.data?.uiSpec || null;
      set({ generatedSpec: spec, genState: 'ready' });
      return true;
    } catch (err) {
      console.error(err);
      set({ genState: 'error', genError: err?.message || 'Generation failed' });
      return false;
    }
  },
  openPreviewDraft: async () => {
    const { meta, data } = get();
    console.log('[openPreviewDraft] Current meta:', meta);
    
    // Auto-generate slug from name if missing
    if (!meta.slug) {
      const name = data?.name || 'portfolio';
      const timestamp = Date.now().toString(36).slice(-4);
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 45) || 'my-portfolio';
      
      // Add timestamp to make it unique
      const uniqueSlug = `${generatedSlug}-${timestamp}`;
      
      // Set the slug
      get().setMeta((previous) => ({ ...previous, slug: uniqueSlug }));
    }
    
    // Ensure we have a portfolioId
    if (!meta.portfolioId && !get().meta.portfolioId) {
      console.error('Cannot preview: no portfolio ID available');
      return false;
    }
    
    const saved = await get().saveDraft();
    if (!saved) {
      console.error('Failed to save draft before preview');
      return false;
    }
    
    const currentMeta = get().meta;
    const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
    const url = `${origin}/preview/${currentMeta.slug}?portfolio_id=${encodeURIComponent(currentMeta.portfolioId)}`;
    
    console.log('Opening preview:', url);
    
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return true;
  },
}));

export const resolveApiUrl = withBaseUrl;
