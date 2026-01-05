/**
 * VoiceDropdown Component
 * Dropdown for selecting TTS voice (Standard mode) or Grok voice
 * Styled to match GitHubRepoSelector dropdown
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { SpeakerWaveIcon, ChevronDownIcon, PlayIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { VoiceInfo, GrokVoiceInfo, VoiceProviderType } from '../types/voice-types';

interface VoiceDropdownProps {
  voiceProviderType: VoiceProviderType;
  // Standard mode props
  selectedVoiceId: string | null;
  availableVoices: VoiceInfo[];
  onVoiceChange: (voiceId: string) => void;
  // Grok mode props
  selectedGrokVoice: string;
  availableGrokVoices: GrokVoiceInfo[];
  onGrokVoiceChange: (voice: string) => void;
  disabled?: boolean;
}

export function VoiceDropdown({
  voiceProviderType,
  selectedVoiceId,
  availableVoices,
  onVoiceChange,
  selectedGrokVoice,
  availableGrokVoices,
  onGrokVoiceChange,
  disabled = false,
}: VoiceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isGrokMode = voiceProviderType === 'GrokVoice';

  // Get current selection display
  const currentVoice = useMemo(() => {
    if (isGrokMode) {
      return availableGrokVoices.find((v) => v.voiceId === selectedGrokVoice);
    }
    return availableVoices.find((v) => v.voiceId === selectedVoiceId);
  }, [isGrokMode, selectedGrokVoice, selectedVoiceId, availableGrokVoices, availableVoices]);

  // Group standard voices by category
  const voicesByCategory = useMemo(() => {
    if (isGrokMode) return {};
    return availableVoices.reduce<Record<string, VoiceInfo[]>>((acc, voice) => {
      const category = voice.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(voice);
      return acc;
    }, {});
  }, [availableVoices, isGrokMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectVoice = (voiceId: string) => {
    if (isGrokMode) {
      onGrokVoiceChange(voiceId);
    } else {
      onVoiceChange(voiceId);
    }
    setIsOpen(false);
  };

  const handlePreview = (e: React.MouseEvent, previewUrl: string) => {
    e.stopPropagation();
    const audio = new Audio(previewUrl);
    audio.play().catch(console.error);
  };

  const isSelected = (voiceId: string) => {
    return isGrokMode ? voiceId === selectedGrokVoice : voiceId === selectedVoiceId;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <div
        className="flex items-center p-1 my-1 backdrop-blur-md"
        style={{
          borderRadius: 'var(--chat-radius-md)',
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
          border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-2 py-1.5 text-sm
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-80'}
          `}
          style={{
            borderRadius: 'var(--chat-radius-sm)',
            backgroundColor: isOpen ? 'var(--surface-card)' : 'transparent',
            color: 'var(--text-primary)',
            transition: `all var(--chat-duration-fast) var(--chat-ease-out)`,
          }}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <SpeakerWaveIcon style={{ width: 'var(--chat-icon-md)', height: 'var(--chat-icon-md)', color: 'var(--color-brand-500)', flexShrink: 0 }} />
          <span className="font-medium truncate max-w-[120px]" title={currentVoice?.name || 'Select voice'}>
            {currentVoice?.name || 'Select voice'}
          </span>
          <ChevronDownIcon
            style={{
              width: 'var(--chat-icon-xs)',
              height: 'var(--chat-icon-xs)',
              flexShrink: 0,
              transition: `transform var(--chat-duration-fast) var(--chat-ease-out)`,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72 z-50 overflow-hidden"
          style={{
            borderRadius: 'var(--chat-radius-lg)',
            backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
            border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'var(--chat-shadow-lg)',
          }}
          role="listbox"
        >
          {/* Header */}
          <div
            className="px-3 py-2.5"
            style={{
              borderBottom: '1px solid',
              borderImage: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--text-primary) 10%, transparent), transparent) 1',
            }}
          >
            <h3
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {isGrokMode ? 'Grok Voices' : 'TTS Voices'}
            </h3>
          </div>

          {/* Voice List */}
          <div className="max-h-64 overflow-y-auto thin-scrollbar">
            {/* Empty state */}
            {((isGrokMode && availableGrokVoices.length === 0) || (!isGrokMode && availableVoices.length === 0)) && (
              <div className="p-4 text-center">
                <SpeakerWaveIcon style={{ width: 'var(--chat-icon-xl)', height: 'var(--chat-icon-xl)', margin: '0 auto 8px', opacity: 0.4, color: 'var(--text-tertiary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No voices available
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {isGrokMode ? 'Check xAI API configuration' : 'Check ElevenLabs API key'}
                </p>
              </div>
            )}

            {isGrokMode ? (
              // Grok voices (flat list)
              <div className="p-2">
                {availableGrokVoices.map((voice) => (
                  <button
                    key={voice.voiceId}
                    type="button"
                    onClick={() => handleSelectVoice(voice.voiceId)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3"
                    style={{
                      backgroundColor: isSelected(voice.voiceId)
                        ? 'var(--color-primary-alpha)'
                        : 'transparent',
                      color: 'var(--text-primary)',
                    }}
                    role="option"
                    aria-selected={isSelected(voice.voiceId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{voice.name}</span>
                      </div>
                      {voice.description && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {voice.description}
                        </p>
                      )}
                    </div>
                    {isSelected(voice.voiceId) && (
                      <CheckIcon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: 'var(--color-primary)' }}
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              // Standard voices (grouped by category)
              Object.entries(voicesByCategory).map(([category, voices]) => (
                <div key={category} className="p-2">
                  <p
                    className="text-xs font-medium px-2 py-1 uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {category}
                  </p>
                  {voices.map((voice) => (
                    <button
                      key={voice.voiceId}
                      type="button"
                      onClick={() => handleSelectVoice(voice.voiceId)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3"
                      style={{
                        backgroundColor: isSelected(voice.voiceId)
                          ? 'var(--color-primary-alpha)'
                          : 'transparent',
                        color: 'var(--text-primary)',
                      }}
                      role="option"
                      aria-selected={isSelected(voice.voiceId)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{voice.name}</span>
                        </div>
                        {voice.description && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                            {voice.description}
                          </p>
                        )}
                      </div>
                      {voice.previewUrl && (
                        <button
                          type="button"
                          onClick={(e) => handlePreview(e, voice.previewUrl as string)}
                          className="p-1 rounded transition-colors hover:bg-[var(--surface-elevated)]"
                          style={{ color: 'var(--text-secondary)' }}
                          title="Preview voice"
                        >
                          <PlayIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isSelected(voice.voiceId) && (
                        <CheckIcon
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: 'var(--color-primary)' }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
