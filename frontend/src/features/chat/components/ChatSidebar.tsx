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
        borderRightWidth: '0.5px',
        borderRightStyle: 'solid',
        borderRightColor: 'var(--border)',
      }}
    >
      {/* Conversations List - Scrollable with Virtual Scrolling */}
      <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar">
        {conversations.length === 0 ? (
          <div className="text-center py-8 px-4" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-2">Start a new chat to begin</p>
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

