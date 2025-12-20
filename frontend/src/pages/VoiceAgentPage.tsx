/**
 * VoiceAgentPage
 * Main page for voice conversation with AI
 *
 * Layout: Split layout during session (orb left, transcript right)
 * Uses full available height for immersive voice experience
 */

import { Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MicrophoneIcon } from '@heroicons/react/24/outline';
import { VoiceAgentInterface, VoiceAgentSkeleton } from '../features/voice/components';
import { voiceService } from '../services/voice.service';
import { useBoundStore } from '../store/bound-store';
import { useTitleBarHeight } from '../components/layout/use-title-bar-height';

export function VoiceAgentPage() {
  const { setServiceStatus, isServiceAvailable, deepgramAvailable, elevenLabsAvailable } = useBoundStore();
  const titleBarHeight = useTitleBarHeight();

  // Calculate height accounting for App Header (~64px) and padding
  // Voice page gets the main App Header from AppLayout
  const containerHeight = `calc(100vh - ${titleBarHeight}px - 80px)`;

  // Check service status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await voiceService.getStatus();
        setServiceStatus(status);
      } catch (error) {
        
        console.error('Failed to check voice service status:', error);
        setServiceStatus({
          deepgramAvailable: false,
          elevenLabsAvailable: false,
          voiceAgentEnabled: false,
        });
      }
    };

    void checkStatus();
  }, [setServiceStatus]);

  // Show service unavailable message
  if (!isServiceAvailable) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-6 px-4 rounded-3xl border"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-2xl)',
          height: containerHeight,
          maxHeight: containerHeight,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 rounded-full bg-[var(--surface)] flex items-center justify-center"
        >
          <MicrophoneIcon className="w-12 h-12 text-[var(--text-tertiary)]" />
        </motion.div>

        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Voice Agent Unavailable
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            The voice agent requires Deepgram and ElevenLabs API keys to be configured.
          </p>

          <div className="space-y-2 text-left bg-[var(--surface)] rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  deepgramAvailable ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-[var(--text-primary)]">
                Deepgram STT: {deepgramAvailable ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  elevenLabsAvailable ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-[var(--text-primary)]">
                ElevenLabs TTS: {elevenLabsAvailable ? 'Connected' : 'Not configured'}
              </span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-tertiary)] mt-4">
            Configure the API keys in your backend settings to enable voice conversations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col rounded-3xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl)',
        height: containerHeight,
        maxHeight: containerHeight,
      }}
    >
      {/* Page header - fixed height */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-card)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-500)]/20 flex items-center justify-center">
            <MicrophoneIcon className="w-5 h-5 text-[var(--color-brand-400)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Voice Agent</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Have a natural conversation with AI using your voice
            </p>
          </div>
        </div>
      </div>

      {/* Main content - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={<VoiceAgentSkeleton />}>
          <VoiceAgentInterface />
        </Suspense>
      </div>
    </div>
  );
}

export default VoiceAgentPage;
