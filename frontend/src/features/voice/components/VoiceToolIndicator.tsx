/**
 * VoiceToolIndicator Component
 * Small animated badge showing current tool execution status near the voice orb
 */

import { motion, AnimatePresence } from 'framer-motion';
import { getToolLabel, getToolIconPath } from '../utils/voice-utils';

interface VoiceToolIndicatorProps {
  isExecuting: boolean;
  toolName: string | null;
  className?: string;
}

// Render tool icon using shared path data
function ToolIcon({ toolName }: { toolName: string }): React.ReactNode {
  const iconPath = getToolIconPath(toolName);
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath.d} />
      {iconPath.d2 && (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath.d2} />
      )}
    </svg>
  );
}

export function VoiceToolIndicator({ isExecuting, toolName, className = '' }: VoiceToolIndicatorProps) {
  return (
    <AnimatePresence>
      {isExecuting && toolName && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${className}`}
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Spinning indicator */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="flex items-center justify-center"
            style={{ color: 'var(--color-brand-500)' }}
          >
            <ToolIcon toolName={toolName} />
          </motion.div>

          {/* Tool label */}
          <span
            className="text-xs font-medium whitespace-nowrap"
            style={{ color: 'var(--text-secondary)' }}
          >
            {getToolLabel(toolName)}
          </span>

          {/* Pulsing dot */}
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-brand-500)' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
