/**
 * Tool Execution Card Helper Components
 * Sub-components for displaying stats, generic responses, and icons
 */

import { Fragment } from 'react';
import { InlineNoteReference } from '../../../../shared/components';
import { splitTextWithNoteReferences } from '../../../../utils/note-reference-utils';
import type { NoteStatistics, GenericResponse } from './tool-execution-card.types';
import { StatIcons } from './stat-icons';

// Individual stat item component
export function StatItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div
      className="p-2"
      style={{
        borderRadius: 'var(--chat-radius-sm)',
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
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

// Stats display component
export function StatsDisplay({ stats }: { stats: NoteStatistics }) {
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
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  color: 'var(--text-primary)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  color: 'var(--text-primary)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
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

// Generic message display for simple responses
export function GenericResponseDisplay({ response }: { response: GenericResponse }) {
  const segments = splitTextWithNoteReferences(response.message);
  const hasNoteReferences = segments.length > 1 || segments[0]?.type === 'note-reference';

  return (
    <div
      className="p-3"
      style={{
        borderRadius: 'var(--chat-radius-md)',
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
