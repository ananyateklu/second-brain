import { useState, useMemo } from 'react';
import { RetrievedNoteContext } from '../types/agent-types';
import { NoteCard } from '../../notes/components/NoteCard';
import { useNotes } from '../../notes/hooks/use-notes-query';

interface RetrievedContextCardProps {
  retrievedNotes: RetrievedNoteContext[];
  isStreaming?: boolean;
}

export function RetrievedContextCard({ retrievedNotes, isStreaming = false }: RetrievedContextCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: allNotes, isLoading } = useNotes();

  // Map retrieved notes to display data, joining with full note data when available
  const notesWithData = useMemo(() => {
    if (!retrievedNotes || retrievedNotes.length === 0) return [];

    return retrievedNotes
      .map((retrievedNote) => {
        // Try to find the full note for complete data
        const fullNote = allNotes?.find((n) => n.id === retrievedNote.noteId);

        // If full note is found, use it; otherwise create a minimal note object from retrieved data
        const noteToDisplay = fullNote || {
          id: retrievedNote.noteId,
          title: retrievedNote.title || 'Untitled Note',
          content: retrievedNote.preview || '',
          tags: retrievedNote.tags || [],
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          note: noteToDisplay,
          relevanceScore: retrievedNote.similarityScore,
          chunkContent: retrievedNote.preview,
          content: retrievedNote.preview,
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
      {/* Icon on the timeline - Search/Context icon */}
      <div 
        className={`absolute left-2.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center z-10 border transition-colors ${isStreaming ? 'animate-pulse' : ''}`}
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
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" 
          />
        </svg>
      </div>

      {/* Content */}
      <div className="text-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 w-full text-left hover:opacity-80 transition-opacity"
        >
          <span 
            className="font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {retrievedNotes.length} note{retrievedNotes.length !== 1 ? 's' : ''} for context
          </span>
          
          {isStreaming ? (
            <span className="text-[10px] opacity-70" style={{ color: 'var(--color-brand-500)' }}>
              Loading...
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              · <span style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>{topScore}%</span> match
            </span>
          )}

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
                {notesWithData.map(({ note, relevanceScore, content }) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    variant="micro"
                    relevanceScore={relevanceScore}
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
