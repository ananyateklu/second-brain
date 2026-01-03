/**
 * VoiceMessageBubble Component
 * Chat-style message display for voice transcripts
 *
 * Features:
 * - User messages: right-aligned with bubble background (matches chat MessageBubble)
 * - Assistant messages: left-aligned, no bubble (transparent like chat)
 * - Supports streaming state for live transcription
 * - Markdown rendering for assistant messages
 */

import { motion, useReducedMotion } from 'framer-motion';
import { MarkdownMessage } from '../../../components/MarkdownMessage';

interface VoiceMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  /** For user messages during live transcription */
  isTranscribing?: boolean;
}

export function VoiceMessageBubble({
  role,
  content,
  isStreaming = false,
  isTranscribing = false,
}: VoiceMessageBubbleProps) {
  const prefersReducedMotion = useReducedMotion();
  const isUser = role === 'user';
  const isLiveIndicator = isTranscribing && isUser;

  // Don't render empty assistant messages (unless streaming)
  if (!isUser && !content?.trim() && !isStreaming) {
    return null;
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`${isUser ? 'max-w-[85%]' : 'w-full'} rounded-2xl px-4 py-2.5 ${
          isUser ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={{
          backgroundColor: isUser
            ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
            : 'transparent',
          color: 'var(--text-primary)',
          ...(isUser && {
            border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }),
        }}
      >
        {isUser ? (
          // User messages are plain text (matches chat)
          <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
        ) : (
          // Assistant messages support markdown (matches chat)
          <>
            <MarkdownMessage content={content} />
            {/* Streaming indicator */}
            {isStreaming && (
              <span className="inline-flex ml-1">
                <StreamingDots />
              </span>
            )}
          </>
        )}

        {/* Live transcription indicator for user */}
        {isLiveIndicator && (
          <span className="inline-flex ml-1">
            <StreamingDots />
          </span>
        )}
      </motion.div>
    </div>
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
 * Typing indicator for when assistant is processing
 */
export function VoiceTypingIndicator() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex justify-start"
    >
      <div className="px-1 py-1">
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
    <div className="flex justify-end">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
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
      </motion.div>
    </div>
  );
}
