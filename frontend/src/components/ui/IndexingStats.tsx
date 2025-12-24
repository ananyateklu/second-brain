import { useState, useEffect, useRef, startTransition } from 'react';
import {
  useIndexStats,
  useActiveIndexingVectorStores,
} from '../../features/rag/hooks/use-indexing';
import { isTauri } from '../../lib/native-notifications';
import { TauriPineconeSetupModal } from './TauriPineconeSetupModal';
import { usePineconeConfigured } from './use-pinecone-configured';
import {
  StatsCard,
  StatsCardSkeleton,
  PineconeSetupCard,
} from '../data-display/stats-card';

interface IndexingStatsProps {
  userId?: string;
}

/**
 * Displays indexing statistics for PostgreSQL and Pinecone vector stores.
 * Refactored to use extracted stats-card components.
 */
export function IndexingStats({ userId = 'default-user' }: IndexingStatsProps) {
  const activeVectorStores = useActiveIndexingVectorStores();
  const isAnyIndexing = activeVectorStores.size > 0;

  // Track which stores were being indexed when the job completed
  const wasPostgresIndexingRef = useRef(false);
  const wasPineconeIndexingRef = useRef(false);
  const [finalizingPostgres, setFinalizingPostgres] = useState(false);
  const [finalizingPinecone, setFinalizingPinecone] = useState(false);

  // Include finalizing state in the polling condition
  const shouldPollStats = isAnyIndexing || finalizingPostgres || finalizingPinecone;
  const { data: stats, isLoading, refetch } = useIndexStats(userId, shouldPollStats);

  useEffect(() => {
    const isPostgresActive = activeVectorStores.has('PostgreSQL');
    const isPineconeActive = activeVectorStores.has('Pinecone');

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
  }, [activeVectorStores, refetch]);

  const { isConfigured: isPineconeConfigured, refetch: refetchPineconeConfig } =
    usePineconeConfigured();
  const [showPineconeSetup, setShowPineconeSetup] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  if (!stats) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatsCard
          title="PostgreSQL"
          stats={stats.postgreSQL}
          userId={userId}
          vectorStoreProvider="PostgreSQL"
          isIndexing={activeVectorStores.has('PostgreSQL') || finalizingPostgres}
        />

        {/* Pinecone Card - Show setup button if not configured in Tauri mode */}
        {isTauri() && !isPineconeConfigured ? (
          <PineconeSetupCard onSetup={() => setShowPineconeSetup(true)} />
        ) : (
          <StatsCard
            title="Pinecone"
            stats={stats.pinecone}
            userId={userId}
            vectorStoreProvider="Pinecone"
            isIndexing={activeVectorStores.has('Pinecone') || finalizingPinecone}
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
function EmptyState() {
  return (
    <div
      className="p-4 rounded-2xl border text-center"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex justify-center mb-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
          }}
        >
          <svg
            className="h-5 w-5 text-[var(--text-secondary)]"
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
      <p className="text-xs font-medium mb-0.5 text-[var(--text-primary)]">
        No Stats Available
      </p>
      <p className="text-[10px] text-[var(--text-secondary)]">
        Run your first indexing job to see stats appear here
      </p>
    </div>
  );
}
