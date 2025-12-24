/**
 * Constants for API keys manager.
 */

import type { ProviderSecretKey, ProviderKeyInfo, ApiKeyField } from './types';

// Map provider IDs to their secret keys
export const PROVIDER_SECRET_KEYS: Record<string, ProviderSecretKey> = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
  google: 'gemini_api_key',
  xai: 'xai_api_key',
  ollama: 'ollama_base_url',
  // Voice providers
  deepgram: 'deepgram_api_key',
  elevenlabs: 'elevenlabs_api_key',
};

export const PROVIDER_KEY_INFO: Record<string, ProviderKeyInfo> = {
  openai: { label: 'OpenAI API Key', placeholder: 'sk-...' },
  anthropic: { label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
  google: { label: 'Google Gemini API Key', placeholder: 'AI...' },
  xai: { label: 'xAI (Grok) API Key', placeholder: 'xai-...' },
  ollama: {
    label: 'Ollama Base URL',
    placeholder: 'http://localhost:11434',
    helpText: 'Leave empty for default local Ollama',
  },
  // Voice providers
  deepgram: {
    label: 'Deepgram API Key',
    placeholder: 'Your Deepgram API key',
    helpText: 'Required for speech-to-text transcription',
  },
  elevenlabs: {
    label: 'ElevenLabs API Key',
    placeholder: 'Your ElevenLabs API key',
    helpText: 'Required for text-to-speech synthesis',
  },
};

export const API_KEY_FIELDS: ApiKeyField[] = [
  // AI Providers
  { key: 'openai_api_key', label: 'OpenAI API Key', placeholder: 'sk-...', type: 'password', group: 'ai' },
  { key: 'anthropic_api_key', label: 'Anthropic API Key', placeholder: 'sk-ant-...', type: 'password', group: 'ai' },
  { key: 'gemini_api_key', label: 'Google Gemini API Key', placeholder: 'AI...', type: 'password', group: 'ai' },
  { key: 'xai_api_key', label: 'xAI (Grok) API Key', placeholder: 'xai-...', type: 'password', group: 'ai' },
  {
    key: 'ollama_base_url',
    label: 'Ollama Base URL',
    placeholder: 'http://localhost:11434',
    type: 'text',
    group: 'ai',
    helpText: 'Leave empty for default local Ollama',
  },

  // Pinecone / Vector Store
  { key: 'pinecone_api_key', label: 'Pinecone API Key', placeholder: 'pcsk_...', type: 'password', group: 'vectorstore' },
  { key: 'pinecone_environment', label: 'Pinecone Environment', placeholder: 'us-east-1', type: 'text', group: 'vectorstore' },
  { key: 'pinecone_index_name', label: 'Pinecone Index Name', placeholder: 'second-brain', type: 'text', group: 'vectorstore' },

  // GitHub Integration
  { key: 'github_personal_access_token', label: 'GitHub Personal Access Token', placeholder: 'ghp_...', type: 'password', group: 'github' },
  {
    key: 'github_default_owner',
    label: 'GitHub Default Owner',
    placeholder: 'username or org',
    type: 'text',
    group: 'github',
    helpText: 'Default repository owner for GitHub operations',
  },
  {
    key: 'github_default_repo',
    label: 'GitHub Default Repository',
    placeholder: 'repo-name',
    type: 'text',
    group: 'github',
    helpText: 'Default repository name for GitHub operations',
  },

  // Git Integration
  {
    key: 'git_allowed_repository_roots',
    label: 'Allowed Repository Roots',
    placeholder: '/path/to/repos, /another/path',
    type: 'text',
    group: 'git',
    helpText: 'Comma-separated list of allowed repository paths',
  },

  // Voice Providers
  {
    key: 'deepgram_api_key',
    label: 'Deepgram API Key (STT)',
    placeholder: 'Your Deepgram key',
    type: 'password',
    group: 'voice',
    helpText: 'Required for speech-to-text transcription',
  },
  {
    key: 'elevenlabs_api_key',
    label: 'ElevenLabs API Key (TTS)',
    placeholder: 'Your ElevenLabs key',
    type: 'password',
    group: 'voice',
    helpText: 'Required for text-to-speech synthesis',
  },
  {
    key: 'openai_tts_api_key',
    label: 'OpenAI TTS API Key',
    placeholder: 'sk-... (optional)',
    type: 'password',
    group: 'voice',
    helpText: 'Leave empty to use your main OpenAI API key',
  },
];

// Group fields by category for easier rendering
export const getFieldsByGroup = (group: ApiKeyField['group']) =>
  API_KEY_FIELDS.filter((f) => f.group === group);
