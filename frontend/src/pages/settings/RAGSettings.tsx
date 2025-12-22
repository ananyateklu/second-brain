import { useState, useCallback, useEffect, useMemo } from 'react';
import { useBoundStore } from '../../store/bound-store';
import { toast } from '../../hooks/use-toast';
import { isTauri } from '../../lib/native-notifications';
import { usePineconeConfigured } from '../../components/ui/use-pinecone-configured';
import { TauriPineconeSetupModal } from '../../components/ui/TauriPineconeSetupModal';

type VectorProvider = 'PostgreSQL' | 'Pinecone';

// Advanced RAG Settings configuration
const RAG_ADVANCED_SETTINGS = {
  tier1: [
    {
      id: 'ragTopK',
      name: 'Results to Return (TopK)',
      description: 'Number of results to return after all processing',
      min: 1,
      max: 20,
      step: 1,
      default: 5,
    },
    {
      id: 'ragSimilarityThreshold',
      name: 'Similarity Threshold',
      description: 'Minimum vector similarity score to include a result',
      min: 0.1,
      max: 0.9,
      step: 0.05,
      default: 0.3,
      format: (v: number) => v.toFixed(2),
    },
    {
      id: 'ragInitialRetrievalCount',
      name: 'Initial Retrieval Count',
      description: 'Number of candidates to retrieve before reranking',
      min: 10,
      max: 50,
      step: 5,
      default: 20,
    },
    {
      id: 'ragMinRerankScore',
      name: 'Min Rerank Score',
      description: 'Minimum rerank score (0-10) to include a result',
      min: 0,
      max: 10,
      step: 0.5,
      default: 3.0,
      format: (v: number) => v.toFixed(1),
    },
  ],
  tier2: [
    {
      id: 'ragMultiQueryCount',
      name: 'Query Variations',
      description: 'Number of query variations to generate for multi-query',
      min: 1,
      max: 5,
      step: 1,
      default: 3,
    },
    {
      id: 'ragMaxContextLength',
      name: 'Max Context Length',
      description: 'Maximum context length in characters for LLM',
      min: 1000,
      max: 16000,
      step: 500,
      default: 4000,
      format: (v: number) => `${v.toLocaleString()} chars`,
    },
  ],
} as const;

