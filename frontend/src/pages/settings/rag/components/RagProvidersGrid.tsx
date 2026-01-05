import type { RefObject } from 'react';
import { Tooltip } from '../../../../components/ui/Tooltip';
import { toast } from '../../../../hooks/use-toast';
import { formatModelName } from '../../../../utils/model-name-formatter';
import type { BoundStore } from '../../../../store/types';
import {
  RERANKING_PROVIDER_OPTIONS,
  HYDE_PROVIDER_OPTIONS,
  QUERY_EXPANSION_PROVIDER_OPTIONS,
} from '../rag-settings.constants';

type RerankingModelInfo = {
  id: string;
  name: string;
  description: string;
  badge?: string;
};

interface RagProvidersGridProps {
  userId?: string;
  rerankingProvider: string | null;
  ragRerankingModel: string | null;
  setRerankingProvider: BoundStore['setRerankingProvider'];
  syncPreferencesToBackend: BoundStore['syncPreferencesToBackend'];
  isSavingRerankingProvider: boolean;
  setIsSavingRerankingProvider: (value: boolean) => void;
  rerankingModels: string[];
  isHealthLoading: boolean;
  isRerankingModelOpen: boolean;
  setIsRerankingModelOpen: (open: boolean) => void;
  rerankingModelDropdownRef: RefObject<HTMLDivElement | null>;
  onSelectRerankingModel: (model: string) => void;
  getCohereModelInfo: (modelId: string) => RerankingModelInfo | undefined;
  ragHydeProvider: string | null;
  ragHydeModel: string | null;
  setRagHydeProvider: BoundStore['setRagHydeProvider'];
  isSavingHydeProvider: boolean;
  setIsSavingHydeProvider: (value: boolean) => void;
  hydeModels: string[];
  isHydeModelOpen: boolean;
  setIsHydeModelOpen: (open: boolean) => void;
  hydeModelDropdownRef: RefObject<HTMLDivElement | null>;
  onSelectHydeModel: (model: string) => void;
  ragQueryExpansionProvider: string | null;
  ragQueryExpansionModel: string | null;
  setRagQueryExpansionProvider: BoundStore['setRagQueryExpansionProvider'];
  isSavingQueryExpansionProvider: boolean;
  setIsSavingQueryExpansionProvider: (value: boolean) => void;
  queryExpansionModels: string[];
  isQueryExpansionModelOpen: boolean;
  setIsQueryExpansionModelOpen: (open: boolean) => void;
  queryExpansionModelDropdownRef: RefObject<HTMLDivElement | null>;
  onSelectQueryExpansionModel: (model: string) => void;
}

