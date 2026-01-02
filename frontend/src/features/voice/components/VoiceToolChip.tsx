/**
 * VoiceToolChip Component
 * Animated chip showing tool execution status above the waveform
 *
 * Animation sequence:
 * 1. Enter: Slide in from right, scale up
 * 2. Executing: Pulse animation, spinner icon
 * 3. Complete: Brief checkmark flash, then slide out left
 * 4. Remove: AnimatePresence handles unmount
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';
import type { VoiceToolExecution } from '../types/voice-types';
import { getToolLabel, getToolLabelPastTense, getToolIconPath } from '../utils/voice-utils';

interface VoiceToolChipProps {
  tool: VoiceToolExecution;
  /** Called when exit animation finishes (for cleanup) */
  onComplete?: () => void;
  /** Delay before auto-remove after completion (ms) */
  removeDelay?: number;
}

// Render tool icon using shared path data
function ToolIcon({ toolName, className = '' }: { toolName: string; className?: string }) {
  const iconPath = getToolIconPath(toolName);
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath.d} />
      {iconPath.d2 && (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath.d2} />
      )}
    </svg>
  );
}

// Spinner icon for executing state
function SpinnerIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function VoiceToolChip({
  tool,
  onComplete,
  removeDelay = 1500,
}: VoiceToolChipProps) {
  const prefersReducedMotion = useReducedMotion();
  const [shouldRemove, setShouldRemove] = useState(false);
  const isCompleted = tool.status === 'completed';
  const isFailed = tool.status === 'failed';
  const isExecuting = tool.status === 'executing';

  // Auto-remove after completion
  useEffect(() => {
    if (!isCompleted && !isFailed) return;
    const timer = setTimeout(() => {
      setShouldRemove(true);
    }, removeDelay);
    return () => clearTimeout(timer);
  }, [isCompleted, isFailed, removeDelay]);

  // Notify parent when fully removed
  useEffect(() => {
    if (!shouldRemove || !onComplete) return;
    // Small delay to ensure exit animation has time to start
    const timer = setTimeout(onComplete, 100);
    return () => clearTimeout(timer);
  }, [shouldRemove, onComplete]);

  const label = isCompleted || isFailed ? getToolLabelPastTense(tool.toolName) : getToolLabel(tool.toolName);

  // Color based on status
  const getStatusColor = () => {
    if (isFailed) return 'var(--color-error)';
    if (isCompleted) return 'var(--color-success)';
    return 'var(--color-brand-500)';
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      {!shouldRemove && (
        <motion.div
          key={tool.toolId}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 50, scale: 0.8 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -50, scale: 0.8 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 400, damping: 25 }
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Icon with animation */}
          <motion.div
            className="flex items-center justify-center"
            style={{ color: getStatusColor() }}
            animate={
              isExecuting && !prefersReducedMotion
                ? { rotate: 360 }
                : { rotate: 0 }
            }
            transition={
              isExecuting && !prefersReducedMotion
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : { duration: 0.2 }
            }
          >
            {isCompleted ? (
              <CheckIcon className="w-3.5 h-3.5" />
            ) : isExecuting ? (
              <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ToolIcon toolName={tool.toolName} className="w-3.5 h-3.5" />
            )}
          </motion.div>

          {/* Label */}
          <span
            className="text-xs font-medium whitespace-nowrap"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </span>

          {/* Status indicator */}
          {isExecuting && (
            <motion.div
              animate={prefersReducedMotion ? {} : { opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: getStatusColor() }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Container for multiple tool chips with staggered animations
 */
interface VoiceToolChipsContainerProps {
  tools: VoiceToolExecution[];
  onToolComplete?: (toolId: string) => void;
}

export function VoiceToolChipsContainer({
  tools,
  onToolComplete,
}: VoiceToolChipsContainerProps) {
  // Filter to show only executing and recently completed tools
  const visibleTools = tools.filter(
    (tool) => tool.status === 'executing' || tool.status === 'completed' || tool.status === 'failed'
  );

  if (visibleTools.length === 0) return null;

  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="popLayout">
        {visibleTools.map((tool, index) => (
          <motion.div
            key={tool.toolId}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: index * 0.05, // Stagger
            }}
          >
            <VoiceToolChip
              tool={tool}
              onComplete={() => onToolComplete?.(tool.toolId)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
