/**
 * Tool Execution Card Helper Components
 * Sub-components for displaying stats, generic responses, and icons
 */

import { Fragment } from 'react';
import { InlineNoteReference } from '../../../chat/components/InlineNoteReference';
import { splitTextWithNoteReferences } from '../../../../utils/note-reference-utils';
import type { NoteStatistics, GenericResponse } from './tool-execution-card.types';

// SVG Icons for stats
export const StatIcons = {
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
