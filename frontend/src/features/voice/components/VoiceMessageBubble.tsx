/**
 * VoiceMessageBubble Component
 * Chat-style message bubble for voice transcripts
 *
 * Features:
 * - User messages: right-aligned with branded background
 * - Assistant messages: left-aligned with elevated background
 * - Rounded corners with one flattened (user: br, assistant: bl)
 * - Avatar icons: User icon or Sparkles icon
 * - Supports streaming state for live transcription
 * - Markdown rendering for assistant messages
 */

import { motion, useReducedMotion } from 'framer-motion';
import { UserIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { MarkdownMessage } from '../../../components/MarkdownMessage';

interface VoiceMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  isStreaming?: boolean;
  /** For user messages during live transcription */
  isTranscribing?: boolean;
  /** Confidence score for transcription (0-1) */
  confidence?: number;
}

export function VoiceMessageBubble({
  role,
  content,
  timestamp,
  isStreaming = false,
  isTranscribing = false,
  confidence,
}: VoiceMessageBubbleProps) {
  const prefersReducedMotion = useReducedMotion();
  const isUser = role === 'user';
  const isLiveIndicator = isTranscribing && isUser;

  // Format timestamp if provided
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: isUser ? 20 : -20 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
          }}
        >
          <SparklesIcon className="w-4 h-4" style={{ color: 'var(--color-brand-500)' }} />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={
          isUser
            ? {
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                color: 'var(--text-primary)',
              }
            : {
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }
        }
      >
        {/* Content */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {isUser ? (
            // User messages are plain text
            <p>{content}</p>
          ) : (
            // Assistant messages support markdown
            <MarkdownMessage content={content} />
          )}

          {/* Streaming indicator */}
          {(isStreaming || isLiveIndicator) && (
            <span className="inline-flex ml-1">
              <StreamingDots />
            </span>
          )}
        </div>

        {/* Footer with timestamp and confidence */}
        <div className="flex items-center justify-between mt-1.5 gap-2">
          {formattedTime && (
            <span
              className="text-[10px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {formattedTime}
            </span>
          )}

          {/* Confidence indicator for user messages */}
          {isUser && typeof confidence === 'number' && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                color: 'var(--text-tertiary)',
              }}
            >
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
          }}
        >
          <UserIcon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Streaming dots animation for live transcription
 */
function StreamingDots() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <span className="inline-flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-current opacity-50" />
        <span className="w-1 h-1 rounded-full bg-current opacity-50" />
        <span className="w-1 h-1 rounded-full bg-current opacity-50" />
      </span>
    );
  }

  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}

/**
 * Typing indicator for when assistant is about to speak
 */
export function VoiceTypingIndicator() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex justify-start gap-2"
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
        }}
      >
        <SparklesIcon className="w-4 h-4" style={{ color: 'var(--color-brand-500)' }} />
      </div>

      {/* Typing bubble */}
      <div
        className="rounded-2xl rounded-bl-md px-4 py-3"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--text-tertiary)' }}
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                      y: [0, -4, 0],
                    }
              }
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Live transcription indicator that shows during user speech
 */
export function VoiceLiveTranscriptionIndicator({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-end gap-2"
    >
      <div
        className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
          border: '1px dashed color-mix(in srgb, var(--color-primary) 30%, transparent)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Mic icon */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              style={{ color: 'var(--color-primary)' }}
            >
              <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
            </svg>
          </motion.div>

          {/* Live text */}
          <span className="text-sm italic">
            {text || 'Listening...'}
            <StreamingDots />
          </span>
        </div>
      </div>

      {/* User avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
        }}
      >
        <UserIcon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
      </div>
    </motion.div>
  );
}
