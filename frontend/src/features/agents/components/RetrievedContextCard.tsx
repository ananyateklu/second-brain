import { useState, useMemo } from 'react';
import { RetrievedNoteContext } from '../types/agent-types';
import { NoteCard } from '../../notes/components/NoteCard';
import { useNotes } from '../../notes/hooks/use-notes-query';
import { TimelineItem } from './TimelineItem';

interface RetrievedContextCardProps {
  retrievedNotes: RetrievedNoteContext[];
  isStreaming?: boolean;
}

export function RetrievedContextCard({ retrievedNotes, isStreaming = false }: RetrievedContextCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
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
    <TimelineItem isLoading={isStreaming}>
      <div className="text-xs">
        <button
          onClick={() => { setIsExpanded(!isExpanded); }}
          className="flex items-center gap-1.5 w-full text-left hover:opacity-80 transition-opacity"
        >
          <span 
            className="font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {retrievedNotes.length} note{retrievedNotes.length !== 1 ? 's' : ''} for context
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
    </TimelineItem>
  );
}
