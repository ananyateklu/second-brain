/**
 * NoteVersionTimeline
 * Visual timeline component displaying note version history
 *
 * Features:
 * - Animated timeline with staggered entrance
 * - Current version indicator with pulsing dot
 * - Change summary badges
 * - Quick actions for compare and restore
 */

import { memo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import type { NoteVersion } from '../../../types/notes';

interface NoteVersionTimelineProps {
  versions: NoteVersion[];
  currentVersion: number;
  onCompare: (fromVersion: number, toVersion: number) => void;
  onRestore: (targetVersion: number) => void;
  isRestoring: boolean;
}

// Get icon based on change type
function getChangeIcon(changeSummary: string | null) {
  if (!changeSummary) return null;

  const summary = changeSummary.toLowerCase();

  if (summary.includes('initial')) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    );
  }

  if (summary.includes('restored')) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    );
  }

  if (summary.includes('image')) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }

  if (summary.includes('title')) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10" />
      </svg>
    );
  }

  if (summary.includes('content')) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    );
  }

  if (summary.includes('tags')) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    );
  }

  if (summary.includes('archived')) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    );
  }

  if (summary.includes('folder')) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    );
  }

  // Default edit icon
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

// Badge colors
function getBadgeStyle(badge: string): { bg: string; text: string } {
  switch (badge) {
    case 'title':
      return { bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', text: 'var(--color-warning)' };
    case 'content':
      return { bg: 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)', text: 'var(--color-accent-blue)' };
    case 'tags':
      return { bg: 'color-mix(in srgb, var(--color-accent-purple) 15%, transparent)', text: 'var(--color-accent-purple)' };
    case 'archived':
      return { bg: 'var(--surface-elevated)', text: 'var(--text-secondary)' };
    case 'folder':
      return { bg: 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)', text: 'var(--color-brand-500)' };
    case 'images':
      return { bg: 'color-mix(in srgb, var(--color-accent-teal) 15%, transparent)', text: 'var(--color-accent-teal)' };
    case 'created':
      return { bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)', text: 'var(--color-success)' };
    case 'restored':
      return { bg: 'color-mix(in srgb, var(--color-brand-400) 15%, transparent)', text: 'var(--color-brand-400)' };
    default:
      return { bg: 'var(--surface-elevated)', text: 'var(--text-secondary)' };
  }
}

// Highlight keywords in change summary with badge styling
function renderStyledSummary(summary: string) {
  // Sort keywords by length (longest first) to avoid overlapping matches
  const keywords = ['archived', 'content', 'folder', 'images', 'title', 'image', 'tags', 'unarchived', 'restored' ];
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const summaryLower = summary.toLowerCase();

  // Find all keyword positions
  const matches: { index: number; keyword: string; endIndex: number }[] = [];
  keywords.forEach(keyword => {
    let idx = summaryLower.indexOf(keyword, 0);
    while (idx !== -1) {
      matches.push({ index: idx, keyword, endIndex: idx + keyword.length });
      idx = summaryLower.indexOf(keyword, idx + 1);
    }
  });

  // Sort by position, then by length (longer matches first)
  matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return (b.endIndex - b.index) - (a.endIndex - a.index);
  });

  // Remove overlapping matches (keep the first/longest one at each position)
  const filteredMatches: { index: number; keyword: string; endIndex: number }[] = [];
  let lastEndIndex = -1;
  matches.forEach(match => {
    if (match.index >= lastEndIndex) {
      filteredMatches.push(match);
      lastEndIndex = match.endIndex;
    }
  });

  // Build styled parts
  filteredMatches.forEach(({ index, keyword, endIndex }, i) => {
    // Add text before keyword
    if (index > lastIndex) {
      parts.push(summary.substring(lastIndex, index));
    }

    // Add styled keyword
    const actualText = summary.substring(index, endIndex);
    const badgeType = keyword === 'image' ? 'images' : keyword;
    const style = getBadgeStyle(badgeType);

    parts.push(
      <span
        key={`${keyword}-${i}`}
        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium mx-0.5"
        style={{
          backgroundColor: style.bg,
          color: style.text,
        }}
      >
        {actualText}
      </span>
    );

    lastIndex = endIndex;
  });

  // Add remaining text
  if (lastIndex < summary.length) {
    parts.push(summary.substring(lastIndex));
  }

  return parts.length > 0 ? parts : summary;
}

