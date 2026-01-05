/**
 * Tool Execution Card
 * Displays tool execution progress and results in the agent timeline
 */

import { useState, useMemo, memo, Fragment } from 'react';
import { ToolExecution } from '../types/agent-types';
import { NoteCard } from '../../notes/components/NoteCard';
import { InlineNoteReference } from '../../chat/components/InlineNoteReference';
import { splitTextWithNoteReferences } from '../../../utils/note-reference-utils';
import { TimelineItem } from './TimelineItem';
import { AuthenticatedImage } from './AuthenticatedImage';

// Import from split modules
import {
  parseNotesResult,
  parseStatsResult,
  parseSingleNoteResult,
  parseGenericResult,
  parseImagesResult,
  StatsDisplay,
  GenericResponseDisplay,
} from './tool-execution-card';

interface ToolExecutionCardProps {
  execution: ToolExecution;
  isLast?: boolean;
}

/**
 * Get human-readable label for tool name
 */
function getToolLabel(name: string): string {
  switch (name) {
    // Notes - CRUD Operations
    case 'CreateNote':
      return 'Creating Note';
    case 'GetNote':
      return 'Reading Note';
    case 'UpdateNote':
      return 'Updating Note';
    case 'DeleteNote':
      return 'Deleting Note';
    case 'EditNote':
      return 'Editing Note';
    case 'DuplicateNote':
      return 'Duplicating Note';

    // Notes - Search Operations
    case 'SearchNotes':
      return 'Searching Notes';

    // Notes - Organization Operations
    case 'ListNotes':
      return 'Listing Notes';
    case 'SetNoteArchived':
      return 'Updating Archive Status';
    case 'MoveToFolder':
      return 'Moving to Folder';
    case 'GetOverview':
      return 'Getting Overview';

    // Notes - Analysis Operations
    case 'AnalyzeNote':
      return 'Analyzing Note';
    case 'CompareNotes':
      return 'Comparing Notes';
    case 'ViewNoteImages':
      return 'Viewing Note Images';
    case 'AnalyzeImage':
      return 'Analyzing Image';

    // Notes - Image Management
    case 'ManageContextImages':
      return 'Managing Images';

    // Notes - Version History
    case 'GetNoteVersionHistory':
      return 'Getting Version History';
    case 'GetVersion':
      return 'Getting Version';
    case 'CompareNoteVersions':
      return 'Comparing Versions';
    case 'RestoreNoteVersion':
      return 'Restoring Version';

    // Notes - Trash Management
    case 'ManageTrash':
      return 'Managing Trash';

    // Tool Discovery
    case 'search_tools':
      return 'Searching Tools';
    case 'list_tool_categories':
      return 'Listing Tool Categories';

    // Web Browsing
    case 'fetch_url':
      return 'Fetching Web Page';

    // Web Search (Grok)
    case 'web_search':
      return 'Searching the Web';
    case 'deep_search':
      return 'Deep Research';

    default:
      // Convert snake_case or camelCase to Title Case for unknown tools
      return name
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
  }
}

