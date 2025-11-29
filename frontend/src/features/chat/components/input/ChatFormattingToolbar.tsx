/**
 * Formatting Toolbar Component
 * Provides markdown formatting options for chat input
 */

import React from 'react';

export interface FormattingAction {
  id: string;
  before: string;
  after: string;
  icon: React.ReactNode;
  title: string;
  separator?: boolean;
}

// Default formatting actions
export const FORMATTING_ACTIONS: FormattingAction[] = [
  {
    id: 'bold',
    before: '**',
    after: '**',
    title: 'Bold (Ctrl+B)',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
        <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
      </svg>
    ),
  },
  {
    id: 'italic',
    before: '*',
    after: '*',
    title: 'Italic (Ctrl+I)',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M10 4h4M14 4l-4 16M6 20h4" />
      </svg>
    ),
  },
  {
    id: 'code',
    before: '`',
    after: '`',
    title: 'Code',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: 'link',
    before: '[',
    after: '](url)',
    title: 'Link',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    separator: true,
  },
  {
    id: 'code-block',
    before: '```\n',
    after: '\n```',
    title: 'Code block',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    id: 'list',
    before: '- ',
    after: '',
    title: 'List',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
];

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

