import { isTauri } from '../../../lib/native-notifications';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { getFieldsByGroup } from './constants';
import { ApiKeyInput } from './ApiKeyInput';
import { SaveButtons } from './SaveButtons';
import { useSecrets } from './hooks/use-secrets';

/**
 * Full API Keys Manager for settings page.
 * Displays all API key categories with individual inputs.
 */
export function TauriApiKeysManager() {
  const {
    secrets,
    secretsPath,
    isLoading,
    isSaving,
    hasChanges,
    visibleFields,
    handleChange,
    handleSave,
    toggleVisibility,
  } = useSecrets();

  // Don't render if not in Tauri
  if (!isTauri()) {
    return null;
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading API keys..." className="p-8" />;
  }

  const aiProviderFields = getFieldsByGroup('ai');
  const vectorStoreFields = getFieldsByGroup('vectorstore');
  const githubFields = getFieldsByGroup('github');
  const gitFields = getFieldsByGroup('git');
  const voiceFields = getFieldsByGroup('voice');

  return (
    <div className="space-y-6">
      {/* AI Provider Keys */}
      <FieldGroup title="AI Provider API Keys">
        {aiProviderFields.map((field) => (
          <ApiKeyInput
            key={field.key}
            field={field}
            value={secrets[field.key]}
            isVisible={visibleFields.has(field.key)}
            onChange={handleChange}
            onToggleVisibility={toggleVisibility}
          />
        ))}
      </FieldGroup>

      {/* Voice Providers */}
      <FieldGroup
        title="Voice Agent (STT/TTS)"
        description="Configure speech-to-text and text-to-speech providers for voice conversations. Grok Voice uses your xAI API key configured above."
      >
        {voiceFields.map((field) => (
          <ApiKeyInput
            key={field.key}
            field={field}
            value={secrets[field.key]}
            isVisible={visibleFields.has(field.key)}
            onChange={handleChange}
            onToggleVisibility={toggleVisibility}
          />
        ))}
      </FieldGroup>

      {/* GitHub Integration */}
      <FieldGroup title="GitHub Integration">
        {githubFields.map((field) => (
          <ApiKeyInput
            key={field.key}
            field={field}
            value={secrets[field.key]}
            isVisible={visibleFields.has(field.key)}
            onChange={handleChange}
            onToggleVisibility={toggleVisibility}
          />
        ))}
      </FieldGroup>

      {/* Git Integration */}
      <FieldGroup title="Git Integration">
        {gitFields.map((field) => (
          <ApiKeyInput
            key={field.key}
            field={field}
            value={secrets[field.key]}
            isVisible={visibleFields.has(field.key)}
            onChange={handleChange}
            onToggleVisibility={toggleVisibility}
          />
        ))}
      </FieldGroup>

      {/* Pinecone / Vector Store Keys */}
      <FieldGroup title="Pinecone Vector Store">
        {vectorStoreFields.map((field) => (
          <ApiKeyInput
            key={field.key}
            field={field}
            value={secrets[field.key]}
            isVisible={visibleFields.has(field.key)}
            onChange={handleChange}
            onToggleVisibility={toggleVisibility}
          />
        ))}
      </FieldGroup>

      {/* Actions */}
      <div
        className="flex items-center justify-between pt-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="text-xs text-[var(--text-secondary)]">
          {secretsPath && (
            <span>
              Stored in:{' '}
              <code
                className="px-1 py-0.5 rounded"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              >
                {secretsPath}
              </code>
            </span>
          )}
        </div>
        <SaveButtons
          hasChanges={hasChanges}
          isSaving={isSaving}
          onSave={handleSave}
          variant="full"
        />
      </div>
    </div>
  );
}

/** Field group with title and optional description */
interface FieldGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function FieldGroup({ title, description, children }: FieldGroupProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
      {description && (
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}
