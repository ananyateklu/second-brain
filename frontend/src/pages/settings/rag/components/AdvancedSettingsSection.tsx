import { Tooltip, InfoIcon } from '../../../../components/ui/Tooltip';
import { RAG_ADVANCED_SETTINGS } from '../rag-settings.constants';

interface AdvancedSettingsSectionProps {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  hasNonDefaultSettings: boolean;
  savingAdvancedSetting: string | null;
  getAdvancedSettingValue: (id: string) => number;
  onAdvancedSettingChange: (id: string, value: number) => void;
  onResetAdvancedSettings: () => void;
  ragVectorWeight: number;
  ragBm25Weight: number;
}

export function AdvancedSettingsSection({
  isExpanded,
  setIsExpanded,
  hasNonDefaultSettings,
  savingAdvancedSetting,
  getAdvancedSettingValue,
  onAdvancedSettingChange,
  onResetAdvancedSettings,
  ragVectorWeight,
  ragBm25Weight,
}: AdvancedSettingsSectionProps) {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Section Header with Collapse Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
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
              className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
        {isExpanded && (
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
                        backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
                              onChange={(e) => void onAdvancedSettingChange(setting.id, parseFloat(e.target.value))}
                              disabled={isSaving}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                background: `linear-gradient(to right, var(--btn-primary-bg) 0%, var(--btn-primary-bg) ${((value - setting.min) / (setting.max - setting.min)) * 100}%, var(--border) ${((value - setting.min) / (setting.max - setting.min)) * 100}%, var(--border) 100%)`,
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
                    backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
                          onChange={(e) => void onAdvancedSettingChange('ragVectorWeight', parseFloat(e.target.value))}
                          disabled={savingAdvancedSetting === 'ragVectorWeight' || savingAdvancedSetting === 'ragBm25Weight'}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                          style={{
                            background: `linear-gradient(to right, var(--btn-primary-bg) 0%, var(--btn-primary-bg) ${ragVectorWeight * 100}%, var(--border) ${ragVectorWeight * 100}%, var(--border) 100%)`,
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
                        backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
                              onChange={(e) => void onAdvancedSettingChange(setting.id, parseFloat(e.target.value))}
                              disabled={isSaving}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                background: `linear-gradient(to right, var(--btn-primary-bg) 0%, var(--btn-primary-bg) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`,
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
                  onClick={() => void onResetAdvancedSettings()}
                  disabled={savingAdvancedSetting === 'reset'}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    color: 'var(--text-secondary)',
                    border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
  );
}
