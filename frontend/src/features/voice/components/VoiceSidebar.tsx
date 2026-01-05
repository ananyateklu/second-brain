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
      className="flex flex-col h-full flex-shrink-0 w-72 md:w-[23rem]"
      style={{
        transition: `all var(--chat-duration-slow) var(--chat-ease-out)`,
        borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      {/* Session List - Scrollable (matches ChatSidebar) */}
      <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-2" style={{ padding: 'var(--chat-space-lg)' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 animate-pulse"
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--chat-radius-md)',
                    backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  }}
                />
                <div className="flex-1 space-y-2">
                  <div
                    style={{
                      height: '16px',
                      width: '60%',
                      borderRadius: 'var(--chat-radius-xs)',
                      backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    }}
                  />
                  <div
                    style={{
                      height: '12px',
                      width: '40%',
                      borderRadius: 'var(--chat-radius-xs)',
                      backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    }}
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