export const ToolExecutionCard = memo(function ToolExecutionCard({ execution }: ToolExecutionCardProps) {
  const isExecuting = execution.status === 'executing';
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse results from result if available
  const { notesResult, statsResult, singleNoteResult, genericResult, imagesResult } = useMemo(() => {
    if (!execution.result) {
      return { notesResult: null, statsResult: null, singleNoteResult: null, genericResult: null, imagesResult: null };
    }

    const notes = parseNotesResult(execution.result);
    if (notes) return { notesResult: notes, statsResult: null, singleNoteResult: null, genericResult: null, imagesResult: null };

    const stats = parseStatsResult(execution.result);
    if (stats) return { notesResult: null, statsResult: stats, singleNoteResult: null, genericResult: null, imagesResult: null };

    const singleNote = parseSingleNoteResult(execution.result);
    if (singleNote) return { notesResult: null, statsResult: null, singleNoteResult: singleNote, genericResult: null, imagesResult: null };

    const images = parseImagesResult(execution.result);
    if (images) return { notesResult: null, statsResult: null, singleNoteResult: null, genericResult: null, imagesResult: images };

    const generic = parseGenericResult(execution.result);
    if (generic) return { notesResult: null, statsResult: null, singleNoteResult: null, genericResult: generic, imagesResult: null };

    return { notesResult: null, statsResult: null, singleNoteResult: null, genericResult: null, imagesResult: null };
  }, [execution.result]);

  // Check if we have any parsed result
  const hasParsedResult = notesResult || statsResult || singleNoteResult || genericResult || imagesResult;

  return (
    <TimelineItem isLoading={isExecuting}>
      <div className="text-sm">
        <button
          onClick={() => { setIsExpanded(!isExpanded); }}
          className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
        >
          <span
            className="font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {getToolLabel(execution.tool)}
          </span>
          <span className="text-xs opacity-50" style={{ color: 'var(--text-tertiary)' }}>
            {execution.timestamp.toLocaleTimeString()}
          </span>

          {isExecuting ? (
            <span className="text-xs ml-1 opacity-70" style={{ color: 'var(--color-brand-500)' }}>
              Running...
            </span>
          ) : (
            <span className="text-xs ml-1 opacity-70" style={{ color: 'var(--success-text)' }}>
              Done
            </span>
          )}

          <svg
            className={`w-3 h-3 ml-1 transition-transform opacity-50 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {/* Stats result */}
            {statsResult && (
              <div>
                {statsResult.message && (
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {statsResult.message}
                  </div>
                )}
                <StatsDisplay stats={statsResult.statistics} />
              </div>
            )}

            {/* Notes result with NoteCards */}
            {notesResult && notesResult.notes.length > 0 && (
              <div>
                {notesResult.message && (
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {notesResult.message}
                  </div>
                )}
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {notesResult.notes.map((note, index) => (
                    <NoteCard
                      key={`${note.id}-${index}`}
                      note={{
                        id: note.id,
                        title: note.title,
                        content: note.matchedContent || note.content,
                        tags: note.tags,
                        isArchived: false,
                        createdAt: note.createdAt,
                        updatedAt: note.updatedAt,
                      }}
                      mode="search"
                      variant="micro"
                      relevanceScore={note.similarityScore ?? 0}
                      chunkContent={note.matchedContent}
                      chunkIndex={note.chunkIndex}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Single note result */}
            {singleNoteResult && (
              <div>
                {singleNoteResult.message && (
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {singleNoteResult.message}
                  </div>
                )}
                <NoteCard
                  note={{
                    id: singleNoteResult.note.id,
                    title: singleNoteResult.note.title,
                    content: singleNoteResult.note.content,
                    tags: singleNoteResult.note.tags,
                    isArchived: singleNoteResult.note.isArchived ?? false,
                    folder: singleNoteResult.note.folder,
                    createdAt: singleNoteResult.note.createdAt,
                    updatedAt: singleNoteResult.note.updatedAt,
                  }}
                  mode="display"
                  variant="micro"
                />
              </div>
            )}

            {/* Images result from ViewNoteImages */}
            {imagesResult && (
              <div>
                {imagesResult.message && (
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {imagesResult.message}
                  </div>
                )}
                {imagesResult.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {imagesResult.images.map((img, index) => (
                      <div
                        key={img.id || index}
                        className="relative overflow-hidden"
                        style={{
                          borderRadius: 'var(--chat-radius-sm)',
                          backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                        }}
                      >
                        <AuthenticatedImage
                          url={img.url}
                          alt={img.altText || img.description || `Image ${index + 1}`}
                          className="w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          title="Click to view full size"
                        />
                        {(img.description || img.fileName) && (
                          <div
                            className="p-2 text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {img.fileName && (
                              <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {img.fileName}
                              </div>
                            )}
                            {img.description && (
                              <div className="line-clamp-2 mt-0.5 opacity-80">
                                {img.description}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="p-3 text-xs"
                    style={{
                      borderRadius: 'var(--chat-radius-md)',
                      backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                      color: 'var(--text-tertiary)',
                      border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    }}
                  >
                    No images attached to this note.
                  </div>
                )}
              </div>
            )}

            {/* Generic response with message */}
            {genericResult && !statsResult && !notesResult && !singleNoteResult && !imagesResult && (
              <GenericResponseDisplay response={genericResult} />
            )}

            {/* Plain text result (for unparseable responses) */}
            {execution.result && !hasParsedResult && (() => {
              const segments = splitTextWithNoteReferences(execution.result);
              const hasNoteReferences = segments.length > 1 || segments[0]?.type === 'note-reference';

              return (
                <div
                  className="p-3 text-xs font-mono overflow-x-auto thin-scrollbar whitespace-pre-wrap"
                  style={{
                    borderRadius: 'var(--chat-radius-md)',
                    backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                    color: 'var(--text-secondary)',
                    border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)'
                  }}
                >
                  {hasNoteReferences ? (
                    <div className="space-y-1">
                      {segments.map((segment, index) => {
                        if (segment.type === 'note-reference' && segment.noteId) {
                          return (
                            <div key={`${segment.noteId}-${index}`} className="inline-block">
                              <InlineNoteReference
                                noteId={segment.noteId}
                                noteTitle={segment.noteTitle}
                                variant="subtle"
                              />
                            </div>
                          );
                        }
                        return <Fragment key={`text-${index}`}>{segment.content}</Fragment>;
                      })}
                    </div>
                  ) : (
                    execution.result
                  )}
                </div>
              );
            })()}

            {!execution.result && !isExecuting && (
              <div className="text-xs opacity-50 italic">No output</div>
            )}
          </div>
        )}
      </div>
    </TimelineItem>
  );
});
