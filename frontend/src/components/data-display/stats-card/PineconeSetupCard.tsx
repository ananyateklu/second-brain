/**
 * Card displayed when Pinecone is not configured in Tauri mode.
 * Uses CSS variables instead of hard-coded colors.
 */
export function PineconeSetupCard({ onSetup }: { onSetup: () => void }) {
  return (
    <div
      className="relative p-3 rounded-2xl border overflow-hidden group transition-all duration-300"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-500) 0%, transparent 100%)',
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-[var(--text-primary)]">Pinecone</h4>
            <span
              className="w-1.5 h-1.5 rounded-full opacity-80"
              style={{ backgroundColor: 'var(--color-warning)' }}
              title="Not configured"
            />
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-xl font-medium border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
              color: 'var(--color-warning)',
            }}
          >
            Not Configured
          </span>
        </div>

        <div className="text-center py-4">
          <div
            className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl border mb-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
            }}
          >
            <svg
              className="h-6 w-6 text-[var(--color-brand-600)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1 text-[var(--text-primary)]">
            Pinecone Not Setup
          </p>
          <p className="text-xs mb-4 text-[var(--text-secondary)]">
            Configure Pinecone for scalable vector storage
          </p>
          <button
            type="button"
            onClick={onSetup}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--color-brand-600)',
              color: 'white',
            }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
            Setup Pinecone
          </button>
        </div>
      </div>
    </div>
  );
}
