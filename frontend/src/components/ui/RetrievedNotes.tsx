import { useState, useMemo } from 'react';
import { RagContextNote } from '../../features/rag/types';
import { NoteCard } from '../../features/notes/components/NoteCard';
import { useNotes } from '../../features/notes/hooks/use-notes-query';

interface RetrievedNotesProps {
  notes: RagContextNote[];
}

export function RetrievedNotes({ notes }: RetrievedNotesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: allNotes, isLoading } = useNotes();

  // Group notes by noteId and deduplicate, keeping track of chunk count
  const notesWithData = useMemo(() => {
    if (!notes) return [];

    // Group by noteId
    const groupedByNoteId = new Map<string, RagContextNote[]>();

    for (const retrievedNote of notes) {
      const existing = groupedByNoteId.get(retrievedNote.noteId);
      if (existing) {
        existing.push(retrievedNote);
      } else {
        groupedByNoteId.set(retrievedNote.noteId, [retrievedNote]);
      }
    }

    // Convert to array with aggregated data
    return Array.from(groupedByNoteId.entries())
      .map(([noteId, chunks]) => {
        // Get the chunk with the highest relevance score
        const bestChunk = chunks.reduce((best, current) =>
          (current.relevanceScore || 0) > (best.relevanceScore || 0) ? current : best
          , chunks[0]);

        // Try to find the full note for complete data
        const fullNote = allNotes?.find((n) => n.id === noteId);

        // If full note is found, use it; otherwise create a minimal note object from retrieved data
        const noteToDisplay = fullNote || {
          id: noteId,
          title: bestChunk.title || 'Untitled Note',
          content: bestChunk.content || bestChunk.chunkContent || '',
          tags: bestChunk.tags || [],
          isArchived: false,
          createdAt: bestChunk.createdOn || new Date().toISOString(),
          updatedAt: bestChunk.modifiedOn || new Date().toISOString(),
        };

        return {
          note: noteToDisplay,
          relevanceScore: bestChunk.relevanceScore,
          chunkCount: chunks.length,
          chunkContent: bestChunk.chunkContent,
          content: bestChunk.content,
          createdOn: bestChunk.createdOn,
          modifiedOn: bestChunk.modifiedOn,
        };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }, [allNotes, notes]);

  // Count unique notes for the header
  const uniqueNoteCount = notesWithData.length;
  const totalChunkCount = notes?.length || 0;

  if (!notes || notes.length === 0) {
    return null;
  }

  const topScore = notesWithData.length > 0
    ? Math.round((notesWithData[0].relevanceScore || 0) * 100)
    : 0;

  return (
    <div className="my-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center justify-between w-full p-3 rounded-3xl border transition-all duration-200 hover:shadow-md"
        style={{
          backgroundColor: isExpanded
            ? 'var(--surface-card)'
            : 'color-mix(in srgb, var(--surface-card) 50%, transparent)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full transition-transform group-hover:scale-110"
            style={{
              backgroundColor: 'var(--color-brand-100)',
              color: 'var(--color-brand-600)'
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Found {uniqueNoteCount} relevant note{uniqueNoteCount !== 1 ? 's' : ''}
              {totalChunkCount > uniqueNoteCount && (
                <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}> ({totalChunkCount} chunks)</span>
              )}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Top match: <span style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>{topScore}%</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 flex items-center justify-center rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            style={{ backgroundColor: 'var(--surface-hover)' }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--text-secondary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
          }`}
      >
        <div className="min-h-0 p-3">
          {isLoading ? (
            <div className="p-4 text-center text-sm rounded-3xl border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Loading notes data...
            </div>
          ) : notesWithData.length === 0 ? (
            <div className="p-4 text-center text-sm rounded-3xl border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Note data not available
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {notesWithData.map(({ note, relevanceScore, chunkCount, content, createdOn }) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  variant="micro"
                  relevanceScore={relevanceScore}
                  chunkCount={chunkCount}
                  content={content}
                  createdOn={createdOn}
                  showDeleteButton={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
