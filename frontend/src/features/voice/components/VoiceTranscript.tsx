/**
 * VoiceTranscript Component
 * Chat-style transcript display for voice conversations
 *
 * Features:
 * - Chat-style message bubbles (user right, assistant left)
 * - Inline process timeline (tools, thinking, retrieved notes)
 * - Live transcription indicator
 * - Auto-scroll to bottom
 * - Bottom padding for floating input bar
 */

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VoiceMessageBubble,
  VoiceTypingIndicator,
  VoiceLiveTranscriptionIndicator,
} from './VoiceMessageBubble';
import { VoiceProcessTimeline } from './VoiceProcessTimeline';
import brainTop from '../../../assets/brain-top-tab.png';
import type {
  VoiceSessionState,
  VoiceToolExecution,
  VoiceThinkingStep,
  VoiceRetrievedNote,
} from '../types/voice-types';

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  confidence?: number;
  // Associated process data for assistant messages
  toolExecutions?: VoiceToolExecution[];
  thinkingSteps?: VoiceThinkingStep[];
  retrievedNotes?: VoiceRetrievedNote[];
  // Response duration for assistant messages
  durationMs?: number;
}

interface VoiceTranscriptProps {
  className?: string;
  /** Completed transcript entries */
  transcriptHistory: TranscriptEntry[];
  /** Current live user transcription */
  currentTranscript: string;
  /** Current streaming assistant response */
  currentAssistantTranscript: string;
  /** Whether currently transcribing user speech */
  isTranscribing: boolean;
  /** Current session state */
  sessionState: VoiceSessionState;
  /** Currently executing tools (for streaming timeline) */
  activeToolExecutions?: VoiceToolExecution[];
  /** Active thinking steps (for streaming timeline) */
  activeThinkingSteps?: VoiceThinkingStep[];
  /** Active retrieved notes (for streaming timeline) */
  activeRetrievedNotes?: VoiceRetrievedNote[];
}

export function VoiceTranscript({
  className = '',
  transcriptHistory,
  currentTranscript,
  currentAssistantTranscript,
  isTranscribing,
  sessionState,
  activeToolExecutions = [],
  activeThinkingSteps = [],
  activeRetrievedNotes = [],
}: VoiceTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [
    transcriptHistory,
    currentTranscript,
    currentAssistantTranscript,
    activeToolExecutions,
    activeThinkingSteps,
  ]);

  const isProcessing = sessionState === 'Processing';
  const isSpeaking = sessionState === 'Speaking';
  const hasContent =
    transcriptHistory.length > 0 ||
    currentTranscript ||
    currentAssistantTranscript ||
    isProcessing ||
    isTranscribing;

  // Check if there's active process content for streaming
  const hasActiveProcess =
    activeToolExecutions.length > 0 ||
    activeThinkingSteps.length > 0 ||
    activeRetrievedNotes.length > 0;

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto thin-scrollbar ${className}`}
      style={{
        // Padding for floating input bar
        paddingBottom: '140px',
      }}
    >
      {/* Empty state - positioned lower to match ChatWelcomeScreen */}
      {!hasContent && (
        <div className="flex flex-col items-center pt-[35vh] px-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-8 relative group">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img
                src={brainTop}
                alt="Second Brain"
                className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <h2
              className="text-4xl font-bold tracking-tight drop-shadow-lg"
              style={{ color: 'var(--text-primary)' }}
            >
              Start a conversation
            </h2>
            <p
              className="text-lg mt-4 drop-shadow-md"
              style={{ color: 'var(--text-secondary)' }}
            >
              Select a voice and click Start to begin
            </p>
          </motion.div>
        </div>
      )}

      {/* Transcript content */}
      {hasContent && (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {/* Transcript history */}
          <AnimatePresence mode="popLayout">
            {transcriptHistory.map((entry, index) => {
              const isAssistant = entry.role === 'assistant';
              const hasProcess =
                isAssistant &&
                ((entry.toolExecutions && entry.toolExecutions.length > 0) ||
                  (entry.thinkingSteps && entry.thinkingSteps.length > 0) ||
                  (entry.retrievedNotes && entry.retrievedNotes.length > 0));

              return (
                <motion.div
                  key={`${entry.timestamp}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Process timeline before assistant message */}
                  {hasProcess && (
                    <VoiceProcessTimeline
                      toolExecutions={entry.toolExecutions || []}
                      thinkingSteps={entry.thinkingSteps || []}
                      retrievedNotes={entry.retrievedNotes || []}
                      isExpanded={true}
                      isStreaming={false}
                    />
                  )}

                  {/* Message bubble */}
                  <VoiceMessageBubble
                    role={entry.role}
                    content={entry.content}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Live user transcription */}
          <AnimatePresence>
            {(currentTranscript || isTranscribing) && (
              <VoiceLiveTranscriptionIndicator text={currentTranscript} />
            )}
          </AnimatePresence>

          {/* Active process timeline (streaming) */}
          <AnimatePresence>
            {hasActiveProcess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <VoiceProcessTimeline
                  toolExecutions={activeToolExecutions}
                  thinkingSteps={activeThinkingSteps}
                  retrievedNotes={activeRetrievedNotes}
                  isExpanded={true}
                  isStreaming={true}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thinking indicator (processing but no response yet) */}
          <AnimatePresence>
            {isProcessing && !currentAssistantTranscript && !hasActiveProcess && (
              <VoiceTypingIndicator />
            )}
          </AnimatePresence>

          {/* Streaming assistant response */}
          <AnimatePresence>
            {currentAssistantTranscript && (
              <VoiceMessageBubble
                role="assistant"
                content={currentAssistantTranscript}
                isStreaming={isSpeaking}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
