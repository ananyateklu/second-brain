/**
 * VoiceSidebar Component
 * Sidebar showing voice session history list
 *
 * Note: All controls (sidebar toggle, selection mode, new session) are in the main
 * header via VoicePageControls, matching the ChatSidebar pattern.
 */

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
      }}
    >
      {/* Session List - Scrollable (matches ChatSidebar) */}
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
          // Empty state (matches ChatSidebar)
          <div className="text-center py-8 px-4" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">No voice sessions yet</p>
            <p className="text-xs mt-2">Start a new session to begin</p>
          </div>
        ) : (
          // Session list - no wrapper div (matches ChatSidebar)
          sessions.map((session, index) => (
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
          ))
        )}
      </div>
    </div>
  );
}