// RAG Feature Toggle definitions
const RAG_FEATURE_TOGGLES = [
  {
    id: 'hyde',
    key: 'ragEnableHyde' as const,
    name: 'HyDE',
    description: 'Hypothetical Document Embeddings - generates a hypothetical answer to improve semantic search',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'queryExpansion',
    key: 'ragEnableQueryExpansion' as const,
    name: 'Query Expansion',
    description: 'Generate multiple query variations to improve recall and find more relevant results',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  {
    id: 'hybridSearch',
    key: 'ragEnableHybridSearch' as const,
    name: 'Hybrid Search',
    description: 'Combine vector similarity with BM25 keyword search for better coverage',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
      </svg>
    ),
  },
  {
    id: 'reranking',
    key: 'ragEnableReranking' as const,
    name: 'Reranking',
    description: 'Use LLM to score and reorder results for higher relevance accuracy',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    key: 'ragEnableAnalytics' as const,
    name: 'Analytics',
    description: 'Log RAG query metrics for performance monitoring and optimization',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
] as const;

const VECTOR_STORE_OPTIONS: {
  id: VectorProvider;
  label: string;
  badge?: string;
  description: string;
  features: string[];
}[] = [
    {
      id: 'PostgreSQL',
      label: 'PostgreSQL',
      badge: 'Default',
      description: 'Local PostgreSQL database with pgvector extension for fast, efficient vector similarity search.',
      features: ['Local storage', 'Fast queries', 'Full control'],
    },
    {
      id: 'Pinecone',
      label: 'Pinecone',
      badge: 'Scalable',
      description: 'Vector database tuned for high-volume and multi-tenant knowledge bases.',
      features: ['Billions of vectors', 'Metadata filters', 'Hybrid search ready'],
    },
  ];

const RERANKING_PROVIDER_OPTIONS = [
  { id: 'OpenAI', name: 'OpenAI', description: 'Fast and reliable reranking with GPT models' },
  { id: 'Anthropic', name: 'Anthropic', description: 'High-quality reranking with Claude models' },
  { id: 'Gemini', name: 'Gemini', description: 'Cost-effective reranking with Gemini models' },
  { id: 'Grok', name: 'Grok (xAI)', description: 'Reranking with xAI Grok models' },
  { id: 'Cohere', name: 'Cohere', description: 'Native rerank API - fast and optimized for RAG', badge: 'Recommended' },
] as const;

export function RAGSettings() {
  const user = useBoundStore((state) => state.user);
  const rerankingProvider = useBoundStore((state) => state.rerankingProvider);
  const setRerankingProvider = useBoundStore((state) => state.setRerankingProvider);
  const vectorStoreProvider = useBoundStore((state) => state.vectorStoreProvider);
  const setVectorStoreProvider = useBoundStore((state) => state.setVectorStoreProvider);
  const syncPreferencesToBackend = useBoundStore((state) => state.syncPreferencesToBackend);
  const loadPreferencesFromBackend = useBoundStore((state) => state.loadPreferencesFromBackend);
  // RAG Feature Toggles
  const ragEnableHyde = useBoundStore((state) => state.ragEnableHyde);
  const ragEnableQueryExpansion = useBoundStore((state) => state.ragEnableQueryExpansion);
  const ragEnableHybridSearch = useBoundStore((state) => state.ragEnableHybridSearch);
  const ragEnableReranking = useBoundStore((state) => state.ragEnableReranking);
  const ragEnableAnalytics = useBoundStore((state) => state.ragEnableAnalytics);
  const setRagEnableHyde = useBoundStore((state) => state.setRagEnableHyde);
  const setRagEnableQueryExpansion = useBoundStore((state) => state.setRagEnableQueryExpansion);
  const setRagEnableHybridSearch = useBoundStore((state) => state.setRagEnableHybridSearch);
  const setRagEnableReranking = useBoundStore((state) => state.setRagEnableReranking);
  const setRagEnableAnalytics = useBoundStore((state) => state.setRagEnableAnalytics);
  // RAG Advanced Settings - Tier 1: Core Retrieval
  const ragTopK = useBoundStore((state) => state.ragTopK);
  const ragSimilarityThreshold = useBoundStore((state) => state.ragSimilarityThreshold);
  const ragInitialRetrievalCount = useBoundStore((state) => state.ragInitialRetrievalCount);
  const ragMinRerankScore = useBoundStore((state) => state.ragMinRerankScore);
  const setRagTopK = useBoundStore((state) => state.setRagTopK);
  const setRagSimilarityThreshold = useBoundStore((state) => state.setRagSimilarityThreshold);
  const setRagInitialRetrievalCount = useBoundStore((state) => state.setRagInitialRetrievalCount);
  const setRagMinRerankScore = useBoundStore((state) => state.setRagMinRerankScore);
  // RAG Advanced Settings - Tier 2: Hybrid Search
  const ragVectorWeight = useBoundStore((state) => state.ragVectorWeight);
  const ragBm25Weight = useBoundStore((state) => state.ragBm25Weight);
  const ragMultiQueryCount = useBoundStore((state) => state.ragMultiQueryCount);
  const ragMaxContextLength = useBoundStore((state) => state.ragMaxContextLength);
  const setRagVectorWeight = useBoundStore((state) => state.setRagVectorWeight);
  const setRagBm25Weight = useBoundStore((state) => state.setRagBm25Weight);
  const setRagMultiQueryCount = useBoundStore((state) => state.setRagMultiQueryCount);
  const setRagMaxContextLength = useBoundStore((state) => state.setRagMaxContextLength);
  const { isConfigured: isPineconeConfigured, refetch: refetchPineconeConfig } = usePineconeConfigured();
  const [isSavingRerankingProvider, setIsSavingRerankingProvider] = useState(false);
  const [isSavingVectorStore, setIsSavingVectorStore] = useState(false);
  const [showPineconeSetup, setShowPineconeSetup] = useState(false);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [savingAdvancedSetting, setSavingAdvancedSetting] = useState<string | null>(null);

  // Get current value for an advanced setting
  const getAdvancedSettingValue = useCallback((id: string): number => {
    switch (id) {
      case 'ragTopK': return ragTopK;
      case 'ragSimilarityThreshold': return ragSimilarityThreshold;
      case 'ragInitialRetrievalCount': return ragInitialRetrievalCount;
      case 'ragMinRerankScore': return ragMinRerankScore;
      case 'ragVectorWeight': return ragVectorWeight;
      case 'ragBm25Weight': return ragBm25Weight;
      case 'ragMultiQueryCount': return ragMultiQueryCount;
      case 'ragMaxContextLength': return ragMaxContextLength;
      default: return 0;
    }
  }, [ragTopK, ragSimilarityThreshold, ragInitialRetrievalCount, ragMinRerankScore, ragVectorWeight, ragBm25Weight, ragMultiQueryCount, ragMaxContextLength]);

  // Handle advanced setting change
  const handleAdvancedSettingChange = useCallback(async (id: string, value: number) => {
    if (!user?.userId) return;

    setSavingAdvancedSetting(id);
    try {
      switch (id) {
        case 'ragTopK':
          await setRagTopK(value);
          break;
        case 'ragSimilarityThreshold':
          await setRagSimilarityThreshold(value);
          break;
        case 'ragInitialRetrievalCount':
          await setRagInitialRetrievalCount(value);
          break;
        case 'ragMinRerankScore':
          await setRagMinRerankScore(value);
          break;
        case 'ragVectorWeight':
          await setRagVectorWeight(value);
          // Auto-adjust BM25 weight to complement vector weight
          await setRagBm25Weight(Math.round((1 - value) * 100) / 100);
          break;
        case 'ragBm25Weight':
          await setRagBm25Weight(value);
          // Auto-adjust vector weight to complement BM25 weight
          await setRagVectorWeight(Math.round((1 - value) * 100) / 100);
          break;
        case 'ragMultiQueryCount':
          await setRagMultiQueryCount(value);
          break;
        case 'ragMaxContextLength':
          await setRagMaxContextLength(value);
          break;
      }
    } catch (error) {
      console.error('Failed to update advanced RAG setting:', { id, error });
      toast.error('Failed to save setting', 'Please try again.');
    } finally {
      setSavingAdvancedSetting(null);
    }
  }, [user?.userId, setRagTopK, setRagSimilarityThreshold, setRagInitialRetrievalCount, setRagMinRerankScore, setRagVectorWeight, setRagBm25Weight, setRagMultiQueryCount, setRagMaxContextLength]);

  // Reset to defaults
  const handleResetAdvancedSettings = useCallback(async () => {
    if (!user?.userId) return;

    setSavingAdvancedSetting('reset');
    try {
      await Promise.all([
        setRagTopK(5),
        setRagSimilarityThreshold(0.3),
        setRagInitialRetrievalCount(20),
        setRagMinRerankScore(3.0),
        setRagVectorWeight(0.7),
        setRagBm25Weight(0.3),
        setRagMultiQueryCount(3),
        setRagMaxContextLength(4000),
      ]);
      toast.success('Settings reset', 'Advanced RAG settings have been reset to defaults.');
    } catch (error) {
      console.error('Failed to reset advanced RAG settings:', { error });
      toast.error('Failed to reset settings', 'Please try again.');
    } finally {
      setSavingAdvancedSetting(null);
    }
  }, [user?.userId, setRagTopK, setRagSimilarityThreshold, setRagInitialRetrievalCount, setRagMinRerankScore, setRagVectorWeight, setRagBm25Weight, setRagMultiQueryCount, setRagMaxContextLength]);

  // Check if any setting differs from default
  const hasNonDefaultSettings = useMemo(() => {
    return ragTopK !== 5 ||
           ragSimilarityThreshold !== 0.3 ||
           ragInitialRetrievalCount !== 20 ||
           ragMinRerankScore !== 3.0 ||
           ragVectorWeight !== 0.7 ||
           ragBm25Weight !== 0.3 ||
           ragMultiQueryCount !== 3 ||
           ragMaxContextLength !== 4000;
  }, [ragTopK, ragSimilarityThreshold, ragInitialRetrievalCount, ragMinRerankScore, ragVectorWeight, ragBm25Weight, ragMultiQueryCount, ragMaxContextLength]);

  // Load preferences from backend when component mounts
  useEffect(() => {
    if (user?.userId) {
      void loadPreferencesFromBackend(user.userId);
    }
  }, [user?.userId, loadPreferencesFromBackend]);

  // Get current value for a feature toggle
  const getFeatureValue = useCallback((key: typeof RAG_FEATURE_TOGGLES[number]['key']): boolean => {
    switch (key) {
      case 'ragEnableHyde': return ragEnableHyde;
      case 'ragEnableQueryExpansion': return ragEnableQueryExpansion;
      case 'ragEnableHybridSearch': return ragEnableHybridSearch;
      case 'ragEnableReranking': return ragEnableReranking;
      case 'ragEnableAnalytics': return ragEnableAnalytics;
    }
  }, [ragEnableHyde, ragEnableQueryExpansion, ragEnableHybridSearch, ragEnableReranking, ragEnableAnalytics]);

  // Handle toggle change
  const handleFeatureToggle = useCallback(async (feature: typeof RAG_FEATURE_TOGGLES[number]) => {
    if (!user?.userId) {
      console.error('User not authenticated');
      return;
    }

    setSavingFeature(feature.id);
    const newValue = !getFeatureValue(feature.key);

    try {
      switch (feature.key) {
        case 'ragEnableHyde':
          await setRagEnableHyde(newValue);
          break;
        case 'ragEnableQueryExpansion':
          await setRagEnableQueryExpansion(newValue);
          break;
        case 'ragEnableHybridSearch':
          await setRagEnableHybridSearch(newValue);
          break;
        case 'ragEnableReranking':
          await setRagEnableReranking(newValue);
          break;
        case 'ragEnableAnalytics':
          await setRagEnableAnalytics(newValue);
          break;
      }
    } catch (error) {
      console.error('Failed to update RAG feature toggle:', { feature: feature.name, error });
      toast.error(`Failed to save ${feature.name} setting`, 'Please try again.');
    } finally {
      setSavingFeature(null);
    }
  }, [user?.userId, getFeatureValue, setRagEnableHyde, setRagEnableQueryExpansion, setRagEnableHybridSearch, setRagEnableReranking, setRagEnableAnalytics]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading user data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* RAG Settings Grid - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Reranking Provider Selection */}
        <section
          className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-lg)',
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    RAG Enhancement
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Reranking provider
                  </h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Choose which AI provider reranks search results for more relevant responses
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {isSavingRerankingProvider && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Saving...
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                {RERANKING_PROVIDER_OPTIONS.map((option) => {
                  const isActive = rerankingProvider === option.id;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => {
                        void (async () => {
                          if (!user?.userId) {
                            console.error('User not authenticated');
                            return;
                          }

                          setIsSavingRerankingProvider(true);
                          try {
                            await setRerankingProvider(option.id, false);
                            await syncPreferencesToBackend(user.userId);
                          } catch (error) {
                            console.error('Failed to update reranking provider:', { error });
                            toast.error('Failed to save reranking provider', 'Please try again.');
                          } finally {
                            setIsSavingRerankingProvider(false);
                          }
                        })();
                      }}
                      disabled={isSavingRerankingProvider}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      style={{
                        backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
                        color: isActive ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>{option.name}</span>
                      {'badge' in option && option.badge && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl"
                          style={{
                            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                            color: isActive ? 'white' : 'var(--color-brand-600)',
                          }}
                        >
                          {option.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Vector Store Provider Selection */}
        <section
          className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-lg)',
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    Chat Preference
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Vector store provider
                  </h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Choose which store powers Retrieval-Augmented responses in chat
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {isSavingVectorStore && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Saving...
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                {VECTOR_STORE_OPTIONS.map((option) => {
                  const isActive = vectorStoreProvider === option.id;
                  const needsSetup = option.id === 'Pinecone' && isTauri() && !isPineconeConfigured;

                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => {
                        if (needsSetup) {
                          setShowPineconeSetup(true);
                          return;
                        }

                        void (async () => {
                          if (!user?.userId) {
                            console.error('User not authenticated');
                            return;
                          }

                          setIsSavingVectorStore(true);
                          try {
                            await setVectorStoreProvider(option.id, false);
                            await syncPreferencesToBackend(user.userId);
                          } catch (error) {
                            console.error('Failed to update vector store provider:', { error });
                            toast.error('Failed to save vector store preference', 'Please try again.');
                          } finally {
                            setIsSavingVectorStore(false);
                          }
                        })();
                      }}
                      disabled={isSavingVectorStore}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      style={{
                        backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
                        color: isActive ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {option.id === 'PostgreSQL' ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                      <span>{option.label}</span>
                      {option.badge && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl"
                          style={{
                            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                            color: isActive ? 'white' : 'var(--color-brand-600)',
                          }}
                        >
                          {option.badge}
                        </span>
                      )}
                      {needsSetup && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl flex items-center gap-1"
                          style={{
                            backgroundColor: 'color-mix(in srgb, #f59e0b 12%, transparent)',
                            color: '#f59e0b',
                          }}
                        >
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                          </svg>
                          Setup
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* RAG Feature Toggles Section */}
      <section
        className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  RAG Pipeline
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Feature Toggles
                </h3>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Enable or disable individual RAG pipeline features to balance speed vs. accuracy
              </p>
            </div>
          </div>

          {/* Feature Toggle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {RAG_FEATURE_TOGGLES.map((feature) => {
              const isEnabled = getFeatureValue(feature.key);
              const isSaving = savingFeature === feature.id;

              return (
                <div
                  key={feature.id}
                  className="flex items-start gap-3 p-3 rounded-2xl border transition-all duration-200"
                  style={{
                    backgroundColor: isEnabled
                      ? 'color-mix(in srgb, var(--color-brand-600) 8%, transparent)'
                      : 'var(--surface-elevated)',
                    borderColor: isEnabled
                      ? 'color-mix(in srgb, var(--color-brand-600) 25%, transparent)'
                      : 'var(--border)',
                  }}
                >
                  {/* Feature Icon */}
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0"
                    style={{
                      backgroundColor: isEnabled
                        ? 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)'
                        : 'var(--surface-card)',
                      color: isEnabled ? 'var(--color-brand-600)' : 'var(--text-secondary)',
                    }}
                  >
                    {feature.icon}
                  </div>

                  {/* Feature Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {feature.name}
                      </span>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => void handleFeatureToggle(feature)}
                        disabled={isSaving}
                        className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: isEnabled ? 'var(--color-brand-600)' : 'var(--border)',
                          // @ts-expect-error CSS variable for focus ring
                          '--tw-ring-color': 'var(--color-brand-600)',
                        }}
                        aria-pressed={isEnabled}
                        aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${feature.name}`}
                      >
                        <span
                          className="pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out"
                          style={{
                            backgroundColor: 'white',
                            // Keep a small inset so the thumb doesn't sit flush against the inside edge
                            transform: isEnabled ? 'translateX(14px)' : 'translateX(2px)',
                          }}
                        />
                      </button>
                    </div>
                    <p
                      className="text-[11px] leading-tight"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {feature.description}
                    </p>
                    {isSaving && (
                      <span className="text-[10px] mt-1 inline-block" style={{ color: 'var(--text-secondary)' }}>
                        Saving...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Advanced RAG Settings Section */}
      <section
        className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Section Header with Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
            className="flex items-start gap-3 w-full text-left"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-brand-600)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  RAG Pipeline
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>•</span>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Advanced Settings
                </h3>
                {hasNonDefaultSettings && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                      color: 'var(--color-brand-600)',
                    }}
                  >
                    Modified
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Fine-tune RAG retrieval parameters for your specific use case
              </p>
            </div>
            <div className="flex items-center">
              <svg
                className={`h-5 w-5 transition-transform duration-200 ${isAdvancedExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: 'var(--text-secondary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Collapsible Content */}
          {isAdvancedExpanded && (
            <div className="flex flex-col gap-4 pt-2">
              {/* Tier 1: Core Retrieval Settings */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Retrieval Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {RAG_ADVANCED_SETTINGS.tier1.map((setting) => {
                    const value = getAdvancedSettingValue(setting.id);
                    const isSaving = savingAdvancedSetting === setting.id;
                    const displayValue = 'format' in setting ? setting.format(value) : value.toString();

                    return (
                      <div
                        key={setting.id}
                        className="flex flex-col gap-2 p-3 rounded-2xl border"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {setting.name}
                          </span>
                          <span
                            className="text-sm font-mono px-2 py-0.5 rounded-lg"
                            style={{
                              backgroundColor: 'var(--surface-card)',
                              color: 'var(--color-brand-600)',
                            }}
                          >
                            {displayValue}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={setting.min}
                          max={setting.max}
                          step={setting.step}
                          value={value}
                          onChange={(e) => void handleAdvancedSettingChange(setting.id, parseFloat(e.target.value))}
                          disabled={isSaving}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: `linear-gradient(to right, var(--color-brand-600) 0%, var(--color-brand-600) ${((value - setting.min) / (setting.max - setting.min)) * 100}%, var(--border) ${((value - setting.min) / (setting.max - setting.min)) * 100}%, var(--border) 100%)`,
                          }}
                        />
                        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          {setting.description}
                        </p>
                        {isSaving && (
                          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                            Saving...
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tier 2: Hybrid Search Settings */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Hybrid Search Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vector/BM25 Weight Balance */}
                  <div
                    className="flex flex-col gap-2 p-3 rounded-2xl border md:col-span-2"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Search Weight Balance
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded-lg"
                          style={{
                            backgroundColor: 'var(--surface-card)',
                            color: 'var(--color-brand-600)',
                          }}
                        >
                          Vector: {ragVectorWeight.toFixed(2)}
                        </span>
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded-lg"
                          style={{
                            backgroundColor: 'var(--surface-card)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          BM25: {ragBm25Weight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-brand-600)' }}>Vector</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={ragVectorWeight}
                        onChange={(e) => void handleAdvancedSettingChange('ragVectorWeight', parseFloat(e.target.value))}
                        disabled={savingAdvancedSetting === 'ragVectorWeight' || savingAdvancedSetting === 'ragBm25Weight'}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(to right, var(--color-brand-600) 0%, var(--color-brand-600) ${ragVectorWeight * 100}%, var(--text-secondary) ${ragVectorWeight * 100}%, var(--text-secondary) 100%)`,
                        }}
                      />
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>BM25</span>
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      Balance between semantic (vector) and keyword (BM25) search. Higher vector weight = more meaning-based results.
                    </p>
                  </div>

                  {/* Other Tier 2 Settings */}
                  {RAG_ADVANCED_SETTINGS.tier2.map((setting) => {
                    const value = getAdvancedSettingValue(setting.id);
                    const isSaving = savingAdvancedSetting === setting.id;
                    const displayValue = 'format' in setting ? setting.format(value) : value.toString();

                    return (
                      <div
                        key={setting.id}
                        className="flex flex-col gap-2 p-3 rounded-2xl border"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {setting.name}
                          </span>
                          <span
                            className="text-sm font-mono px-2 py-0.5 rounded-lg"
                            style={{
                              backgroundColor: 'var(--surface-card)',
                              color: 'var(--color-brand-600)',
                            }}
                          >
                            {displayValue}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={setting.min}
                          max={setting.max}
                          step={setting.step}
                          value={value}
                          onChange={(e) => void handleAdvancedSettingChange(setting.id, parseFloat(e.target.value))}
                          disabled={isSaving}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: `linear-gradient(to right, var(--color-brand-600) 0%, var(--color-brand-600) ${((value - setting.min) / (setting.max - setting.min)) * 100}%, var(--border) ${((value - setting.min) / (setting.max - setting.min)) * 100}%, var(--border) 100%)`,
                          }}
                        />
                        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          {setting.description}
                        </p>
                        {isSaving && (
                          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                            Saving...
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reset Button */}
              {hasNonDefaultSettings && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => void handleResetAdvancedSettings()}
                    disabled={savingAdvancedSetting === 'reset'}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {savingAdvancedSetting === 'reset' ? 'Resetting...' : 'Reset to Defaults'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Pinecone Setup Modal */}
      {showPineconeSetup && (
        <TauriPineconeSetupModal
          isOpen={showPineconeSetup}
          onClose={() => {
            setShowPineconeSetup(false);
            void refetchPineconeConfig();
          }}
        />
      )}
    </div>
  );
}
