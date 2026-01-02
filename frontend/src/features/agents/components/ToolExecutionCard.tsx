import { useState, useMemo, memo, Fragment } from 'react';
import { ToolExecution, AgentNotesResponse } from '../types/agent-types';
import { NoteCard } from '../../notes/components/NoteCard';
import { InlineNoteReference } from '../../chat/components/InlineNoteReference';
import { splitTextWithNoteReferences } from '../../../utils/note-reference-utils';
import { TimelineItem } from './TimelineItem';
import { AuthenticatedImage } from './AuthenticatedImage';

interface ToolExecutionCardProps {
  execution: ToolExecution;
  isLast?: boolean;
}

// Stats response type
interface TagCount {
  name: string;
  count: number;
}

interface FolderCount {
  name: string;
  count: number;
}

interface NoteStatistics {
  totalNotes: number;
  activeNotes: number;
  archivedNotes: number;
  notesCreatedThisWeek: number;
  notesCreatedThisMonth: number;
  // These fields are only present in 'overview' type (type='all')
  notesWithTags?: number;
  notesInFolders?: number;
  uniqueTagCount?: number;
  uniqueFolderCount?: number;
  topTags?: TagCount[];
  topFolders?: FolderCount[];
}

interface StatsResponse {
  type: 'stats' | 'overview';
  message: string;
  statistics: NoteStatistics;
}

// Single note response type
interface SingleNoteResponse {
  type: 'note';
  message: string;
  note: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    isArchived?: boolean;
    folder?: string;
  };
}

// Generic success/error response
interface GenericResponse {
  type: string;
  message: string;
  [key: string]: unknown;
}

// Images response from ViewNoteImages tool (URL-based, no base64)
interface ImageInfo {
  id: string;
  url: string;  // URL to fetch image from API endpoint
  mediaType: string;
  fileName?: string;
  imageIndex: number;
  description?: string;
  altText?: string;
}

interface ImagesResponse {
  type: 'images';
  message: string;
  noteId: string;
  noteTitle: string;
  imageCount: number;
  images: ImageInfo[];
}

// Helper to parse note results from JSON
const parseNotesResult = (result: string): AgentNotesResponse | null => {
  try {
    const parsed: unknown = JSON.parse(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      parsed.type === 'notes' &&
      'notes' in parsed &&
      Array.isArray(parsed.notes)
    ) {
      return parsed as AgentNotesResponse;
    }
  } catch {
    // Not JSON or not a notes response
  }
  return null;
};

// Helper to parse stats results from JSON
// GetOverview returns type='overview' for full stats, type='stats' for stats-only
const parseStatsResult = (result: string): StatsResponse | null => {
  try {
    const parsed: unknown = JSON.parse(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      (parsed.type === 'stats' || parsed.type === 'overview') &&
      'statistics' in parsed
    ) {
      return parsed as StatsResponse;
    }
  } catch {
    // Not JSON or not a stats response
  }
  return null;
};

// Helper to parse single note result from JSON
const parseSingleNoteResult = (result: string): SingleNoteResponse | null => {
  try {
    const parsed: unknown = JSON.parse(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      parsed.type === 'note' &&
      'note' in parsed
    ) {
      return parsed as SingleNoteResponse;
    }
  } catch {
    // Not JSON or not a single note response
  }
  return null;
};

// Helper to parse generic JSON response
const parseGenericResult = (result: string): GenericResponse | null => {
  try {
    const parsed: unknown = JSON.parse(result);
    if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
      return parsed as GenericResponse;
    }
  } catch {
    // Not JSON
  }
  return null;
};

// Helper to parse images result from JSON
const parseImagesResult = (result: string): ImagesResponse | null => {
  try {
    const parsed: unknown = JSON.parse(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      parsed.type === 'images' &&
      'images' in parsed &&
      Array.isArray(parsed.images)
    ) {
      return parsed as ImagesResponse;
    }
  } catch {
    // Not JSON or not an images response
  }
  return null;
};

// SVG Icons for stats
const StatIcons = {
  notes: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  active: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  archived: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  week: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  month: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 2v4m12-4v4M4 8h16M4 8a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V10a2 2 0 00-2-2M4 8h16" />
    </svg>
  ),
  tag: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  bookmark: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  ),
  folder: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  folderSmall: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
};

