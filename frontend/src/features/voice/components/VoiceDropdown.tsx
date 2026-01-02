/**
 * VoiceDropdown Component
 * Dropdown for selecting TTS voice (Standard mode) or Grok voice
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { SpeakerWaveIcon, ChevronDownIcon, PlayIcon } from '@heroicons/react/24/outline';
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

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2.5 my-1 rounded-xl backdrop-blur-md text-xs font-medium
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.03] active:scale-[0.97]'}
        `}
        style={{
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <SpeakerWaveIcon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
        <span className="truncate max-w-[120px]">
          {currentVoice?.name || 'Select voice'}
        </span>
        <ChevronDownIcon
          className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
          />

          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              backgroundColor: 'var(--surface-card-solid, var(--surface-card))',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-xl), 0 0 40px -10px rgba(0, 0, 0, 0.3)',
              minWidth: '280px',
              maxHeight: '320px',
              overflowY: 'auto',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            }}
            role="listbox"
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b sticky top-0"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface-card-solid, var(--surface-card))',
              }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {isGrokMode ? 'Grok Voices' : 'TTS Voices'}
              </h3>
            </div>

            {/* Voice List */}
            <div className="p-2">
              {isGrokMode ? (
                // Grok voices (flat list)
                availableGrokVoices.map((voice) => (
                  <button
                    key={voice.voiceId}
                    type="button"
                    onClick={() => handleSelectVoice(voice.voiceId)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                      transition-all duration-150 hover:scale-[1.01]
                    `}
                    style={{
                      backgroundColor: voice.voiceId === selectedGrokVoice
                        ? 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)'
                        : 'transparent',
                      color: 'var(--text-primary)',
                    }}
                    role="option"
                    aria-selected={voice.voiceId === selectedGrokVoice}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-xai, #6366f1) 20%, transparent)',
                      }}
                    >
                      <SpeakerWaveIcon className="w-4 h-4" style={{ color: 'var(--color-xai, #818cf8)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{voice.name}</p>
                      {voice.description && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {voice.description}
                        </p>
                      )}
                    </div>
                    {voice.voiceId === selectedGrokVoice && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-brand-500)' }}
                      />
                    )}
                  </button>
                ))
              ) : (
                // Standard voices (grouped by category)
                Object.entries(voicesByCategory).map(([category, voices]) => (
                  <div key={category} className="mb-2 last:mb-0">
                    <div
                      className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {category}
                    </div>
                    {voices.map((voice) => (
                      <button
                        key={voice.voiceId}
                        type="button"
                        onClick={() => handleSelectVoice(voice.voiceId)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                          transition-all duration-150 hover:scale-[1.01]
                        `}
                        style={{
                          backgroundColor: voice.voiceId === selectedVoiceId
                            ? 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)'
                            : 'transparent',
                          color: 'var(--text-primary)',
                        }}
                        role="option"
                        aria-selected={voice.voiceId === selectedVoiceId}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 20%, transparent)',
                          }}
                        >
                          <SpeakerWaveIcon className="w-4 h-4" style={{ color: 'var(--color-brand-400)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{voice.name}</p>
                          {voice.description && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                              {voice.description}
                            </p>
                          )}
                        </div>
                        {voice.previewUrl && (
                          <button
                            type="button"
                            onClick={(e) => handlePreview(e, voice.previewUrl as string)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Preview voice"
                          >
                            <PlayIcon className="w-4 h-4" />
                          </button>
                        )}
                        {voice.voiceId === selectedVoiceId && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: 'var(--color-brand-500)' }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
