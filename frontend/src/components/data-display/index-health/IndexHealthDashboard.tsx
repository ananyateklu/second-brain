import { useState, useEffect, useRef, startTransition, useCallback } from 'react';
import {
  useIndexStats,
  useActiveIndexingVectorStores,
  useIndexingStream,
} from '@/features/rag/hooks/use-indexing';
import { useBoundStore } from '@/store/bound-store';
import { isTauri } from '@/lib/native-notifications';
import { TauriPineconeSetupModal } from '@/components/ui/TauriPineconeSetupModal';
import { usePineconeConfigured } from '@/components/ui/use-pinecone-configured';
import { IndexHealthCard } from './IndexHealthCard';
import { PineconeSetupCard } from './PineconeSetupCard';
import { IndexHealthCardSkeleton } from './IndexHealthCardSkeleton';
import type { VectorStoreProvider } from '@/types/rag';

interface IndexHealthDashboardProps {
  userId?: string;
}

/**
 * Dashboard displaying index health for PostgreSQL and Pinecone vector stores.
 * Shows side-by-side cards with ring progress, metrics, storage, and activity.
 */
export function IndexHealthDashboard({ userId = 'default-user' }: IndexHealthDashboardProps) {
  const activeVectorStores = useActiveIndexingVectorStores();

  // Get embedding preferences from store
  const {
    ragEmbeddingProvider,
    ragEmbeddingModel,
    ragEmbeddingDimensions,
  } = useBoundStore();

  // SSE streaming hook for real-time progress (persists across navigation)
  const {
    isStreaming,
    startIndexing: startStreamingIndexing,
    cancelIndexing,
    isStreamingVectorStore,
    getProgressForVectorStore,
    getStatsForVectorStore,
  } = useIndexingStream();

  // Track stopping state per vector store
  const [stoppingPostgres, setStoppingPostgres] = useState(false);
  const [stoppingPinecone, setStoppingPinecone] = useState(false);

  // Per-vector-store streaming state
  const isPostgresStreaming = isStreamingVectorStore('PostgreSQL');
  const isPineconeStreaming = isStreamingVectorStore('Pinecone');
  const postgresProgress = getProgressForVectorStore('PostgreSQL');
  const postgresStats = getStatsForVectorStore('PostgreSQL');
  const pineconeProgress = getProgressForVectorStore('Pinecone');
  const pineconeStats = getStatsForVectorStore('Pinecone');

  // Track which stores were being indexed when the job completed
  const wasPostgresIndexingRef = useRef(false);
  const wasPineconeIndexingRef = useRef(false);
  const [finalizingPostgres, setFinalizingPostgres] = useState(false);
  const [finalizingPinecone, setFinalizingPinecone] = useState(false);

  // NEVER poll during SSE streaming - SSE provides real-time updates
  // Only poll when finalizing (after stream ends, before stats refresh)
  const shouldPollStats = !isStreaming && (finalizingPostgres || finalizingPinecone);
  const { data: stats, isLoading, refetch } = useIndexStats(userId, shouldPollStats);

  // Start indexing handler for a specific vector store
  const handleStartIndexing = useCallback((vectorStoreProvider: VectorStoreProvider) => {
    const embeddingProvider = ragEmbeddingProvider || 'OpenAI';
    const embeddingModel = ragEmbeddingModel || 'text-embedding-3-small';
    const dimensions = ragEmbeddingDimensions ?? undefined;

    void startStreamingIndexing({
      vectorStoreProvider,
      embeddingProvider,
      embeddingModel,
      dimensions,
    });
  }, [ragEmbeddingProvider, ragEmbeddingModel, ragEmbeddingDimensions, startStreamingIndexing]);

  // Stop indexing handler for a specific vector store
  const handleStopIndexing = useCallback(async (vectorStoreProvider: VectorStoreProvider) => {
    const setStopping = vectorStoreProvider === 'PostgreSQL' ? setStoppingPostgres : setStoppingPinecone;
    setStopping(true);
    try {
      await cancelIndexing(vectorStoreProvider);
    } finally {
      setStopping(false);
    }
  }, [cancelIndexing]);

  useEffect(() => {
    const isPostgresActive = activeVectorStores.has('PostgreSQL') || isPostgresStreaming;
    const isPineconeActive = activeVectorStores.has('Pinecone') || isPineconeStreaming;

    // Check if PostgreSQL just finished
    if (wasPostgresIndexingRef.current && !isPostgresActive) {
      startTransition(() => setFinalizingPostgres(true));
      void refetch().finally(() => {
        startTransition(() => setFinalizingPostgres(false));
      });
    }

    // Check if Pinecone just finished
    if (wasPineconeIndexingRef.current && !isPineconeActive) {
      startTransition(() => setFinalizingPinecone(true));
      void refetch().finally(() => {
        startTransition(() => setFinalizingPinecone(false));
      });
    }

    // Update refs
    wasPostgresIndexingRef.current = isPostgresActive;
    wasPineconeIndexingRef.current = isPineconeActive;
  }, [activeVectorStores, isPostgresStreaming, isPineconeStreaming, refetch]);

  const { isConfigured: isPineconeConfigured, refetch: refetchPineconeConfig } =
    usePineconeConfigured();
  const [showPineconeSetup, setShowPineconeSetup] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IndexHealthCardSkeleton />
        <IndexHealthCardSkeleton />
      </div>
    );
  }

  if (!stats) {
    return <EmptyDashboard />;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IndexHealthCard
          title="PostgreSQL"
          stats={stats.postgreSQL}
          userId={userId}
          vectorStoreProvider="PostgreSQL"
          isIndexing={activeVectorStores.has('PostgreSQL') || isPostgresStreaming || finalizingPostgres}
          onStartIndexing={() => handleStartIndexing('PostgreSQL')}
          onStopIndexing={() => void handleStopIndexing('PostgreSQL')}
          isStartingIndexing={isPostgresStreaming && !postgresProgress}
          isStoppingIndexing={stoppingPostgres}
          streamingProgress={postgresProgress}
          streamingStats={postgresStats}
        />

        {/* Pinecone Card - Show setup button if not configured in Tauri mode */}
        {isTauri() && !isPineconeConfigured ? (
          <PineconeSetupCard onSetup={() => setShowPineconeSetup(true)} />
        ) : (
          <IndexHealthCard
            title="Pinecone"
            stats={stats.pinecone}
            userId={userId}
            vectorStoreProvider="Pinecone"
            isIndexing={activeVectorStores.has('Pinecone') || isPineconeStreaming || finalizingPinecone}
            onStartIndexing={() => handleStartIndexing('Pinecone')}
            onStopIndexing={() => void handleStopIndexing('Pinecone')}
            isStartingIndexing={isPineconeStreaming && !pineconeProgress}
            isStoppingIndexing={stoppingPinecone}
            streamingProgress={pineconeProgress}
            streamingStats={pineconeStats}
          />
        )}
      </div>

      {/* Pinecone Setup Modal */}
      <TauriPineconeSetupModal
        isOpen={showPineconeSetup}
        onClose={() => setShowPineconeSetup(false)}
        onSaveSuccess={() => {
          void refetchPineconeConfig();
        }}
      />
    </>
  );
}

/** Empty state when no stats are available */
function EmptyDashboard() {
  return (
    <div
      className="p-6 rounded-2xl border text-center"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      <div className="flex justify-center mb-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
            borderColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
          }}
        >
          <svg
            className="h-6 w-6 text-[var(--text-secondary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      </div>
      <p className="text-sm font-medium mb-1 text-[var(--text-primary)]">
        No Index Data Available
      </p>
      <p className="text-xs text-[var(--text-secondary)]">
        Run your first indexing job to see health metrics appear here.
      </p>
    </div>
  );
}
