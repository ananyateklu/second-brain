import { ChatConversation } from '../types/chat';
import { VirtualizedConversationList } from './VirtualizedConversationList';

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
}

/**
 * Sidebar showing conversation list.
 * Header controls (new chat, selection mode, etc.) are now in the main Header component.
 */
export function ChatSidebar({
  conversations,
  selectedConversationId,
  isNewChat,
  onSelectConversation,
  onDeleteConversation,
  isSelectionMode,
  selectedIds,
  onToggleSelection,
}: ChatSidebarProps) {
  return (
    <div
      className="flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-out w-72 md:w-[23rem]"
      style={{
        backgroundColor: 'transparent',
        borderRightWidth: '1px',
        borderRightStyle: 'solid',
        borderRightColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      {/* Conversations List - Scrollable with Virtual Scrolling */}
      <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar">
        {conversations.length === 0 ? (
          <div className="text-center py-12 px-6" style={{ color: 'var(--text-tertiary)' }}>
            <div
              className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No conversations yet</p>
            <p className="text-xs mt-1.5">Start a new chat to begin</p>
          </div>
        ) : (
          <VirtualizedConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            isNewChat={isNewChat}
            isSelectionMode={isSelectionMode}
            selectedIds={selectedIds}
            onSelectConversation={onSelectConversation}
            onDeleteConversation={onDeleteConversation}
            onToggleSelection={onToggleSelection}
            enableVirtualization={conversations.length >= 30}
          />
        )}
      </div>
    </div>
  );
}