export function RagProvidersGrid({
  userId,
  rerankingProvider,
  ragRerankingModel,
  setRerankingProvider,
  syncPreferencesToBackend,
  isSavingRerankingProvider,
  setIsSavingRerankingProvider,
  rerankingModels,
  isHealthLoading,
  isRerankingModelOpen,
  setIsRerankingModelOpen,
  rerankingModelDropdownRef,
  onSelectRerankingModel,
  getCohereModelInfo,
  ragHydeProvider,
  ragHydeModel,
  setRagHydeProvider,
  isSavingHydeProvider,
  setIsSavingHydeProvider,
  hydeModels,
  isHydeModelOpen,
  setIsHydeModelOpen,
  hydeModelDropdownRef,
  onSelectHydeModel,
  ragQueryExpansionProvider,
  ragQueryExpansionModel,
  setRagQueryExpansionProvider,
  isSavingQueryExpansionProvider,
  setIsSavingQueryExpansionProvider,
  queryExpansionModels,
  isQueryExpansionModelOpen,
  setIsQueryExpansionModelOpen,
  queryExpansionModelDropdownRef,
  onSelectQueryExpansionModel,
}: RagProvidersGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Side: Reranking Provider + Model */}
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
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
              {RERANKING_PROVIDER_OPTIONS.map((option) => {
                const isActive = rerankingProvider === option.id;
                return (
                  <Tooltip key={option.id} content={option.description} position="bottom" maxWidth={420} delay={300}>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          if (!userId) return;
                          setIsSavingRerankingProvider(true);
                          try {
                            await setRerankingProvider(option.id, false);
                            await syncPreferencesToBackend(userId);
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
                        backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                        color: isActive ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                      }}
                    >
                      <span>{option.name}</span>
                      {'badge' in option && option.badge && (
                        <span className="text-[8px] font-semibold px-1 py-0.5 rounded" style={{
                          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
                          color: isActive ? 'white' : 'var(--text-secondary)',
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
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  borderColor: isRerankingModelOpen ? 'var(--color-brand-600)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
                  className="absolute top-full right-0 mt-2 rounded-xl border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    minWidth: '280px',
                  }}
                >
                  <div className="max-h-64 overflow-y-auto thin-scrollbar p-1.5">
                    {rerankingModels.map((model) => {
                      const isSelected = model === ragRerankingModel;
                      const cohereInfo = rerankingProvider === 'Cohere' ? getCohereModelInfo(model) : null;
                      return (
                        <button
                          key={model}
                          type="button"
                          onClick={() => void onSelectRerankingModel(model)}
                          className={`w-full flex flex-col gap-0.5 px-3 py-2 text-left transition-all rounded-lg ${isSelected
                            ? 'bg-[var(--color-primary-alpha)]'
                            : 'hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]'
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
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
              {HYDE_PROVIDER_OPTIONS.map((option) => {
                const isActive = ragHydeProvider === option.id;
                return (
                  <Tooltip key={option.id} content={option.description} position="bottom" maxWidth={420} delay={300}>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          if (!userId) return;
                          setIsSavingHydeProvider(true);
                          try {
                            await setRagHydeProvider(option.id, false);
                            await syncPreferencesToBackend(userId);
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
                        backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                        color: isActive ? 'var(--btn-primary-text)' : 'var(--text-primary)',
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
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  borderColor: isHydeModelOpen ? 'var(--color-brand-600)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
                  className="absolute top-full right-0 mt-2 rounded-xl border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    minWidth: '220px',
                  }}
                >
                  <div className="max-h-64 overflow-y-auto thin-scrollbar p-1.5">
                    {hydeModels.map((model) => {
                      const isSelected = model === ragHydeModel;
                      return (
                        <button
                          key={model}
                          type="button"
                          onClick={() => void onSelectHydeModel(model)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-all rounded-lg ${isSelected
                            ? 'bg-[var(--color-primary-alpha)]'
                            : 'hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]'
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
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl flex-1" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
              {QUERY_EXPANSION_PROVIDER_OPTIONS.map((option) => {
                const isActive = ragQueryExpansionProvider === option.id;
                return (
                  <Tooltip key={option.id} content={option.description} position="bottom" maxWidth={420} delay={300}>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          if (!userId) return;
                          setIsSavingQueryExpansionProvider(true);
                          try {
                            await setRagQueryExpansionProvider(option.id, false);
                            await syncPreferencesToBackend(userId);
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
                        backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                        color: isActive ? 'var(--btn-primary-text)' : 'var(--text-primary)',
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
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  borderColor: isQueryExpansionModelOpen ? 'var(--color-brand-600)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
                  className="absolute top-full right-0 mt-2 rounded-xl border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    minWidth: '220px',
                  }}
                >
                  <div className="max-h-64 overflow-y-auto thin-scrollbar p-1.5">
                    {queryExpansionModels.map((model) => {
                      const isSelected = model === ragQueryExpansionModel;
                      return (
                        <button
                          key={model}
                          type="button"
                          onClick={() => void onSelectQueryExpansionModel(model)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-all rounded-lg ${isSelected
                            ? 'bg-[var(--color-primary-alpha)]'
                            : 'hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]'
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
  );
}
