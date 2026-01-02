/**
 * VoiceSidebar Component
 * Sidebar showing voice session history list
 *
 * Note: All controls (sidebar toggle, selection mode, new session) are in the main
 * header via VoicePageControls, matching the ChatSidebar pattern.
 */

import { MicrophoneIcon } from '@heroicons/react/24/outline';
import { VoiceSessionItem } from './VoiceSessionItem';
import type { VoiceSessionSummary } from '../types/voice-types';

interface VoiceSidebarProps {
  sessions: VoiceSessionSummary[];
  selectedSessionId: string | null;
  currentSessionId: string | null;
  isLoading: boolean;
  isSelectionMode?: boolean;
  selectedSessionIds?: Set<string>;
  onSelectSession: (sessionId: string | null) => void;
  onToggleSessionSelection?: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

/**
 * Sidebar showing voice session history.
 * No header - controls are in main header via VoicePageControls.
 */
export function VoiceSidebar({
  sessions,
  selectedSessionId,
  currentSessionId,
  isLoading,
  isSelectionMode = false,
  selectedSessionIds = new Set(),
  onSelectSession,
  onToggleSessionSelection,
  onDeleteSession,
}: VoiceSidebarProps) {
  return (
    <div
      className="flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-out w-72 md:w-[23rem]"
      style={{
        borderRightWidth: '0.5px',
        borderRightStyle: 'solid',
        borderRightColor: 'var(--border)',
        backgroundColor: 'var(--surface-card)',
      }}
    >
      {/* Session List */}
      <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 animate-pulse"
              >
                <div
                  className="w-10 h-10 rounded-xl"
                  style={{ backgroundColor: 'var(--surface-elevated)' }}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className="h-4 rounded"
                    style={{ backgroundColor: 'var(--surface-elevated)', width: '60%' }}
                  />
                  <div
                    className="h-3 rounded"
                    style={{ backgroundColor: 'var(--surface-elevated)', width: '40%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          // Empty state
          <div className="text-center py-12 px-4">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)',
              }}
            >
              <MicrophoneIcon
                className="w-8 h-8"
                style={{ color: 'var(--color-brand-400)' }}
              />
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              No voice sessions yet
            </p>
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Click the + button to start a voice conversation
            </p>
          </div>
        ) : (
          // Session list
          <div className="py-2">
            {/* Current/Active session indicator (if any) */}
            {currentSessionId && (
              <div className="px-4 py-2">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Current Session
                </span>
              </div>
            )}

            {sessions.map((session, index) => (
              <VoiceSessionItem
                key={session.id}
                session={session}
                isSelected={session.id === selectedSessionId}
                isCurrentSession={session.id === currentSessionId}
                isSelectionMode={isSelectionMode}
                isChecked={selectedSessionIds.has(session.id)}
                staggerIndex={index}
                onSelect={() => {
                  if (isSelectionMode) {
                    onToggleSessionSelection?.(session.id);
                  } else {
                    onSelectSession(session.id);
                  }
                }}
                onDelete={() => onDeleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
