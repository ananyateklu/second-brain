/**
 * VoiceSettings Component
 * Settings panel for voice agent configuration (provider, model, voice, agent capabilities)
 */

import { useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Cog6ToothIcon, SpeakerWaveIcon, WrenchScrewdriverIcon, BoltIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useBoundStore } from '../../../store/bound-store';
import { useAIHealth } from '../../ai/hooks/use-ai-health';
import { voiceService } from '../../../services/voice.service';
import type { VoiceInfo, VoiceProviderType } from '../types/voice-types';

interface VoiceSettingsProps {
  disabled?: boolean;
}

export function VoiceSettings({ disabled = false }: VoiceSettingsProps) {
  const {
    selectedProvider,
    selectedModel,
    selectedVoiceId,
    availableVoices,
    agentEnabled,
    capabilities,
    setSelectedProvider,
    setSelectedModel,
    setSelectedVoiceId,
    setAvailableVoices,
    setServiceStatus,
    setAgentEnabled,
    setCapabilities,
    // Grok Voice state
    voiceProviderType,
    grokVoiceAvailable,
    selectedGrokVoice,
    availableGrokVoices,
    enableGrokWebSearch,
    enableGrokXSearch,
    setVoiceProviderType,
    setSelectedGrokVoice,
    setAvailableGrokVoices,
    setEnableGrokWebSearch,
    setEnableGrokXSearch,
  } = useBoundStore();

  // Get available AI providers
  const { data: healthData, isLoading: isLoadingProviders } = useAIHealth();

  // Get available providers (only healthy ones)
  const availableProviders = useMemo(() => {
    if (!healthData?.providers) return [];
    return healthData.providers
      .filter((provider) => provider.isHealthy)
      .map((provider) => provider.provider);
  }, [healthData?.providers]);

  // Get models for selected provider
  const availableModels = useMemo(() => {
    if (!selectedProvider || !healthData?.providers) return [];
    const providerHealth = healthData.providers.find((p) => p.provider === selectedProvider);
    return providerHealth?.availableModels || [];
  }, [selectedProvider, healthData?.providers]);

  // Load voices and service status on mount
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const voices = await voiceService.getVoices();
        setAvailableVoices(voices);

        // Set default voice if none selected
        if (!selectedVoiceId && voices.length > 0) {
          setSelectedVoiceId(voices[0].voiceId);
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
      }
    };

    const loadGrokVoices = async () => {
      try {
        const grokVoices = await voiceService.getGrokVoices();
        setAvailableGrokVoices(grokVoices);

        // Set default Grok voice if none selected
        if (!selectedGrokVoice && grokVoices.length > 0) {
          setSelectedGrokVoice(grokVoices[0].voiceId);
        }
      } catch (error) {
        console.error('Failed to load Grok voices:', error);
      }
    };

    const loadStatus = async () => {
      try {
        const status = await voiceService.getStatus();
        setServiceStatus(status);
      } catch (error) {
        console.error('Failed to load voice service status:', error);
      }
    };

    loadVoices();
    loadGrokVoices();
    loadStatus();
  }, [selectedVoiceId, selectedGrokVoice, setAvailableVoices, setSelectedVoiceId, setAvailableGrokVoices, setSelectedGrokVoice, setServiceStatus]);

  // Set default provider if none selected
  useEffect(() => {
    if (!selectedProvider && availableProviders.length > 0) {
      setSelectedProvider(availableProviders[0]);
    }
  }, [selectedProvider, availableProviders, setSelectedProvider]);

  // Set default model when provider changes
  useEffect(() => {
    if (selectedProvider && availableModels.length > 0 && !availableModels.includes(selectedModel || '')) {
      setSelectedModel(availableModels[0]);
    }
  }, [selectedProvider, availableModels, selectedModel, setSelectedModel]);

  // Group voices by category
  const voicesByCategory = availableVoices.reduce<Record<string, VoiceInfo[]>>((acc, voice) => {
    const category = voice.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(voice);
    return acc;
  }, {});

  // Toggle agent capability
  const toggleCapability = useCallback(
    (capability: string) => {
      const newCapabilities = capabilities.includes(capability)
        ? capabilities.filter((c) => c !== capability)
        : [...capabilities, capability];
      setCapabilities(newCapabilities);
    },
    [capabilities, setCapabilities]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Cog6ToothIcon className="w-5 h-5 text-[var(--text-secondary)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Voice Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Voice Provider Type Selection */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            <BoltIcon className="w-4 h-4" />
            Voice Provider
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setVoiceProviderType('GrokVoice' as VoiceProviderType)}
              disabled={disabled || !grokVoiceAvailable}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${voiceProviderType === 'GrokVoice'
                  ? 'bg-[var(--color-brand-500)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]/80'}
                ${disabled || !grokVoiceAvailable ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title={!grokVoiceAvailable ? 'Grok Voice is not available - check xAI API key' : ''}
            >
              Grok Voice
            </button>
            <button
              onClick={() => setVoiceProviderType('Standard' as VoiceProviderType)}
              disabled={disabled}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${voiceProviderType === 'Standard'
                  ? 'bg-[var(--color-brand-500)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]/80'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              Standard
            </button>
          </div>
          {voiceProviderType === 'GrokVoice' && (
            <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
              Unified voice-to-voice with xAI Realtime API (&lt;700ms latency)
            </p>
          )}
        </div>

        {/* Standard Voice Settings */}
        {voiceProviderType === 'Standard' && (
          <>
            {/* AI Provider Selection */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                AI Provider
              </label>
              <select
                value={selectedProvider || ''}
                onChange={(e) => setSelectedProvider(e.target.value || null)}
                disabled={disabled || isLoadingProviders}
                className="
                  w-full px-3 py-2 rounded-lg text-sm
                  bg-[var(--surface-elevated)] text-[var(--text-primary)]
                  border border-[var(--border)] focus:border-[var(--color-primary)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <option value="">Select provider...</option>
                {availableProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Model
              </label>
              <select
                value={selectedModel || ''}
                onChange={(e) => setSelectedModel(e.target.value || null)}
                disabled={disabled || !selectedProvider || availableModels.length === 0}
                className="
                  w-full px-3 py-2 rounded-lg text-sm
                  bg-[var(--surface-elevated)] text-[var(--text-primary)]
                  border border-[var(--border)] focus:border-[var(--color-primary)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <option value="">Select model...</option>
                {availableModels.map((model: string) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                <SpeakerWaveIcon className="w-4 h-4" />
                Voice
              </label>
              <select
                value={selectedVoiceId || ''}
                onChange={(e) => setSelectedVoiceId(e.target.value || null)}
                disabled={disabled || availableVoices.length === 0}
                className="
                  w-full px-3 py-2 rounded-lg text-sm
                  bg-[var(--surface-elevated)] text-[var(--text-primary)]
                  border border-[var(--border)] focus:border-[var(--color-primary)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <option value="">Select voice...</option>
                {Object.entries(voicesByCategory).map(([category, voices]) => (
                  <optgroup key={category} label={category}>
                    {voices.map((voice) => (
                      <option key={voice.voiceId} value={voice.voiceId}>
                        {voice.name}
                        {voice.description && ` - ${voice.description}`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Selected voice preview */}
            {selectedVoiceId && (
              <div className="pt-2 border-t border-[var(--border)]">
                {(() => {
                  const voice = availableVoices.find((v) => v.voiceId === selectedVoiceId);
                  if (!voice) return null;

                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-brand-500)]/20 flex items-center justify-center">
                        <SpeakerWaveIcon className="w-5 h-5 text-[var(--color-brand-400)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {voice.name}
                        </p>
                        {voice.description && (
                          <p className="text-xs text-[var(--text-tertiary)] truncate">{voice.description}</p>
                        )}
                      </div>
                      {voice.previewUrl && (
                        <button
                          onClick={() => {
                            const audio = new Audio(voice.previewUrl);
                            audio.play().catch(console.error);
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]/80 transition-colors"
                        >
                          Preview
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* Grok Voice Settings */}
        {voiceProviderType === 'GrokVoice' && (
          <>
            {/* Grok Voice Selection */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                <SpeakerWaveIcon className="w-4 h-4" />
                Grok Voice
              </label>
              <select
                value={selectedGrokVoice}
                onChange={(e) => setSelectedGrokVoice(e.target.value)}
                disabled={disabled || availableGrokVoices.length === 0}
                className="
                  w-full px-3 py-2 rounded-lg text-sm
                  bg-[var(--surface-elevated)] text-[var(--text-primary)]
                  border border-[var(--border)] focus:border-[var(--color-primary)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {availableGrokVoices.map((voice) => (
                  <option key={voice.voiceId} value={voice.voiceId}>
                    {voice.name}
                    {voice.description && ` - ${voice.description}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Grok voice preview */}
            {selectedGrokVoice && (
              <div className="pt-2 border-t border-[var(--border)]">
                {(() => {
                  const voice = availableGrokVoices.find((v) => v.voiceId === selectedGrokVoice);
                  if (!voice) return null;

                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-brand-500)]/20 flex items-center justify-center">
                        <SpeakerWaveIcon className="w-5 h-5 text-[var(--color-brand-400)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {voice.name}
                        </p>
                        {voice.description && (
                          <p className="text-xs text-[var(--text-tertiary)] truncate">{voice.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Grok Built-in Tools */}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 mb-3">
                <GlobeAltIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">Built-in Search</span>
              </div>

              <div className="space-y-2 pl-2">
                {/* Web Search Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableGrokWebSearch}
                    onChange={(e) => setEnableGrokWebSearch(e.target.checked)}
                    disabled={disabled}
                    className="
                      w-4 h-4 rounded border-[var(--border)]
                      text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    style={{ accentColor: 'var(--color-brand-500)' }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-primary)]">Web Search</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Search the web for current information</p>
                  </div>
                </label>

                {/* X Search Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableGrokXSearch}
                    onChange={(e) => setEnableGrokXSearch(e.target.checked)}
                    disabled={disabled}
                    className="
                      w-4 h-4 rounded border-[var(--border)]
                      text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    style={{ accentColor: 'var(--color-brand-500)' }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-primary)]">X (Twitter) Search</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Search posts and trends on X</p>
                  </div>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Agent Capabilities Section - Available for BOTH Standard and Grok Voice */}
        <div className="pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <WrenchScrewdriverIcon className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {voiceProviderType === 'GrokVoice' ? 'App Functions' : 'Agent Capabilities'}
            </span>
          </div>

          {/* Agent Mode Toggle */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {voiceProviderType === 'GrokVoice' ? 'Enable App Functions' : 'Enable Agent Tools'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {voiceProviderType === 'GrokVoice'
                  ? 'Allow Grok Voice to use notes functions'
                  : 'Allow voice to use tools like notes & web search'}
              </p>
            </div>
            <button
              onClick={() => setAgentEnabled(!agentEnabled)}
              disabled={disabled}
              className={`
                relative w-11 h-6 rounded-full transition-colors
                ${agentEnabled ? 'bg-[var(--color-brand-500)]' : 'bg-[var(--surface-elevated)]'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-pressed={agentEnabled}
            >
              <span
                className={`
                  absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform
                  ${agentEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* Capability Toggles */}
          {agentEnabled && (
            <div className="space-y-2 pl-2">
              {/* Notes CRUD Capability */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={capabilities.includes('notes-crud')}
                  onChange={() => toggleCapability('notes-crud')}
                  disabled={disabled}
                  className="
                    w-4 h-4 rounded border-[var(--border)]
                    text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  style={{ accentColor: 'var(--color-brand-500)' }}
                />
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)]">Notes CRUD</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Create, read, update, delete notes</p>
                </div>
              </label>

              {/* Notes Search Capability */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={capabilities.includes('notes-search')}
                  onChange={() => toggleCapability('notes-search')}
                  disabled={disabled}
                  className="
                    w-4 h-4 rounded border-[var(--border)]
                    text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  style={{ accentColor: 'var(--color-brand-500)' }}
                />
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)]">Notes Search</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Semantic & keyword search</p>
                </div>
              </label>

              {/* Web Search Capability - Only for Standard mode (Grok has built-in) */}
              {voiceProviderType === 'Standard' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={capabilities.includes('web')}
                    onChange={() => toggleCapability('web')}
                    disabled={disabled}
                    className="
                      w-4 h-4 rounded border-[var(--border)]
                      text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    style={{ accentColor: 'var(--color-brand-500)' }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-primary)]">Web Search</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Live and deep web search</p>
                  </div>
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
