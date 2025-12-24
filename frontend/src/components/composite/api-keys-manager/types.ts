/**
 * Types for API keys manager components.
 */

import type { Secrets } from '../../../lib/tauri-bridge';

// Provider secret key type (string keys only)
export type ProviderSecretKey =
  | 'openai_api_key'
  | 'anthropic_api_key'
  | 'gemini_api_key'
  | 'xai_api_key'
  | 'ollama_base_url'
  | 'deepgram_api_key'
  | 'elevenlabs_api_key';

// String-only keys from Secrets (excludes boolean fields)
export type StringSecretKeys =
  | 'openai_api_key'
  | 'anthropic_api_key'
  | 'gemini_api_key'
  | 'xai_api_key'
  | 'ollama_base_url'
  | 'pinecone_api_key'
  | 'pinecone_environment'
  | 'pinecone_index_name'
  | 'github_personal_access_token'
  | 'github_default_owner'
  | 'github_default_repo'
  | 'git_allowed_repository_roots'
  | 'deepgram_api_key'
  | 'elevenlabs_api_key'
  | 'openai_tts_api_key';

export type ApiKeyGroup = 'ai' | 'vectorstore' | 'github' | 'git' | 'voice';

export interface ApiKeyField {
  key: StringSecretKeys;
  label: string;
  placeholder: string;
  type: 'password' | 'text';
  helpText?: string;
  group: ApiKeyGroup;
}

export interface ProviderKeyInfo {
  label: string;
  placeholder: string;
  helpText?: string;
}

export interface ApiKeyInputProps {
  field: ApiKeyField;
  value: string | null | undefined;
  isVisible: boolean;
  onChange: (key: keyof Secrets, value: string) => void;
  onToggleVisibility: (key: keyof Secrets) => void;
}

export interface SaveButtonsProps {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: (restart: boolean) => void;
  variant?: 'compact' | 'full';
}

export interface TauriProviderApiKeyInputProps {
  providerId: string;
  onSaveSuccess?: () => void;
}
