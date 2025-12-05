/**
 * NoteVersionTimeline
 * Visual timeline component displaying note version history
 */

import { formatDistanceToNow } from 'date-fns';
import type { NoteVersion } from '../../../types/notes';

interface NoteVersionTimelineProps {
  versions: NoteVersion[];
  currentVersion: number;
  onCompare: (fromVersion: number, toVersion: number) => void;
  onRestore: (targetVersion: number) => void;
  isRestoring: boolean;
}

export function NoteVersionTimeline({
  versions,
  currentVersion,
  onCompare,
  onRestore,
  isRestoring,
}: NoteVersionTimelineProps) {
  return (
    <div className="space-y-4">
      {versions.map((version, index) => {
        const isCurrent = version.versionNumber === currentVersion;

        return (
          <div
            key={version.versionNumber}
            className="relative pl-6 pb-4"
          >
            {/* Timeline line */}
            {index < versions.length - 1 && (
              <div
                className="absolute left-2 top-6 w-0.5 h-full"
                style={{ backgroundColor: 'var(--border)' }}
              />
            )}

            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${isCurrent
                  ? 'bg-[var(--color-brand-600)] border-[var(--color-brand-600)]'
                  : 'bg-[var(--surface-card)] border-gray-400'
                }`}
            />

            {/* Version card */}
            <div
              className="rounded-lg border p-3 transition-all hover:shadow-md"
              style={{
                backgroundColor: isCurrent ? 'var(--color-brand-50)' : 'var(--surface-card)',
                borderColor: isCurrent ? 'var(--color-brand-200)' : 'var(--border)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Version {version.versionNumber}
                  {isCurrent && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-brand-600)] text-white">
                      Current
                    </span>
                  )}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDistanceToNow(new Date(version.validFrom), { addSuffix: true })}
                </span>
              </div>

              {version.changeSummary && (
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {version.changeSummary}
                </p>
              )}

              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                by {version.modifiedBy}
              </p>

              {/* Actions */}
              {!isCurrent && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onCompare(version.versionNumber, currentVersion)}
                    className="text-xs px-2 py-1 rounded border transition-colors hover:bg-[var(--surface-hover)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Compare
                  </button>
                  <button
                    onClick={() => onRestore(version.versionNumber)}
                    disabled={isRestoring}
                    className="text-xs px-2 py-1 rounded bg-[var(--color-brand-600)] text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-50"
                  >
                    {isRestoring ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