// Stats display component
function StatsDisplay({ stats }: { stats: NoteStatistics }) {
  // Check if we have full overview data (vs stats-only)
  const hasFullOverview = stats.notesWithTags !== undefined;

  return (
    <div className="space-y-3">
      {/* Overview Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatItem label="Total Notes" value={stats.totalNotes} icon={StatIcons.notes} />
        <StatItem label="Active" value={stats.activeNotes} icon={StatIcons.active} />
        <StatItem label="Archived" value={stats.archivedNotes} icon={StatIcons.archived} />
        <StatItem label="This Week" value={stats.notesCreatedThisWeek} icon={StatIcons.week} />
        <StatItem label="This Month" value={stats.notesCreatedThisMonth} icon={StatIcons.month} />
        {hasFullOverview && (
          <StatItem label="With Tags" value={stats.notesWithTags ?? 0} icon={StatIcons.tag} />
        )}
      </div>

      {/* Additional Stats - only show if full overview */}
      {hasFullOverview && (
        <div className="grid grid-cols-2 gap-2">
          <StatItem label="Unique Tags" value={stats.uniqueTagCount ?? 0} icon={StatIcons.bookmark} />
          <StatItem label="Folders" value={stats.uniqueFolderCount ?? 0} icon={StatIcons.folder} />
        </div>
      )}

      {/* Top Tags */}
      {stats.topTags && stats.topTags.length > 0 && (
        <div>
          <div
            className="text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Top Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.topTags.map((tag) => (
              <span
                key={tag.name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <span>{tag.name}</span>
                <span
                  className="text-[10px] font-medium px-1 rounded-full"
                  style={{
                    backgroundColor: 'var(--color-brand-500)',
                    color: 'white',
                  }}
                >
                  {tag.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Folders */}
      {stats.topFolders && stats.topFolders.length > 0 && (
        <div>
          <div
            className="text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Top Folders
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.topFolders.map((folder) => (
              <span
                key={folder.name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  {StatIcons.folderSmall}
                </span>
                <span>{folder.name}</span>
                <span
                  className="text-[10px] font-medium px-1 rounded-full"
                  style={{
                    backgroundColor: 'var(--color-brand-500)',
                    color: 'white',
                  }}
                >
                  {folder.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual stat item component
function StatItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div
      className="p-2 rounded-lg"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--color-brand-500)' }}>{icon}</span>
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}
        </span>
      </div>
      <div
        className="text-[10px] mt-0.5"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </div>
    </div>
  );
}

// Generic message display for simple responses
function GenericResponseDisplay({ response }: { response: GenericResponse }) {
  const segments = splitTextWithNoteReferences(response.message);
  const hasNoteReferences = segments.length > 1 || segments[0]?.type === 'note-reference';

  return (
    <div
      className="p-3 rounded-lg"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="text-xs font-medium mb-1"
        style={{ color: 'var(--text-primary)' }}
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
          response.message
        )}
      </div>
      {/* Show additional properties if any */}
      {Object.keys(response).filter(k => !['type', 'message'].includes(k)).length > 0 && (
        <div className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {Object.entries(response)
            .filter(([key]) => !['type', 'message'].includes(key))
            .map(([key, value]) => {
              // Always stringify to handle all value types safely
              const displayValue = JSON.stringify(value);
              return (
                <div key={key} className="flex gap-2">
                  <span style={{ color: 'var(--text-tertiary)' }}>{key}:</span>
                  <span>{displayValue}</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export const ToolExecutionCard = memo(function ToolExecutionCard({ execution }: ToolExecutionCardProps) {
  const getToolLabel = (name: string) => {
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
  };

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
                      variant="micro"
                      relevanceScore={note.similarityScore}
                      chunkContent={note.matchedContent}
                      chunkIndex={note.chunkIndex}
                      showDeleteButton={false}
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
                  variant="micro"
                  showDeleteButton={false}
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
                        className="relative rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'var(--surface-card)',
                          border: '1px solid var(--border)',
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
                    className="p-3 rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--surface-card)',
                      color: 'var(--text-tertiary)',
                      border: '1px solid var(--border)',
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
                  className="p-3 rounded-lg text-xs font-mono overflow-x-auto thin-scrollbar whitespace-pre-wrap"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)'
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
