interface PineconeSetupCardProps {
  onSetup: () => void;
}

/**
 * Card shown when Pinecone is not configured in Tauri/desktop mode.
 * Prompts user to set up Pinecone API credentials.
 */
export function PineconeSetupCard({ onSetup }: PineconeSetupCardProps) {
  return (
    <div
      className="relative p-4 rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: 'linear-gradient(135deg, var(--text-primary) 0%, transparent 100%)',
        }}
      />

      <div className="relative flex flex-col items-center justify-center py-6 text-center">
        {/* Pinecone logo placeholder */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border mb-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
          }}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: 'var(--color-brand-600)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>

        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">
          Pinecone
        </h4>
        <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-[200px]">
          Connect to Pinecone for scalable cloud vector storage.
        </p>

        <button
          type="button"
          onClick={onSetup}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            borderColor: 'var(--btn-primary-border)',
            color: 'var(--btn-primary-text)',
          }}
        >
          Configure Pinecone
        </button>
      </div>
    </div>
  );
}
