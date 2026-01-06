import { Tooltip } from '../../../../components/ui/Tooltip';
import type { RagFeatureToggle } from '../rag-settings.constants';
import { RAG_FEATURE_TOGGLES } from '../rag-settings.constants';

interface PipelineFeaturesSectionProps {
  getFeatureValue: (key: RagFeatureToggle['key']) => boolean;
  savingFeature: string | null;
  onToggleFeature: (feature: RagFeatureToggle) => void;
}

export function PipelineFeaturesSection({
  getFeatureValue,
  savingFeature,
  onToggleFeature,
}: PipelineFeaturesSectionProps) {
  return (
    <section
      className="rounded-3xl border p-4 transition-all duration-200 hover:shadow-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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

        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
          {RAG_FEATURE_TOGGLES.map((feature) => {
            const isEnabled = getFeatureValue(feature.key);
            const isSaving = savingFeature === feature.id;

            return (
              <Tooltip key={feature.id} content={feature.description} position="top" maxWidth={420}>
                <button
                  type="button"
                  onClick={() => void onToggleFeature(feature)}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: isEnabled ? 'var(--btn-primary-bg)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    color: isEnabled ? 'var(--btn-primary-text)' : 'var(--text-primary)',
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
  );
}
