/**
 * Formatting Toolbar Component
 * Provides markdown formatting options for chat input
 */

import React from 'react';
import { FORMATTING_ACTIONS } from './formatting-actions';

// Re-export type for backward compatibility
export type { FormattingAction } from './formatting-actions';

export interface ChatFormattingToolbarProps {
  onFormat: (before: string, after: string) => void;
  actions?: FormattingAction[];
}

export function ChatFormattingToolbar({
  onFormat,
  actions = FORMATTING_ACTIONS,
}: ChatFormattingToolbarProps) {
  return (
    <div
      className="formatting-toolbar mb-2 flex items-center gap-1 px-3 py-2 rounded-xl"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {actions.map((action, index) => (
        <React.Fragment key={action.id}>
          {action.separator && index > 0 && (
            <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />
          )}
          <button
            onClick={() => onFormat(action.before, action.after)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            title={action.title}
            style={{ color: 'var(--text-secondary)' }}
          >
            {action.icon}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

