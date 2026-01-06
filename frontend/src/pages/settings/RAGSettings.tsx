import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useBoundStore } from '../../store/bound-store';
import { toast } from '../../hooks/use-toast';
import { isTauri } from '../../lib/native-notifications';
import { usePineconeConfigured } from '../../components/ui/use-pinecone-configured';
import { TauriPineconeSetupModal } from '../../components/ui/TauriPineconeSetupModal';
import { useAIHealth } from '../../features/ai/hooks/use-ai-health';
import { formatModelName } from '../../utils/model-name-formatter';
import { RagProvidersGrid } from './rag/components/RagProvidersGrid';
import { VectorStoreSection } from './rag/components/VectorStoreSection';
import { PipelineFeaturesSection } from './rag/components/PipelineFeaturesSection';
import { AdvancedSettingsSection } from './rag/components/AdvancedSettingsSection';
import {
  PROVIDER_NAME_MAP,
  COHERE_RERANK_MODELS,
  type RagFeatureToggle,
} from './rag/rag-settings.constants';

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
  const getFeatureValue = useCallback((key: RagFeatureToggle['key']): boolean => {
    switch (key) {
      case 'ragEnableHyde': return ragEnableHyde;
      case 'ragEnableQueryExpansion': return ragEnableQueryExpansion;
      case 'ragEnableHybridSearch': return ragEnableHybridSearch;
      case 'ragEnableReranking': return ragEnableReranking;
      case 'ragEnableAnalytics': return ragEnableAnalytics;
    }
  }, [ragEnableHyde, ragEnableQueryExpansion, ragEnableHybridSearch, ragEnableReranking, ragEnableAnalytics]);

  // Handle toggle change
  const handleFeatureToggle = useCallback(async (feature: RagFeatureToggle) => {
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

  const isTauriApp = isTauri();

  return (
    <div className="space-y-4">
      <RagProvidersGrid
        userId={user.userId}
        rerankingProvider={rerankingProvider}
        ragRerankingModel={ragRerankingModel}
        setRerankingProvider={setRerankingProvider}
        syncPreferencesToBackend={syncPreferencesToBackend}
        isSavingRerankingProvider={isSavingRerankingProvider}
        setIsSavingRerankingProvider={setIsSavingRerankingProvider}
        rerankingModels={rerankingModels}
        isHealthLoading={isHealthLoading}
        isRerankingModelOpen={isRerankingModelOpen}
        setIsRerankingModelOpen={setIsRerankingModelOpen}
        rerankingModelDropdownRef={rerankingModelDropdownRef}
        onSelectRerankingModel={(model) => {
          void handleRerankingModelSelect(model);
        }}
        getCohereModelInfo={getCohereModelInfo}
        ragHydeProvider={ragHydeProvider}
        ragHydeModel={ragHydeModel}
        setRagHydeProvider={setRagHydeProvider}
        isSavingHydeProvider={isSavingHydeProvider}
        setIsSavingHydeProvider={setIsSavingHydeProvider}
        hydeModels={hydeModels}
        isHydeModelOpen={isHydeModelOpen}
        setIsHydeModelOpen={setIsHydeModelOpen}
        hydeModelDropdownRef={hydeModelDropdownRef}
        onSelectHydeModel={(model) => {
          void handleHydeModelSelect(model);
        }}
        ragQueryExpansionProvider={ragQueryExpansionProvider}
        ragQueryExpansionModel={ragQueryExpansionModel}
        setRagQueryExpansionProvider={setRagQueryExpansionProvider}
        isSavingQueryExpansionProvider={isSavingQueryExpansionProvider}
        setIsSavingQueryExpansionProvider={setIsSavingQueryExpansionProvider}
        queryExpansionModels={queryExpansionModels}
        isQueryExpansionModelOpen={isQueryExpansionModelOpen}
        setIsQueryExpansionModelOpen={setIsQueryExpansionModelOpen}
        queryExpansionModelDropdownRef={queryExpansionModelDropdownRef}
        onSelectQueryExpansionModel={(model) => {
          void handleQueryExpansionModelSelect(model);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VectorStoreSection
          userId={user.userId}
          vectorStoreProvider={vectorStoreProvider}
          setVectorStoreProvider={setVectorStoreProvider}
          syncPreferencesToBackend={syncPreferencesToBackend}
          isPineconeConfigured={isPineconeConfigured}
          isSavingVectorStore={isSavingVectorStore}
          setIsSavingVectorStore={setIsSavingVectorStore}
          isTauri={isTauriApp}
          onOpenPineconeSetup={() => {
            setShowPineconeSetup(true);
          }}
        />
        <PipelineFeaturesSection
          getFeatureValue={getFeatureValue}
          savingFeature={savingFeature}
          onToggleFeature={(feature) => {
            void handleFeatureToggle(feature);
          }}
        />
      </div>

      <AdvancedSettingsSection
        isExpanded={isAdvancedExpanded}
        setIsExpanded={setIsAdvancedExpanded}
        hasNonDefaultSettings={hasNonDefaultSettings}
        savingAdvancedSetting={savingAdvancedSetting}
        getAdvancedSettingValue={getAdvancedSettingValue}
        onAdvancedSettingChange={(id, value) => {
          void handleAdvancedSettingChange(id, value);
        }}
        onResetAdvancedSettings={() => {
          void handleResetAdvancedSettings();
        }}
        ragVectorWeight={ragVectorWeight}
        ragBm25Weight={ragBm25Weight}
      />

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
