import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useBoundStore } from '../../store/bound-store';
import { toast } from '../../hooks/use-toast';
import { isTauri } from '../../lib/native-notifications';
import { usePineconeConfigured } from '../../components/ui/use-pinecone-configured';
import { TauriPineconeSetupModal } from '../../components/ui/TauriPineconeSetupModal';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip';
import { useAIHealth } from '../../features/ai/hooks/use-ai-health';
import { formatModelName } from '../../utils/model-name-formatter';

// Mapping from health data provider names to our provider IDs
const PROVIDER_NAME_MAP: Record<string, string> = {
  'OpenAI': 'OpenAI',
  'Claude': 'Anthropic',
  'Anthropic': 'Anthropic',
  'Gemini': 'Gemini',
  'Ollama': 'Ollama',
  'Grok': 'Grok',
  'Cohere': 'Cohere',
};

type VectorProvider = 'PostgreSQL' | 'Pinecone';

// Advanced RAG Settings configuration
const RAG_ADVANCED_SETTINGS = {
  tier1: [
    {
      id: 'ragTopK',
      name: 'Results to Return (TopK)',
      description: 'The final number of notes included in the AI\'s context after all filtering and reranking. Lower values (1-3) give focused, precise answers. Higher values (5-10) provide broader context but may include less relevant content. Increase if answers seem incomplete; decrease if responses contain irrelevant information.',
      min: 1,
      max: 20,
      step: 1,
      default: 5,
    },
    {
      id: 'ragSimilarityThreshold',
      name: 'Similarity Threshold',
      description: 'Minimum semantic similarity score (0-1) required to consider a note relevant. Lower values (0.1-0.2) cast a wider net, returning more results but potentially including loosely related content. Higher values (0.5-0.7) are stricter, only returning highly relevant matches. Decrease if you\'re missing relevant notes; increase if getting too many unrelated results.',
      min: 0.1,
      max: 0.9,
      step: 0.05,
      default: 0.3,
      format: (v: number) => v.toFixed(2),
    },
    {
      id: 'ragInitialRetrievalCount',
      name: 'Initial Retrieval Count',
      description: 'Number of candidate notes to fetch from the vector store before reranking filters them down. Higher values (30-50) give the reranker more options to find the best matches but increase processing time. Lower values (10-15) are faster but may miss relevant notes. Increase for better accuracy on large note collections; decrease for faster responses.',
      min: 10,
      max: 50,
      step: 5,
      default: 20,
    },
    {
      id: 'ragMinRerankScore',
      name: 'Min Rerank Score',
      description: 'Minimum relevance score (0-10) from the AI reranker to include a result. The reranker evaluates each candidate and scores how well it answers your query. Lower values (1-2) include more results with loose relevance. Higher values (5-7) only keep highly relevant matches. Adjust based on answer quality - increase if getting off-topic content, decrease if missing relevant notes.',
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
      description: 'When Query Expansion is enabled, this sets how many alternative phrasings of your question are generated. Each variation searches separately, then results are merged. More variations (4-5) find notes that match different wordings of your intent but use more API calls. Fewer variations (1-2) are faster and cheaper. Increase for complex or ambiguous queries; decrease for simple, direct questions.',
      min: 1,
      max: 5,
      step: 1,
      default: 3,
    },
    {
      id: 'ragMaxContextLength',
      name: 'Max Context Length',
      description: 'Maximum total characters from retrieved notes to include in the AI\'s context window. Larger values (8000-16000) allow more note content but increase token costs and may hit model limits. Smaller values (2000-4000) are cheaper and faster but may truncate important information. Balance based on your typical note length and budget - longer technical notes may need higher limits.',
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
    description: 'Hypothetical Document Embeddings: Before searching, the AI generates a hypothetical "ideal answer" to your question, then searches for notes similar to that answer instead of your raw query. This dramatically improves results for questions where the answer phrasing differs from how you asked. Best for Q&A style queries. Adds one LLM call per search but significantly boosts relevance for complex questions.',
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
    description: 'Automatically generates multiple variations of your question using synonyms, related terms, and alternative phrasings. Each variation runs a separate search, and results are merged using Reciprocal Rank Fusion (RRF). This catches notes you might miss due to vocabulary mismatch - e.g., searching "car" also finds notes about "automobile" or "vehicle". Increases API usage proportionally to Query Variations setting.',
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
    description: 'Combines two search strategies: Vector search finds semantically similar content (understanding meaning), while BM25 keyword search finds exact term matches. Results are merged using RRF fusion. This ensures you find notes whether they match conceptually OR contain specific keywords. Essential for technical content with specific terminology. Use the Search Balance slider to tune the weight between semantic vs keyword matching.',
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
    description: 'After initial retrieval, an AI model re-evaluates each candidate note against your specific query and assigns a relevance score (0-10). Notes are then reordered by this score, pushing the most relevant to the top. This is the most impactful quality improvement - vector search finds candidates, but reranking ensures the best ones are selected. Adds latency and API cost but dramatically improves answer relevance.',
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
    description: 'Records detailed metrics for each RAG query including: retrieval time, number of candidates, rerank scores, final selections, and token usage. View analytics in the RAG Analytics dashboard to identify slow queries, tune thresholds, and understand which notes are being retrieved. Essential for optimizing your RAG pipeline. Minimal performance impact - data is logged asynchronously.',
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
      description: 'Uses your local PostgreSQL database with the pgvector extension. All embeddings stay on your machine - no external API calls for search. Best for privacy-conscious users, offline access, and when you have fewer than 100K notes. Supports both vector similarity and BM25 full-text search natively.',
      features: ['Local storage', 'Fast queries', 'Full control'],
    },
    {
      id: 'Pinecone',
      label: 'Pinecone',
      badge: 'Scalable',
      description: 'Cloud-hosted vector database optimized for massive scale. Handles millions of embeddings with consistent low-latency queries. Best for large note collections, multi-device sync, or when you need advanced filtering. Requires Pinecone API key and sends embeddings to Pinecone servers.',
      features: ['Billions of vectors', 'Metadata filters', 'Hybrid search ready'],
    },
  ];

const RERANKING_PROVIDER_OPTIONS = [
  { id: 'OpenAI', name: 'OpenAI', description: 'Uses GPT models to score relevance. Fast response times, good accuracy, competitive pricing. Best all-around choice if you already use OpenAI for chat.' },
  { id: 'Anthropic', name: 'Anthropic', description: 'Uses Claude models for reranking. Excellent at understanding nuanced queries and context. Slightly higher latency but often more accurate for complex questions.' },
  { id: 'Gemini', name: 'Gemini', description: 'Uses Google Gemini models. Very cost-effective with good performance. Best choice for budget-conscious users or high-volume usage.' },
  { id: 'Grok', name: 'xAI', description: 'Uses xAI Grok models. Good for real-time information and conversational queries. Newer option with competitive performance.' },
  { id: 'Cohere', name: 'Cohere', description: 'Purpose-built Rerank API designed specifically for RAG. Fastest option with excellent accuracy. No prompt engineering needed - just send documents and query. Best choice for production workloads.', badge: 'Recommended' },
] as const;

const HYDE_PROVIDER_OPTIONS = [
  { id: 'OpenAI', name: 'OpenAI', description: 'Uses GPT models for HyDE document generation. Fast and reliable with excellent instruction following. Recommended for most users.' },
  { id: 'Anthropic', name: 'Anthropic', description: 'Uses Claude models. Excellent at generating nuanced hypothetical documents. Best for complex or technical queries.' },
  { id: 'Gemini', name: 'Gemini', description: 'Uses Google Gemini models. Cost-effective with good performance. Great for high-volume usage.' },
  { id: 'Grok', name: 'xAI', description: 'Uses xAI Grok models. Good for real-time information and conversational queries.' },
  { id: 'Ollama', name: 'Ollama (Local)', description: 'Use local Ollama models. No API costs, fully private. Requires Ollama to be running.' },
] as const;

const QUERY_EXPANSION_PROVIDER_OPTIONS = [
  { id: 'OpenAI', name: 'OpenAI', description: 'Uses GPT models for query variation generation. Fast and reliable with excellent instruction following. Recommended for most users.' },
  { id: 'Anthropic', name: 'Anthropic', description: 'Uses Claude models. Excellent at generating nuanced query variations. Best for complex or technical queries.' },
  { id: 'Gemini', name: 'Gemini', description: 'Uses Google Gemini models. Cost-effective with good performance. Great for high-volume usage.' },
  { id: 'Grok', name: 'xAI', description: 'Uses xAI Grok models. Good for real-time information and conversational queries.' },
  { id: 'Ollama', name: 'Ollama (Local)', description: 'Use local Ollama models. No API costs, fully private. Requires Ollama to be running.' },
] as const;

// Cohere rerank models with metadata for UI display
const COHERE_RERANK_MODELS: { id: string; name: string; description: string; badge?: string }[] = [
  {
    id: 'rerank-v3.5',
    name: 'Rerank v3.5',
    description: '100+ languages, 4k context. Best balance of quality and speed.',
    badge: 'Recommended'
  },
  {
    id: 'rerank-v4.0-fast',
    name: 'Rerank v4.0 Fast',
    description: '100+ languages, 32k context. Optimized for low latency and high throughput.'
  },
  {
    id: 'rerank-v4.0-pro',
    name: 'Rerank v4.0 Pro',
    description: '100+ languages, 32k context. Highest quality for complex use-cases.',
    badge: 'Latest'
  },
  {
    id: 'rerank-english-v3.0',
    name: 'Rerank English v3.0',
    description: 'English only, 4k context. Fast and optimized for English content.'
  },
  {
    id: 'rerank-multilingual-v3.0',
    name: 'Rerank Multilingual v3.0',
    description: '100+ languages, 4k context. Legacy multilingual model.'
  },
];

export function RAGSettings() {
  const user = useBoundStore((state) => state.user);
  const rerankingProvider = useBoundStore((state) => state.rerankingProvider);
  const ragRerankingModel = useBoundStore((state) => state.ragRerankingModel);
  const setRerankingProvider = useBoundStore((state) => state.setRerankingProvider);
  const setRagRerankingModel = useBoundStore((state) => state.setRagRerankingModel);
  const vectorStoreProvider = useBoundStore((state) => state.vectorStoreProvider);
  const setVectorStoreProvider = useBoundStore((state) => state.setVectorStoreProvider);
  const syncPreferencesToBackend = useBoundStore((state) => state.syncPreferencesToBackend);
  const loadPreferencesFromBackend = useBoundStore((state) => state.loadPreferencesFromBackend);
  // HyDE Provider Settings
  const ragHydeProvider = useBoundStore((state) => state.ragHydeProvider);
  const ragHydeModel = useBoundStore((state) => state.ragHydeModel);
  const setRagHydeProvider = useBoundStore((state) => state.setRagHydeProvider);
  const setRagHydeModel = useBoundStore((state) => state.setRagHydeModel);
  // Query Expansion Provider Settings
  const ragQueryExpansionProvider = useBoundStore((state) => state.ragQueryExpansionProvider);
  const ragQueryExpansionModel = useBoundStore((state) => state.ragQueryExpansionModel);
  const setRagQueryExpansionProvider = useBoundStore((state) => state.setRagQueryExpansionProvider);
  const setRagQueryExpansionModel = useBoundStore((state) => state.setRagQueryExpansionModel);
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
  const [isSavingHydeProvider, setIsSavingHydeProvider] = useState(false);
  const [isSavingQueryExpansionProvider, setIsSavingQueryExpansionProvider] = useState(false);
  const [isSavingVectorStore, setIsSavingVectorStore] = useState(false);
  const [showPineconeSetup, setShowPineconeSetup] = useState(false);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(true);
  const [savingAdvancedSetting, setSavingAdvancedSetting] = useState<string | null>(null);

  // Model dropdown states
  const [isRerankingModelOpen, setIsRerankingModelOpen] = useState(false);
  const [isHydeModelOpen, setIsHydeModelOpen] = useState(false);
  const [isQueryExpansionModelOpen, setIsQueryExpansionModelOpen] = useState(false);
  const rerankingModelDropdownRef = useRef<HTMLDivElement>(null);
  const hydeModelDropdownRef = useRef<HTMLDivElement>(null);
  const queryExpansionModelDropdownRef = useRef<HTMLDivElement>(null);

  // Get AI health data for available models
  const { data: healthData, isLoading: isHealthLoading } = useAIHealth();

  // Get available models for reranking provider
  const rerankingModels = useMemo(() => {
    if (!rerankingProvider) return [];
    // Cohere uses specialized rerank models - return IDs only for consistency
    if (rerankingProvider === 'Cohere') return COHERE_RERANK_MODELS.map(m => m.id);
    // Other providers use their LLM models
    if (!healthData?.providers) return [];
    const providerData = healthData.providers.find(p => {
      const mappedName = PROVIDER_NAME_MAP[p.provider];
      return mappedName === rerankingProvider || p.provider === rerankingProvider;
    });
    return providerData?.availableModels || [];
  }, [healthData?.providers, rerankingProvider]);

  // Get Cohere model info by ID for rich display
  const getCohereModelInfo = (modelId: string) => {
    return COHERE_RERANK_MODELS.find(m => m.id === modelId);
  };

  // Get available models for HyDE provider
  const hydeModels = useMemo(() => {
    if (!healthData?.providers || !ragHydeProvider) return [];
    const providerData = healthData.providers.find(p => {
      const mappedName = PROVIDER_NAME_MAP[p.provider];
      return mappedName === ragHydeProvider || p.provider === ragHydeProvider;
    });
    return providerData?.availableModels || [];
  }, [healthData?.providers, ragHydeProvider]);

  // Get available models for Query Expansion provider
  const queryExpansionModels = useMemo(() => {
    if (!healthData?.providers || !ragQueryExpansionProvider) return [];
    const providerData = healthData.providers.find(p => {
      const mappedName = PROVIDER_NAME_MAP[p.provider];
      return mappedName === ragQueryExpansionProvider || p.provider === ragQueryExpansionProvider;
    });
    return providerData?.availableModels || [];
  }, [healthData?.providers, ragQueryExpansionProvider]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!isRerankingModelOpen && !isHydeModelOpen && !isQueryExpansionModelOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (rerankingModelDropdownRef.current && !rerankingModelDropdownRef.current.contains(event.target as Node)) {
        setIsRerankingModelOpen(false);
      }
      if (hydeModelDropdownRef.current && !hydeModelDropdownRef.current.contains(event.target as Node)) {
        setIsHydeModelOpen(false);
      }
      if (queryExpansionModelDropdownRef.current && !queryExpansionModelDropdownRef.current.contains(event.target as Node)) {
        setIsQueryExpansionModelOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isRerankingModelOpen, isHydeModelOpen, isQueryExpansionModelOpen]);

  // Close dropdowns on Escape key
  useEffect(() => {
    if (!isRerankingModelOpen && !isHydeModelOpen && !isQueryExpansionModelOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsRerankingModelOpen(false);
        setIsHydeModelOpen(false);
        setIsQueryExpansionModelOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isRerankingModelOpen, isHydeModelOpen, isQueryExpansionModelOpen]);

  // Handle model selection
  const handleRerankingModelSelect = async (model: string) => {
    setIsRerankingModelOpen(false);
    try {
      await setRagRerankingModel(model, true);
      toast.success('Reranking Model Updated', `Now using ${formatModelName(model)}`);
    } catch (error) {
      console.error('Failed to update reranking model:', { error });
      toast.error('Failed to save reranking model', 'Please try again.');
    }
  };

  const handleHydeModelSelect = async (model: string) => {
    setIsHydeModelOpen(false);
    try {
      await setRagHydeModel(model, true);
      toast.success('HyDE Model Updated', `Now using ${formatModelName(model)}`);
    } catch (error) {
      console.error('Failed to update HyDE model:', { error });
      toast.error('Failed to save HyDE model', 'Please try again.');
    }
  };

  const handleQueryExpansionModelSelect = async (model: string) => {
    setIsQueryExpansionModelOpen(false);
    try {
      await setRagQueryExpansionModel(model, true);
      toast.success('Query Expansion Model Updated', `Now using ${formatModelName(model)}`);
    } catch (error) {
      console.error('Failed to update Query Expansion model:', { error });
      toast.error('Failed to save Query Expansion model', 'Please try again.');
    }
  };

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
      {/* RAG AI Providers Grid - Reranking, HyDE, and Query Expansion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Side: Reranking Provider + Model */}
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
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Reranking
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  AI provider that reranks search results for relevance
                </p>
              </div>
              {isSavingRerankingProvider && (
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
              )}
            </div>

            {/* Provider + Model inline */}
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                {RERANKING_PROVIDER_OPTIONS.map((option) => {
                  const isActive = rerankingProvider === option.id;
                  return (
                    <Tooltip key={option.id} content={option.description} position="bottom" maxWidth={420} delay={300}>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            if (!user?.userId) return;
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
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
                          color: isActive ? 'white' : 'var(--text-primary)',
                        }}
                      >
                        <span>{option.name}</span>
                        {'badge' in option && option.badge && (
                          <span className="text-[8px] font-semibold px-1 py-0.5 rounded" style={{
                            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                            color: isActive ? 'white' : 'var(--color-brand-600)',
                          }}>{option.badge}</span>
                        )}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
              {/* Model Dropdown */}
              <div className="relative" ref={rerankingModelDropdownRef}>
                <button
                  type="button"
                  onClick={() => rerankingModels.length > 0 && setIsRerankingModelOpen(!isRerankingModelOpen)}
                  disabled={rerankingModels.length === 0 || (rerankingProvider !== 'Cohere' && isHealthLoading)}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-[color:var(--color-brand-600)] min-w-[140px]"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: isRerankingModelOpen ? 'var(--color-brand-600)' : 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="truncate">
                    {rerankingProvider !== 'Cohere' && isHealthLoading
                      ? 'Loading...'
                      : rerankingModels.length === 0
                        ? 'No models'
                        : ragRerankingModel
                          ? (rerankingProvider === 'Cohere' ? getCohereModelInfo(ragRerankingModel)?.name : null) ?? formatModelName(ragRerankingModel)
                          : 'Select model'}
                  </span>
                  <svg
                    className="w-3 h-3 flex-shrink-0 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ transform: isRerankingModelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isRerankingModelOpen && rerankingModels.length > 0 && (
                  <div
                    className="absolute top-full right-0 mt-1 rounded-lg border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      minWidth: '280px',
                    }}
                  >
                    <div className="max-h-64 overflow-y-auto thin-scrollbar">
                      {rerankingModels.map((model) => {
                        const isSelected = model === ragRerankingModel;
                        const cohereInfo = rerankingProvider === 'Cohere' ? getCohereModelInfo(model) : null;
                        return (
                          <button
                            key={model}
                            type="button"
                            onClick={() => void handleRerankingModelSelect(model)}
                            className={`w-full flex flex-col gap-0.5 px-2.5 py-2 text-left transition-all ${isSelected
                                ? 'bg-[color:color-mix(in_srgb,var(--color-brand-600)_12%,transparent)]'
                                : 'hover:bg-[color:color-mix(in_srgb,var(--color-brand-600)_8%,transparent)]'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium truncate" style={{ color: isSelected ? 'var(--color-brand-600)' : 'var(--text-primary)' }}>
                                  {cohereInfo ? cohereInfo.name : formatModelName(model)}
                                </span>
                                {cohereInfo?.badge && (
                                  <span className="text-[9px] font-semibold px-1 py-0.5 rounded" style={{
                                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)',
                                    color: 'var(--color-brand-600)',
                                  }}>{cohereInfo.badge}</span>
                                )}
                              </div>
                              {isSelected && (
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-brand-600)' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            {cohereInfo && (
                              <span className="text-[10px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                                {cohereInfo.description}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: HyDE Provider + Model */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  HyDE
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  AI provider for hypothetical document generation
                </p>
              </div>
              {isSavingHydeProvider && (
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
              )}
            </div>

            {/* Provider + Model inline */}
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                {HYDE_PROVIDER_OPTIONS.map((option) => {
                  const isActive = ragHydeProvider === option.id;
                  return (
                    <Tooltip key={option.id} content={option.description} position="bottom" maxWidth={420} delay={300}>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            if (!user?.userId) return;
                            setIsSavingHydeProvider(true);
                            try {
                              await setRagHydeProvider(option.id, false);
                              await syncPreferencesToBackend(user.userId);
                            } catch (error) {
                              console.error('Failed to update HyDE provider:', { error });
                              toast.error('Failed to save HyDE provider', 'Please try again.');
                            } finally {
                              setIsSavingHydeProvider(false);
                            }
                          })();
                        }}
                        disabled={isSavingHydeProvider}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
                          color: isActive ? 'white' : 'var(--text-primary)',
                        }}
                      >
                        <span>{option.name}</span>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
              {/* Model Dropdown */}
              <div className="relative" ref={hydeModelDropdownRef}>
                <button
                  type="button"
                  onClick={() => hydeModels.length > 0 && setIsHydeModelOpen(!isHydeModelOpen)}
                  disabled={hydeModels.length === 0 || isHealthLoading}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-[color:var(--color-brand-600)] min-w-[140px]"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: isHydeModelOpen ? 'var(--color-brand-600)' : 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="truncate">
                    {isHealthLoading
                      ? 'Loading...'
                      : hydeModels.length === 0
                        ? 'No models'
                        : ragHydeModel
                          ? formatModelName(ragHydeModel)
                          : 'Select model'}
                  </span>
                  <svg
                    className="w-3 h-3 flex-shrink-0 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ transform: isHydeModelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isHydeModelOpen && hydeModels.length > 0 && (
                  <div
                    className="absolute top-full right-0 mt-1 rounded-lg border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      minWidth: '220px',
                    }}
                  >
                    <div className="max-h-64 overflow-y-auto thin-scrollbar">
                      {hydeModels.map((model) => {
                        const isSelected = model === ragHydeModel;
                        return (
                          <button
                            key={model}
                            type="button"
                            onClick={() => void handleHydeModelSelect(model)}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs text-left transition-all ${isSelected
                                ? 'bg-[color:color-mix(in_srgb,var(--color-brand-600)_12%,transparent)]'
                                : 'hover:bg-[color:color-mix(in_srgb,var(--color-brand-600)_8%,transparent)]'
                              }`}
                            style={{
                              color: isSelected ? 'var(--color-brand-600)' : 'var(--text-primary)',
                            }}
                          >
                            <span className="truncate">{formatModelName(model)}</span>
                            {isSelected && (
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-brand-600)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Query Expansion Provider + Model */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Query Expansion
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  AI provider for generating query variations
                </p>
              </div>
              {isSavingQueryExpansionProvider && (
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
              )}
            </div>

            {/* Provider + Model inline */}
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                {QUERY_EXPANSION_PROVIDER_OPTIONS.map((option) => {
                  const isActive = ragQueryExpansionProvider === option.id;
                  return (
                    <Tooltip key={option.id} content={option.description} position="bottom" maxWidth={420} delay={300}>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            if (!user?.userId) return;
                            setIsSavingQueryExpansionProvider(true);
                            try {
                              await setRagQueryExpansionProvider(option.id, false);
                              await syncPreferencesToBackend(user.userId);
                            } catch (error) {
                              console.error('Failed to update Query Expansion provider:', { error });
                              toast.error('Failed to save Query Expansion provider', 'Please try again.');
                            } finally {
                              setIsSavingQueryExpansionProvider(false);
                            }
                          })();
                        }}
                        disabled={isSavingQueryExpansionProvider}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
                          color: isActive ? 'white' : 'var(--text-primary)',
                        }}
                      >
                        <span>{option.name}</span>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
              {/* Model Dropdown */}
              <div className="relative" ref={queryExpansionModelDropdownRef}>
                <button
                  type="button"
                  onClick={() => queryExpansionModels.length > 0 && setIsQueryExpansionModelOpen(!isQueryExpansionModelOpen)}
                  disabled={queryExpansionModels.length === 0 || isHealthLoading}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-[color:var(--color-brand-600)] min-w-[140px]"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: isQueryExpansionModelOpen ? 'var(--color-brand-600)' : 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="truncate">
                    {isHealthLoading
                      ? 'Loading...'
                      : queryExpansionModels.length === 0
                        ? 'No models'
                        : ragQueryExpansionModel
                          ? formatModelName(ragQueryExpansionModel)
                          : 'Select model'}
                  </span>
                  <svg
                    className="w-3 h-3 flex-shrink-0 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ transform: isQueryExpansionModelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isQueryExpansionModelOpen && queryExpansionModels.length > 0 && (
                  <div
                    className="absolute top-full right-0 mt-1 rounded-lg border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      minWidth: '220px',
                    }}
                  >
                    <div className="max-h-64 overflow-y-auto thin-scrollbar">
                      {queryExpansionModels.map((model) => {
                        const isSelected = model === ragQueryExpansionModel;
                        return (
                          <button
                            key={model}
                            type="button"
                            onClick={() => void handleQueryExpansionModelSelect(model)}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs text-left transition-all ${isSelected
                                ? 'bg-[color:color-mix(in_srgb,var(--color-brand-600)_12%,transparent)]'
                                : 'hover:bg-[color:color-mix(in_srgb,var(--color-brand-600)_8%,transparent)]'
                              }`}
                            style={{
                              color: isSelected ? 'var(--color-brand-600)' : 'var(--text-primary)',
                            }}
                          >
                            <span className="truncate">{formatModelName(model)}</span>
                            {isSelected && (
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-brand-600)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Vector Store + Pipeline Features - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Vector Store Provider */}
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

            <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              {VECTOR_STORE_OPTIONS.map((option) => {
                const isActive = vectorStoreProvider === option.id;
                const needsSetup = option.id === 'Pinecone' && isTauri() && !isPineconeConfigured;

                return (
                  <Tooltip key={option.id} content={option.description} position="bottom" maxWidth={420} delay={300}>
                    <button
                      type="button"
                      onClick={() => {
                        if (needsSetup) {
                          setShowPineconeSetup(true);
                          return;
                        }
                        void (async () => {
                          if (!user?.userId) return;
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
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: isActive ? 'var(--color-brand-600)' : 'transparent',
                        color: isActive ? 'white' : 'var(--text-primary)',
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

        {/* Right: Pipeline Features */}
        <section
          className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
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
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Pipeline Features
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Toggle RAG pipeline components
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              {RAG_FEATURE_TOGGLES.map((feature) => {
                const isEnabled = getFeatureValue(feature.key);
                const isSaving = savingFeature === feature.id;

                return (
                  <Tooltip key={feature.id} content={feature.description} position="top" maxWidth={420}>
                    <button
                      type="button"
                      onClick={() => void handleFeatureToggle(feature)}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: isEnabled ? 'var(--color-brand-600)' : 'transparent',
                        color: isEnabled ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      <span className={isEnabled ? '' : 'opacity-60'}>{feature.icon}</span>
                      <span>{feature.name}</span>
                      {isSaving && <span className="text-[9px] opacity-70">...</span>}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </section>
      </div>

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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {RAG_ADVANCED_SETTINGS.tier1.map((setting) => {
                    const value = getAdvancedSettingValue(setting.id);
                    const isSaving = savingAdvancedSetting === setting.id;
                    const displayValue = 'format' in setting ? setting.format(value) : value.toString();
                    const minDisplay = 'format' in setting ? setting.format(setting.min) : setting.min.toString();
                    const maxDisplay = 'format' in setting ? setting.format(setting.max) : setting.max.toString();

                    return (
                      <div
                        key={setting.id}
                        className="flex flex-col gap-3 p-4 rounded-2xl border"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {setting.name}
                          </span>
                          <Tooltip content={setting.description} position="top" maxWidth={420}>
                            <InfoIcon className="flex-shrink-0 cursor-help ml-1" />
                          </Tooltip>
                        </div>
                        {/* Slider with Min/Max Labels and Value Below */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono w-8 text-right flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                            {minDisplay}
                          </span>
                          <div className="flex-1 flex flex-col">
                            <div className="relative">
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
                            </div>
                            {/* Current Value - Positioned below thumb */}
                            <div className="relative h-5 mt-1">
                              <span
                                className="absolute text-[10px] font-mono px-1 py-0.5 rounded whitespace-nowrap"
                                style={{
                                  left: `calc(${((value - setting.min) / (setting.max - setting.min)) * 100}% + ${(50 - ((value - setting.min) / (setting.max - setting.min)) * 100) * 0.12}px)`,
                                  transform: 'translateX(-50%)',
                                  backgroundColor: 'var(--surface-card)',
                                  color: 'var(--color-brand-600)',
                                }}
                              >
                                {displayValue}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono w-8 text-left flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                            {maxDisplay}
                          </span>
                        </div>
                        {isSaving && (
                          <span className="text-[10px] text-center" style={{ color: 'var(--text-secondary)' }}>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Vector/BM25 Weight Balance */}
                  <div
                    className="flex flex-col gap-3 p-4 rounded-2xl border"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        Search Balance
                      </span>
                      <Tooltip content="Controls the blend between Vector (V) semantic search and Keyword (K) BM25 search. Vector search understands meaning and finds conceptually similar content even with different words. Keyword search finds exact term matches. Slide toward V (0.7-0.9) for conceptual queries like 'how to improve productivity'. Slide toward K (0.3-0.5) for specific terms like error codes, names, or technical jargon. Default 0.7/0.3 works well for most mixed content." position="top" maxWidth={420}>
                        <InfoIcon className="flex-shrink-0 cursor-help ml-1" />
                      </Tooltip>
                    </div>
                    {/* Slider with Min/Max Labels and Values Below */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono w-8 text-right flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        0
                      </span>
                      <div className="flex-1 flex flex-col">
                        <div className="relative">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={ragVectorWeight}
                            onChange={(e) => void handleAdvancedSettingChange('ragVectorWeight', parseFloat(e.target.value))}
                            disabled={savingAdvancedSetting === 'ragVectorWeight' || savingAdvancedSetting === 'ragBm25Weight'}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                            style={{
                              background: `linear-gradient(to right, var(--color-brand-600) 0%, var(--color-brand-600) ${ragVectorWeight * 100}%, var(--border) ${ragVectorWeight * 100}%, var(--border) 100%)`,
                            }}
                          />
                          {/* Vertical line indicator for Keyword (BM25) position */}
                          <div
                            className="absolute top-1/2 w-0.5 pointer-events-none z-20 rounded-full"
                            style={{
                              left: `calc(${ragBm25Weight * 100}% + ${(50 - ragBm25Weight * 100) * 0.12}px)`,
                              transform: 'translate(-50%, -50%)',
                              height: '7px',
                              backgroundColor: 'white',
                            }}
                          />
                        </div>
                        {/* Values positioned below their respective positions */}
                        <div className="relative h-5 mt-1">
                          <span
                            className="absolute text-[10px] font-mono px-1 py-0.5 rounded whitespace-nowrap"
                            style={{
                              left: `calc(${ragBm25Weight * 100}% + ${(50 - ragBm25Weight * 100) * 0.12}px)`,
                              transform: 'translateX(-50%)',
                              backgroundColor: 'var(--surface-card)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            K:{ragBm25Weight.toFixed(2)}
                          </span>
                          <span
                            className="absolute text-[10px] font-mono px-1 py-0.5 rounded whitespace-nowrap"
                            style={{
                              left: `calc(${ragVectorWeight * 100}% + ${(50 - ragVectorWeight * 100) * 0.12}px)`,
                              transform: 'translateX(-50%)',
                              backgroundColor: 'var(--surface-card)',
                              color: 'var(--color-brand-600)',
                            }}
                          >
                            V:{ragVectorWeight.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono w-8 text-left flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        1
                      </span>
                    </div>
                  </div>

                  {/* Other Tier 2 Settings */}
                  {RAG_ADVANCED_SETTINGS.tier2.map((setting) => {
                    const value = getAdvancedSettingValue(setting.id);
                    const isSaving = savingAdvancedSetting === setting.id;
                    const displayValue = 'format' in setting ? setting.format(value) : value.toString();
                    const minDisplay = 'format' in setting ? setting.format(setting.min) : setting.min.toString();
                    const maxDisplay = 'format' in setting ? setting.format(setting.max) : setting.max.toString();
                    const percentage = ((value - setting.min) / (setting.max - setting.min)) * 100;

                    return (
                      <div
                        key={setting.id}
                        className="flex flex-col gap-3 p-4 rounded-2xl border"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {setting.name}
                          </span>
                          <Tooltip content={setting.description} position="top" maxWidth={420}>
                            <InfoIcon className="flex-shrink-0 cursor-help ml-1" />
                          </Tooltip>
                        </div>
                        {/* Slider with Min/Max Labels and Value Below */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono w-12 text-right flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                            {minDisplay}
                          </span>
                          <div className="flex-1 flex flex-col">
                            <div className="relative">
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
                                  background: `linear-gradient(to right, var(--color-brand-600) 0%, var(--color-brand-600) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`,
                                }}
                              />
                            </div>
                            {/* Current Value - Positioned below thumb */}
                            <div className="relative h-5 mt-1">
                              <span
                                className="absolute text-[10px] font-mono px-1 py-0.5 rounded whitespace-nowrap"
                                style={{
                                  left: `calc(${percentage}% + ${(50 - percentage) * 0.12}px)`,
                                  transform: 'translateX(-50%)',
                                  backgroundColor: 'var(--surface-card)',
                                  color: 'var(--color-brand-600)',
                                }}
                              >
                                {displayValue}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono w-12 text-left flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                            {maxDisplay}
                          </span>
                        </div>
                        {isSaving && (
                          <span className="text-[10px] text-center" style={{ color: 'var(--text-secondary)' }}>
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
