/**
 * Mentions Dropdown Component
 * Shows note suggestions when typing @ in chat input
 * 
 * Can be used standalone with props or with ChatInputContext
 */

import type { Note } from '../../../notes/types/note';
import { useChatInputContext } from './ChatInputContext';

export interface ChatMentionsDropdownProps {
  /** Notes to display (optional if using context) */
  notes?: Note[];
  /** Currently selected index (optional if using context) */
  selectedIndex?: number;
  /** Callback when note is selected (optional if using context) */
  onSelect?: (note: Note) => void;
}

export function ChatMentionsDropdown({
  notes: propNotes,
  selectedIndex: propSelectedIndex,
  onSelect: propOnSelect,
}: ChatMentionsDropdownProps) {
  // Try to use context, but fall back to props
  let contextValue: ReturnType<typeof useChatInputContext> | null = null;
  try {
    contextValue = useChatInputContext();
  } catch {
    // Not in a ChatInput context, use props
  }

  const notes = propNotes ?? contextValue?.filteredNotes ?? [];
  const selectedIndex = propSelectedIndex ?? contextValue?.mentionIndex ?? 0;
  const onSelect = propOnSelect ?? contextValue?.onMentionSelect ?? (() => { });
  const showMentions = contextValue?.showMentions ?? true;

  if (notes.length === 0 || !showMentions) return null;

  return (
    <div
      className="mentions-dropdown absolute bottom-full left-4 right-4 mb-2 rounded-xl overflow-hidden z-50"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div
        className="px-3 py-2 text-xs font-medium"
        style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}
      >
        Notes
      </div>
      {notes.map((note, index) => (
        <button
          key={note.id}
          onClick={() => onSelect(note)}
          className={`w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${index === selectedIndex ? 'bg-white/10' : ''
            }`}
          style={{
            color: 'var(--text-primary)',
            backgroundColor: index === selectedIndex ? 'var(--color-primary-alpha)' : 'transparent',
          }}
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--color-brand-400)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="truncate">{note.title}</span>
          {note.tags.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-tertiary)' }}
            >
              {note.tags[0]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

