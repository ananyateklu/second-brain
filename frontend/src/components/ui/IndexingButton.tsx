import { useState, useEffect, useRef } from 'react';
import { useStartIndexing, useIndexingStatus } from '../../features/rag/hooks/use-indexing';
import { toast } from '../../hooks/use-toast';

interface IndexingButtonProps {
  userId?: string;
  onComplete?: () => void;
}

export function IndexingButton({ userId = 'default-user', onComplete }: IndexingButtonProps) {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [vectorStore, setVectorStore] = useState<string>('PostgreSQL');
  const [embeddingProvider, setEmbeddingProvider] = useState<string>('OpenAI'); // Default
  const startIndexing = useStartIndexing();
  const { data: jobStatus } = useIndexingStatus(currentJobId, !!currentJobId);
  const toastShownRef = useRef<string | null>(null);

  const isIndexing = jobStatus?.status === 'processing' || jobStatus?.status === 'pending';
  const isCompleted = jobStatus?.status === 'completed';
  const isFailed = jobStatus?.status === 'failed';

  // Handle completion
  useEffect(() => {
    if (!isCompleted) {
      return;
    }
    if (onComplete) {
      onComplete();
    }
    // Reset job ID after a delay to allow toast to show
    const timer = setTimeout(() => { setCurrentJobId(null); }, 3000);
    return () => { clearTimeout(timer); };
  }, [isCompleted, onComplete]);

  // Handle status changes
  useEffect(() => {
    if (jobStatus && currentJobId) {
      const statusKey = `${currentJobId}_${jobStatus.status}`;

      // Only show toast if we haven't shown it for this job status yet
      if (toastShownRef.current !== statusKey) {
        if (isCompleted) {
          // Build a descriptive message based on what happened
          const parts: string[] = [];

          if (jobStatus.processedNotes > 0) {
            parts.push(`${jobStatus.processedNotes} indexed`);
          }
          if (jobStatus.deletedNotes > 0) {
            parts.push(`${jobStatus.deletedNotes} removed`);
          }
          if (jobStatus.skippedNotes > 0) {
            parts.push(`${jobStatus.skippedNotes} up to date`);
          }

          const message = parts.length > 0
            ? parts.join(', ')
            : 'All notes are already up to date';

          toast.success('Indexing Complete', message);
          toastShownRef.current = statusKey;
        } else if (isFailed) {
          toast.error(
            'Indexing Failed',
            jobStatus.errors[0] || 'An error occurred during indexing'
          );
          toastShownRef.current = statusKey;
          // Use setTimeout to defer state update and avoid synchronous setState in effect
          setTimeout(() => { setCurrentJobId(null); }, 0);
        }
      }
    }
  }, [jobStatus, isCompleted, isFailed, currentJobId]);

  const handleStartIndexing = async () => {
    try {
      // Reset toast tracker for new job
      toastShownRef.current = null;

      const job = await startIndexing.mutateAsync({
        userId,
        embeddingProvider: embeddingProvider as import('../../types/rag').EmbeddingProvider, // Pass selected embedding provider
        vectorStoreProvider: vectorStore as import('../../types/rag').VectorStoreProvider
      });
      setCurrentJobId(job.id);
      toast.info(
        'Indexing Started',
        `Indexing notes into ${vectorStore} using ${embeddingProvider}...`
      );
    } catch (error) {
      toast.error(
        'Error',
        error instanceof Error ? error.message : 'Failed to start indexing'
      );
    }
  };

  return (
    <div className="space-y-4">
      {!isIndexing && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex-1 min-w-[200px]">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1.5 block"
                style={{ color: 'var(--text-secondary)' }}
              >
                Vector Store
              </label>
              <div className="flex flex-wrap gap-2">
                {['PostgreSQL', 'Pinecone', 'Both'].map((store) => {
                  const isActive = vectorStore === store;
                  return (
                    <button
                      type="button"
                      key={store}
                      onClick={() => { setVectorStore(store); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)] hover:-translate-y-0.5 hover:shadow-md"
                      style={{
                        backgroundColor: isActive ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
                        borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                        color: isActive ? 'var(--color-brand-50)' : 'var(--text-primary)',
                        boxShadow: isActive
                          ? '0 10px 22px color-mix(in srgb, var(--color-brand-900) 30%, transparent)'
                          : '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)',
                        transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 12%, var(--surface-elevated))';
                          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 60%, var(--border))';
                          e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 18%, transparent)';
                          e.currentTarget.style.transform = 'translateY(-0.5px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.boxShadow = '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {store}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1.5 block"
                style={{ color: 'var(--text-secondary)' }}
              >
                Embedding Model
              </label>
              <div className="flex flex-wrap gap-2">
                {['OpenAI', 'Pinecone', 'Gemini', 'Ollama'].map((provider) => {
                  const isActive = embeddingProvider === provider;
                  return (
                    <button
                      type="button"
                      key={provider}
                      onClick={() => { setEmbeddingProvider(provider); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)] hover:-translate-y-0.5 hover:shadow-md"
                      style={{
                        backgroundColor: isActive ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
                        borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                        color: isActive ? 'var(--color-brand-50)' : 'var(--text-primary)',
                        boxShadow: isActive
                          ? '0 10px 22px color-mix(in srgb, var(--color-brand-900) 30%, transparent)'
                          : '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)',
                        transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 12%, var(--surface-elevated))';
                          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 60%, var(--border))';
                          e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 18%, transparent)';
                          e.currentTarget.style.transform = 'translateY(-0.5px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.boxShadow = '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {provider}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => { void handleStartIndexing(); }}
        disabled={isIndexing || startIndexing.isPending}
        className="w-full px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          backgroundColor: isIndexing || startIndexing.isPending ? 'var(--border)' : 'var(--btn-primary-bg)',
          color: isIndexing || startIndexing.isPending ? 'var(--text-secondary)' : 'var(--btn-primary-text)',
          border: '1px solid',
          borderColor: isIndexing || startIndexing.isPending ? 'var(--border)' : 'var(--btn-primary-border)',
        }}
      >
        {isIndexing ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Indexing...
          </>
        ) : (
          `Start Indexing`
        )}
      </button>

      {jobStatus && isIndexing && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
            {jobStatus.totalNotes === 0 ? (
              <span>Checking for changes...</span>
            ) : (
              <>
                <span>Indexing: {jobStatus.processedNotes} / {jobStatus.totalNotes} notes</span>
                <span>{jobStatus.progressPercentage}%</span>
              </>
            )}
          </div>
          {jobStatus.totalNotes > 0 && (
            <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${jobStatus.progressPercentage}%`,
                  backgroundColor: 'var(--color-brand-600)',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
