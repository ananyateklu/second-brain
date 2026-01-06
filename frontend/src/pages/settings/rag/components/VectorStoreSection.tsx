import { Tooltip } from '../../../../components/ui/Tooltip';
import { toast } from '../../../../hooks/use-toast';
import type { BoundStore } from '../../../../store/types';
import { VECTOR_STORE_OPTIONS, type VectorProvider } from '../rag-settings.constants';

interface VectorStoreSectionProps {
  userId?: string;
  vectorStoreProvider: VectorProvider | null;
  setVectorStoreProvider: BoundStore['setVectorStoreProvider'];
  syncPreferencesToBackend: BoundStore['syncPreferencesToBackend'];
  isPineconeConfigured: boolean | null;
  isSavingVectorStore: boolean;
  setIsSavingVectorStore: (value: boolean) => void;
  isTauri: boolean;
  onOpenPineconeSetup: () => void;
}

export function VectorStoreSection({
  userId,
  vectorStoreProvider,
  setVectorStoreProvider,
  syncPreferencesToBackend,
  isPineconeConfigured,
  isSavingVectorStore,
  setIsSavingVectorStore,
  isTauri,
  onOpenPineconeSetup,
}: VectorStoreSectionProps) {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Vector Store
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Database for note embeddings
            </p>
          </div>
          {isSavingVectorStore && (
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
          {VECTOR_STORE_OPTIONS.map((option) => {
            const isActive = vectorStoreProvider === option.id;
            const needsSetup = option.id === 'Pinecone' && isTauri && !isPineconeConfigured;

            return (
              <Tooltip key={option.id} content={option.description} position="bottom" maxWidth={420} delay={300}>
                <button
                  type="button"
                  onClick={() => {
                    if (needsSetup) {
                      onOpenPineconeSetup();
                      return;
                    }
                    void (async () => {
                      if (!userId) return;
                      setIsSavingVectorStore(true);
                      try {
                        await setVectorStoreProvider(option.id, false);
                        await syncPreferencesToBackend(userId);
                      } catch (error) {
                        console.error('Failed to update vector store provider:', { error });
                        toast.error('Failed to save vector store preference', 'Please try again.');
                      } finally {
                        setIsSavingVectorStore(false);
                      }
                    })();
                  }}
                  disabled={isSavingVectorStore}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    color: isActive ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                  }}
                >
                  {option.id === 'PostgreSQL' ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                  <span>{option.label}</span>
                  {option.badge && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded-md" style={{
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                      color: isActive ? 'white' : 'var(--color-brand-600)',
                    }}>{option.badge}</span>
                  )}
                  {needsSetup && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded-md flex items-center gap-0.5" style={{
                      backgroundColor: 'color-mix(in srgb, #f59e0b 12%, transparent)',
                      color: '#f59e0b',
                    }}>
                      <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                      Setup
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </section>
  );
}
