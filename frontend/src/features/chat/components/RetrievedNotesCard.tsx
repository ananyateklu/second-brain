import { useState, useMemo } from 'react';
import { RagContextNote } from '../../../types/rag';
import { RetrievedNoteContext } from '../../../types/agent';
import { NoteCard } from '../../notes/components/NoteCard';
import { useNotes } from '../../notes/hooks/use-notes-query';

/**
 * Normalized note structure for internal use
 */
interface NormalizedNote {
  noteId: string;
  title: string;
  preview: string;
  tags: string[];
  relevanceScore: number;
  chunkContent?: string;
  content?: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
  chunkIndex?: number;
}

interface RetrievedNotesCardProps {
  notes: RagContextNote[] | RetrievedNoteContext[];
  isStreaming?: boolean;
}

/**
 * Type guard to check if notes are RagContextNote[]
 */
function isRagContextNotes(notes: RagContextNote[] | RetrievedNoteContext[]): notes is RagContextNote[] {
  if (notes.length === 0) return false;
  return 'chunkContent' in notes[0] && 'chunkIndex' in notes[0];
}

/**
 * Normalize different note types to a common structure
 */
function normalizeNotes(notes: RagContextNote[] | RetrievedNoteContext[]): NormalizedNote[] {
  if (isRagContextNotes(notes)) {
    // Handle RagContextNote[]
    return notes.map(note => ({
      noteId: note.noteId,
      title: note.title,
      preview: note.chunkContent,
      tags: note.tags,
      relevanceScore: note.relevanceScore,
      chunkContent: note.chunkContent,
      content: note.content,
      createdOn: note.createdOn,
      modifiedOn: note.modifiedOn,
      chunkIndex: note.chunkIndex,
    }));
  } else {
    // Handle RetrievedNoteContext[]
    return notes.map(note => ({
      noteId: note.noteId,
      title: note.title,
      preview: note.preview,
      tags: note.tags,
      relevanceScore: note.relevanceScore,
      chunkContent: note.chunkContent ?? note.preview,
      content: note.preview,
      chunkIndex: note.chunkIndex,
    }));
  }
}

/**
 * Unified component to display retrieved notes from RAG or agent context injection.
 * Integrates with ProcessTimeline for consistent visual style across agent and normal RAG modes.
 */
export function RetrievedNotesCard({ notes, isStreaming = false }: RetrievedNotesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: allNotes, isLoading } = useNotes();

  // Normalize and deduplicate notes
  const notesWithData = useMemo(() => {
    if (!notes || notes.length === 0) return [];

    const normalized = normalizeNotes(notes);

    // Group by noteId to deduplicate
    const groupedByNoteId = new Map<string, NormalizedNote[]>();

    for (const note of normalized) {
      const existing = groupedByNoteId.get(note.noteId);
      if (existing) {
        existing.push(note);
      } else {
        groupedByNoteId.set(note.noteId, [note]);
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
          content: bestChunk.content || bestChunk.preview || '',
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
        };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }, [allNotes, notes]);

  if (!notes || notes.length === 0) {
    return null;
  }

  const uniqueNoteCount = notesWithData.length;
  const totalChunkCount = notes.length;
  const topScore = notesWithData.length > 0
    ? Math.round((notesWithData[0].relevanceScore || 0) * 100)
    : 0;

  return (
    <div className="relative pl-12 py-2 group">
      {/* Timeline icon */}
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
            {uniqueNoteCount} note{uniqueNoteCount !== 1 ? 's' : ''} retrieved
            {totalChunkCount > uniqueNoteCount && (
              <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}> · {totalChunkCount} chunks</span>
            )}
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
        )}
      </div>
    </div>
  );
}

