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

import { useRef, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VoiceMessageBubble,
  VoiceTypingIndicator,
  VoiceLiveTranscriptionIndicator,
} from './VoiceMessageBubble';
import { VoiceProcessTimeline } from './VoiceProcessTimeline';
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
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Empty state */}
        {!hasContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)',
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--color-brand-400)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Start a voice conversation
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Click Start to begin speaking with the AI
            </p>
          </motion.div>
        )}

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
              <Fragment key={`${entry.timestamp}-${index}`}>
                {/* Process timeline before assistant message */}
                {hasProcess && (
                  <VoiceProcessTimeline
                    toolExecutions={entry.toolExecutions || []}
                    thinkingSteps={entry.thinkingSteps || []}
                    retrievedNotes={entry.retrievedNotes || []}
                    isExpanded={false}
                    isStreaming={false}
                  />
                )}

                {/* Message bubble */}
                <VoiceMessageBubble
                  role={entry.role}
                  content={entry.content}
                  timestamp={entry.timestamp}
                  confidence={entry.confidence}
                />
              </Fragment>
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
    </div>
  );
}
