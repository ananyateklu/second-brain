import { useState, useMemo } from 'react';
import { ToolExecution, AgentNotesResponse } from '../types/agent-types';
import { NoteCard } from '../../notes/components/NoteCard';

interface ToolExecutionCardProps {
  execution: ToolExecution;
}

// Helper to parse note results from JSON
const parseNotesResult = (result: string): AgentNotesResponse | null => {
  try {
    const parsed = JSON.parse(result);
    if (parsed.type === 'notes' && Array.isArray(parsed.notes)) {
      return parsed as AgentNotesResponse;
    }
  } catch {
    // Not JSON or not a notes response
  }
  return null;
};

export function ToolExecutionCard({ execution }: ToolExecutionCardProps) {
  const getToolIcon = (name: string) => {
    switch (name) {
      case 'CreateNote':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'SearchNotes':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'SemanticSearch':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'UpdateNote':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'GetNote':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'ListRecentNotes':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  const getToolLabel = (name: string) => {
    switch (name) {
      case 'CreateNote':
        return 'Creating Note';
      case 'SearchNotes':
        return 'Searching Notes';
      case 'SemanticSearch':
        return 'Semantic search (RAG)';
      case 'UpdateNote':
        return 'Updating Note';
      case 'GetNote':
        return 'Reading Note';
      case 'ListRecentNotes':
        return 'Listing Notes';
      default:
        return name;
    }
  };

  const isExecuting = execution.status === 'executing';
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse notes from result if available
  const notesResult = useMemo(() => {
    if (execution.result) {
      return parseNotesResult(execution.result);
    }
    return null;
  }, [execution.result]);

  return (
    <div
      className="my-3 p-3 rounded-3xl border transition-all duration-200"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface-card) 80%, var(--color-brand-500) 5%)',
        borderColor: isExecuting ? 'var(--color-brand-500)' : 'var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`${isExecuting ? 'animate-pulse' : ''}`}
          style={{ color: 'var(--color-brand-400)' }}
        >
          {getToolIcon(execution.tool)}
        </span>
        <span
          className="font-medium text-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          {getToolLabel(execution.tool)}
        </span>
        {isExecuting ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full animate-pulse"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 20%, transparent)',
              color: 'var(--color-brand-400)',
            }}
          >
            Executing...
          </span>
        ) : (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--success-bg) 50%, transparent)',
              color: 'var(--success-text)',
            }}
          >
            Done
          </span>
        )}
        <span
          className="text-xs ml-auto"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {execution.timestamp.toLocaleTimeString()}
        </span>
      </div>

      {/* Notes result with NoteCards */}
      {notesResult && notesResult.notes.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm mb-2 hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {notesResult.message}
          </button>

          {isExpanded && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mt-2">
              {notesResult.notes.map((note, index) => (
                <NoteCard
                  key={`${note.id}-${index}`}
                  note={{
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    tags: note.tags,
                    isArchived: false,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt,
                  }}
                  variant="compact"
                  showDeleteButton={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plain text result (for non-note responses) */}
      {execution.result && !notesResult && (
        <div
          className="text-sm whitespace-pre-wrap pl-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          {execution.result}
        </div>
      )}
    </div>
  );
}