// Get source display info
function getSourceInfo(source: string): { label: string; icon: React.ReactNode; color: string } {
  switch (source) {
    case 'web':
      return {
        label: 'Web',
        icon: (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        ),
        color: 'var(--color-brand-500)',
      };
    case 'agent':
      return {
        label: 'Agent',
        icon: (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        color: 'var(--color-accent-purple)',
      };
    case 'ios_notes':
      return {
        label: 'iOS Import',
        icon: (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
        color: 'var(--color-accent-blue)',
      };
    case 'import':
      return {
        label: 'Imported',
        icon: (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        ),
        color: 'var(--color-success)',
      };
    default:
      return {
        label: source || 'Unknown',
        icon: (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: 'var(--text-tertiary)',
      };
  }
}

export const NoteVersionTimeline = memo(function NoteVersionTimeline({
  versions,
  currentVersion,
  onCompare,
  onRestore,
  isRestoring,
}: NoteVersionTimelineProps) {
  return (
    <div className="relative">
      {/* Main timeline line */}
      <div
        className="absolute left-[11px] top-3 bottom-3 w-[2px] rounded-full"
        style={{ backgroundColor: 'var(--border)' }}
      />

      <div className="space-y-0.5">
        {versions.map((version, index) => {
          const isCurrent = version.versionNumber === currentVersion;

          return (
            <div
              key={version.versionNumber}
              className="relative pl-9 py-1.5 group"
              style={{
                animation: `fadeInSlideUp 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-[6px] top-2.5 w-[12px] h-[12px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isCurrent ? 'scale-110' : 'group-hover:scale-110'
                  }`}
                style={{
                  backgroundColor: isCurrent ? 'var(--color-brand-600)' : 'var(--surface-card)',
                  borderColor: isCurrent ? 'var(--color-brand-600)' : 'var(--border)',
                  boxShadow: isCurrent ? '0 0 0 3px color-mix(in srgb, var(--color-brand-600) 20%, transparent)' : 'none',
                }}
              >
                {isCurrent && (
                  <div
                    className="w-[4px] h-[4px] rounded-full animate-pulse"
                    style={{ backgroundColor: 'white' }}
                  />
                )}
              </div>

              {/* Version card */}
              <div
                className="rounded-lg p-2 transition-all duration-200 group-hover:shadow-md"
                style={{
                  backgroundColor: isCurrent
                    ? 'color-mix(in srgb, var(--color-brand-600) 8%, var(--surface-card))'
                    : 'var(--surface-card)',
                  border: isCurrent
                    ? '1px solid color-mix(in srgb, var(--color-brand-500) 30%, transparent)'
                    : '1px solid var(--border)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Version {version.versionNumber}
                    </span>
                    {isCurrent && (
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                        style={{
                          backgroundColor: 'var(--color-brand-600)',
                          color: 'white',
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[10px]"
                    style={{ color: 'var(--text-tertiary)' }}
                    title={format(new Date(version.validFrom), 'PPpp')}
                  >
                    {formatDistanceToNow(new Date(version.validFrom), { addSuffix: true })}
                  </span>
                </div>

                {/* Change summary with icon */}
                {version.changeSummary && (
                  <div className="flex items-start gap-1.5 mb-1.5">
                    <div
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {getChangeIcon(version.changeSummary)}
                    </div>
                    <p
                      className="text-[10px] leading-relaxed flex flex-wrap items-center"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {renderStyledSummary(version.changeSummary)}
                    </p>
                  </div>
                )}

                {/* Source, Images, and Modified by */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Source badge */}
                  {(() => {
                    const sourceInfo = getSourceInfo(version.source);
                    return (
                      <div
                        className="flex items-center gap-1 text-[9px] px-1 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${sourceInfo.color} 12%, transparent)`,
                          color: sourceInfo.color,
                        }}
                        title={`Source: ${sourceInfo.label}`}
                      >
                        {sourceInfo.icon}
                        <span className="font-medium">{sourceInfo.label}</span>
                      </div>
                    );
                  })()}

                  {/* Image count indicator */}
                  {version.imageIds && version.imageIds.length > 0 && (
                    <div
                      className="flex items-center gap-1 text-[9px] px-1 py-0.5 rounded-md"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-accent-teal) 12%, transparent)',
                        color: 'var(--color-accent-teal)',
                      }}
                      title={`${version.imageIds.length} image${version.imageIds.length !== 1 ? 's' : ''} attached`}
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">{version.imageIds.length}</span>
                    </div>
                  )}

                  {/* Modified by */}
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-2.5 h-2.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span
                      className="text-[9px] truncate"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {version.modifiedBy || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!isCurrent && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { onCompare(version.versionNumber, currentVersion); }}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-[var(--surface-card)] hover:border-[var(--border-strong)]"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      Compare
                    </button>
                    <button
                      onClick={() => { onRestore(version.versionNumber); }}
                      disabled={isRestoring}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:bg-[var(--color-brand-700)]"
                      style={{
                        backgroundColor: 'var(--color-brand-600)',
                        color: 'white',
                      }}
                    >
                      {isRestoring ? (
                        <>
                          <svg
                            className="w-3 h-3 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Restoring...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                            />
                          </svg>
                          Restore
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
