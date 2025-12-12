interface RagSettingsPopoverProps {
  /** Whether RAG is enabled */
  ragEnabled: boolean;
  /** Called when RAG is toggled */
  onRagToggle: (enabled: boolean) => void;
  /** Selected vector store provider */
  selectedVectorStore: 'PostgreSQL' | 'Pinecone';
  /** Called when vector store is changed */
  onVectorStoreChange: (provider: 'PostgreSQL' | 'Pinecone') => void;
  /** Whether the controls are disabled */
  disabled?: boolean;
}

export function RagSettingsPopover({
  ragEnabled,
  onRagToggle,
  selectedVectorStore,
  onVectorStoreChange,
  disabled = false,
}: RagSettingsPopoverProps) {
  return (
    <div className="space-y-3">
      {/* RAG Enable Toggle */}
      <div
        className="flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all duration-200"
        style={{
          backgroundColor: ragEnabled
            ? 'color-mix(in srgb, var(--color-accent-blue) 10%, var(--surface))'
            : 'var(--surface)',
          borderColor: ragEnabled ? 'var(--color-accent-blue-border)' : 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2.5 flex-1">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: ragEnabled
                ? 'color-mix(in srgb, var(--color-accent-blue) 20%, transparent)'
                : 'var(--surface-elevated)',
              color: ragEnabled ? 'var(--color-accent-blue-text)' : 'var(--text-tertiary)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Enable RAG
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Search notes for context
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={ragEnabled}
          disabled={disabled}
          onClick={() => { onRagToggle(!ragEnabled); }}
          className={`
            relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 flex-shrink-0
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
          `}
          style={{
            backgroundColor: ragEnabled ? 'var(--color-accent-blue)' : 'var(--border)',
            boxShadow: ragEnabled ? '0 0 12px -2px var(--color-accent-blue)' : 'none',
          }}
        >
          <span
            className={`
              inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow-sm
              ${ragEnabled ? 'translate-x-[18px]' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Vector Store Selection - Only show when RAG is enabled */}
      {ragEnabled && (
        <div className="space-y-1.5">
          <div
            className="text-[10px] font-semibold uppercase tracking-wider px-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Vector Store
          </div>

          <div
            className="flex gap-1.5"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => { onVectorStoreChange('PostgreSQL'); }}
              className={`
                flex-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 border
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}
              `}
              style={{
                backgroundColor: selectedVectorStore === 'PostgreSQL'
                  ? 'color-mix(in srgb, var(--color-accent-blue) 15%, var(--surface))'
                  : 'var(--surface)',
                borderColor: selectedVectorStore === 'PostgreSQL'
                  ? 'var(--color-accent-blue-border)'
                  : 'var(--border)',
                color: selectedVectorStore === 'PostgreSQL'
                  ? 'var(--color-accent-blue-text)'
                  : 'var(--text-secondary)',
                boxShadow: selectedVectorStore === 'PostgreSQL'
                  ? '0 0 8px -2px var(--color-accent-blue)'
                  : 'none',
              }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
                PostgreSQL
              </div>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => { onVectorStoreChange('Pinecone'); }}
              className={`
                flex-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 border
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}
              `}
              style={{
                backgroundColor: selectedVectorStore === 'Pinecone'
                  ? 'color-mix(in srgb, var(--color-accent-blue) 15%, var(--surface))'
                  : 'var(--surface)',
                borderColor: selectedVectorStore === 'Pinecone'
                  ? 'var(--color-accent-blue-border)'
                  : 'var(--border)',
                color: selectedVectorStore === 'Pinecone'
                  ? 'var(--color-accent-blue-text)'
                  : 'var(--text-secondary)',
                boxShadow: selectedVectorStore === 'Pinecone'
                  ? '0 0 8px -2px var(--color-accent-blue)'
                  : 'none',
              }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                  />
                </svg>
                Pinecone
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

