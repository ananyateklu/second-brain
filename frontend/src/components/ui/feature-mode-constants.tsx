/**
 * Pre-defined color schemes for different features
 */
export const featureColors = {
  rag: {
    bg: 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)',
    text: 'var(--color-accent-blue-text)',
    border: 'var(--color-accent-blue-border)',
    dot: 'var(--color-accent-blue-dot)',
  },
  agent: {
    bg: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
    text: 'var(--color-brand-400)',
    border: 'var(--color-brand-500)',
    dot: 'var(--color-brand-400)',
  },
  image: {
    bg: 'color-mix(in srgb, var(--color-accent-purple) 15%, transparent)',
    text: 'var(--color-accent-purple-text)',
    border: 'var(--color-accent-purple-border)',
    dot: 'var(--color-accent-purple-dot)',
  },
};

/**
 * Icon components for each feature
 */
export const FeatureIcons = {
  RAG: () => (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  Agent: () => (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  Image: () => (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
};
