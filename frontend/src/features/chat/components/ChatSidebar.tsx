import { useMemo, useCallback, memo } from 'react';
import { ChatConversation } from '../types/chat';
import { ConversationListItem } from './ConversationListItem';

export interface ChatSidebarProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  isNewChat: boolean;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  // Selection state controlled by parent (ChatPage)
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  // Mobile drawer close callback
  onClose?: () => void;
}

/**
 * Sidebar showing conversation list.
 * Header controls (new chat, selection mode, etc.) are now in the main Header component.
 */
export const ChatSidebar = memo(function ChatSidebar({
  conversations,
  selectedConversationId,
  isNewChat,
  onSelectConversation,
  onDeleteConversation,
  isSelectionMode,
  selectedIds,
  onToggleSelection,
  onClose,
}: ChatSidebarProps) {
  // Sort conversations by updated date (matches VoiceSidebar pattern)
  const sortedConversations = useMemo(() =>
    [...conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    [conversations]
  );

  // Wrap selection handler to auto-close on mobile
  const handleSelectConversation = useCallback((id: string) => {
    onSelectConversation(id);
    // Auto-close drawer on mobile
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  }, [onSelectConversation, onClose]);

  return (
    <div
      className="flex flex-col h-full flex-shrink-0 w-72 md:w-[23rem]"
      style={{
        backgroundColor: 'transparent',
        borderRightWidth: '1px',
        borderRightStyle: 'solid',
        borderRightColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        transition: 'all var(--chat-duration-slow) var(--chat-ease-out)',
      }}
    >
      {/* Conversations List - Scrollable with Virtual Scrolling */}
      <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar">
        {conversations.length === 0 ? (
          <div className="text-center py-8 px-4" style={{ color: 'var(--text-secondary)' }}>
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--chat-radius-md)',
                backgroundColor: 'var(--chat-hover-bg)',
                border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
              }}
            >
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                style={{
                  width: 'var(--chat-icon-xl)',
                  height: 'var(--chat-icon-xl)',
                  color: 'var(--text-tertiary)',
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No conversations yet</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>Start a new chat to begin</p>
          </div>
        ) : (
          // Conversation list - direct render like VoiceSidebar
          sortedConversations.map((conv, index) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isSelected={
                selectedConversationId === conv.id ||
                (conv.id === 'placeholder-new-chat' && isNewChat && !selectedConversationId)
              }
              isSelectionMode={isSelectionMode}
              isChecked={selectedIds.has(conv.id)}
              onSelect={isSelectionMode ? onToggleSelection : handleSelectConversation}
              onDelete={onDeleteConversation}
              staggerIndex={index}
            />
          ))
        )}
      </div>
    </div>
  );
});

