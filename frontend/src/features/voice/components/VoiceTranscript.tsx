/**
 * VoiceTranscript Component
 * Displays the conversation transcript with collapsible history
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ChevronUpIcon, UserIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { MarkdownMessage } from '../../../components/MarkdownMessage';
import type { VoiceSessionState } from '../types/voice-types';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface VoiceTranscriptProps {
  className?: string;
  transcriptHistory: TranscriptEntry[];
  currentTranscript: string;
  currentAssistantTranscript: string;
  isTranscribing: boolean;
  sessionState: VoiceSessionState;
}

export function VoiceTranscript({
  className,
  transcriptHistory,
  currentTranscript,
  currentAssistantTranscript,
  isTranscribing,
  sessionState,
}: VoiceTranscriptProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptHistory, currentTranscript, currentAssistantTranscript, isExpanded]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isProcessing = sessionState === 'Processing';
  const hasContent = transcriptHistory.length > 0 || currentTranscript || currentAssistantTranscript || isProcessing;

  // When used in split layout, always show content even if empty (parent controls visibility)
  // When used standalone, hide if no content
  if (!hasContent && !className) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden ${className || ''}`}
    >
      {/* Header - always visible */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Transcript ({transcriptHistory.length} {transcriptHistory.length === 1 ? 'message' : 'messages'})
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-[var(--surface-elevated)] rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>
      </div>

      {/* Content - fills remaining space */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 overflow-hidden"
          >
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto px-4 py-4 space-y-3 thin-scrollbar"
            >
              {/* History */}
              {transcriptHistory.map((entry, index) => (
                <motion.div
                  key={`${entry.timestamp}-${index}`}
                  initial={{ opacity: 0, x: entry.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex gap-3 ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      ${
                        entry.role === 'user'
                          ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                          : 'bg-[var(--color-brand-500)]/20 text-[var(--color-brand-400)]'
                      }
                    `}
                  >
                    {entry.role === 'user' ? (
                      <UserIcon className="w-4 h-4" />
                    ) : (
                      <SparklesIcon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={`
                      flex-1 max-w-[80%] p-3 rounded-2xl
                      ${
                        entry.role === 'user'
                          ? 'bg-[var(--color-primary)]/10 rounded-tr-sm'
                          : 'bg-[var(--surface-elevated)] rounded-tl-sm'
                      }
                    `}
                  >
                    <div className="text-sm voice-transcript-content">
                      <MarkdownMessage content={entry.content} />
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] mt-1 block">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* Current transcription (live user input) */}
              {(currentTranscript || isTranscribing) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 flex-row-reverse"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                    <UserIcon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 max-w-[80%] p-3 rounded-2xl rounded-tr-sm bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30">
                    {currentTranscript ? (
                      <p className="text-sm text-[var(--text-primary)]">{currentTranscript}</p>
                    ) : (
                      <div className="flex items-center gap-1">
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-[var(--color-primary)]"
                        />
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 rounded-full bg-[var(--color-primary)]"
                        />
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 rounded-full bg-[var(--color-primary)]"
                        />
                      </div>
                    )}
                    <span className="text-xs text-[var(--text-tertiary)] mt-1 block">
                      Listening...
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Thinking indicator (when processing but no response yet) */}
              {isProcessing && !currentAssistantTranscript && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-brand-500)]/20 text-[var(--color-brand-400)]">
                    <SparklesIcon className="w-4 h-4 animate-pulse" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 max-w-[80%] p-3 rounded-2xl rounded-tl-sm bg-[var(--surface-elevated)] border border-[var(--color-brand-500)]/30">
                    <div className="flex items-center gap-2">
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-[var(--color-brand-400)]"
                      />
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 rounded-full bg-[var(--color-brand-400)]"
                      />
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 rounded-full bg-[var(--color-brand-400)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)] ml-1">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Current AI response (streaming text) */}
              {currentAssistantTranscript && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-brand-500)]/20 text-[var(--color-brand-400)]">
                    <SparklesIcon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 max-w-[80%] p-3 rounded-2xl rounded-tl-sm bg-[var(--surface-elevated)] border border-[var(--color-brand-500)]/30">
                    <div className="text-sm voice-transcript-content">
                      <MarkdownMessage content={currentAssistantTranscript} showCursor />
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] mt-1 block">
                      Speaking...
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Empty state for split layout mode */}
              {!hasContent && className && (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p className="text-sm text-[var(--text-tertiary)] text-center">
                    Conversation will appear here...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
