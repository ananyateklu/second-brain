import { useState, useMemo } from 'react';
import { RetrievedNoteContext } from '../types/agent-types';
import { NoteCard } from '../../notes/components/NoteCard';
import { useNotes } from '../../notes/hooks/use-notes-query';

interface RetrievedContextCardProps {
  retrievedNotes: RetrievedNoteContext[];
  isStreaming?: boolean;
}

export function RetrievedContextCard({ retrievedNotes, isStreaming = false }: RetrievedContextCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: allNotes, isLoading } = useNotes();

  // Map retrieved notes to display data, joining with cached note metadata when available
  const notesWithData = useMemo(() => {
    if (!retrievedNotes || retrievedNotes.length === 0) return [];

    return retrievedNotes
      .map((retrievedNote) => {
        // Try to find cached note for additional metadata (isArchived, folder, etc.)
        const cachedNote = allNotes?.find((n) => n.id === retrievedNote.noteId);

        // Always use RAG data for content, enhance with cached metadata if available
        // NoteListItem from cache has summary but NOT content, so we must use RAG data
        const ragContent = retrievedNote.chunkContent || retrievedNote.preview || '';

        const noteToDisplay = {
          id: retrievedNote.noteId,
          title: retrievedNote.title || cachedNote?.title || 'Untitled Note',
          // Use RAG content since cached NoteListItem doesn't have content field
          content: ragContent,
          tags: retrievedNote.tags || cachedNote?.tags || [],
          // Use cached metadata if available
          isArchived: cachedNote?.isArchived ?? false,
          folder: cachedNote?.folder,
          summary: cachedNote?.summary,
          createdAt: cachedNote?.createdAt || new Date().toISOString(),
          updatedAt: cachedNote?.updatedAt || new Date().toISOString(),
        };

        return {
          note: noteToDisplay,
          relevanceScore: retrievedNote.relevanceScore,
          chunkContent: ragContent,
          content: ragContent,
        };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }, [allNotes, retrievedNotes]);

  if (retrievedNotes.length === 0) {
    return null;
  }

  const topScore = notesWithData.length > 0
    ? Math.round((notesWithData[0].relevanceScore || 0) * 100)
    : 0;

  return (
    <div className="relative pl-12 py-2 group">
      {/* Timeline icon - matches RetrievedNotesCard styling */}
      <div
        className={`absolute left-2.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${isStreaming ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: isStreaming ? 'var(--color-brand-500)' : 'var(--border)'
        }}
      >
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--color-brand-500)' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="text-xs">
        <button
          onClick={() => { setIsExpanded(!isExpanded); }}
          className="flex items-center gap-1.5 w-full text-left hover:opacity-80 transition-opacity"
        >
          <span
            className="font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {retrievedNotes.length} note{retrievedNotes.length !== 1 ? 's' : ''} retrieved
          </span>

          {/* Show percentage when we have scores, even during streaming */}
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            · <span style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>{topScore}%</span> match
          </span>

          <svg
            className={`w-2.5 h-2.5 ml-0.5 transition-transform opacity-50 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="mt-1.5">
            {isLoading ? (
              <div
                className="p-2 text-center text-[10px] rounded-lg border border-dashed"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Loading notes data...
              </div>
            ) : notesWithData.length === 0 ? (
              <div
                className="p-2 text-center text-[10px] rounded-lg border border-dashed"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Note data not available
              </div>
            ) : (
              <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2">
                {notesWithData.map(({ note, relevanceScore, chunkContent, content }) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    variant="micro"
                    relevanceScore={relevanceScore}
                    chunkContent={chunkContent}
                    content={content}
                    showDeleteButton={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
