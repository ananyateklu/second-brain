import { ChatConversation } from '../types/chat';
import { ConversationListItem } from './ConversationListItem';

export interface ChatSidebarProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  isNewChat: boolean;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

/**
 * Sidebar showing conversation list with new chat button.
 */
export function ChatSidebar({
  conversations,
  selectedConversationId,
  isNewChat,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  onToggleSidebar,
}: ChatSidebarProps) {
  return (
    <div
      className="w-64 md:w-80 border-r flex flex-col h-full flex-shrink-0"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Sidebar Header - Fixed */}
      <div
        className="flex-shrink-0 px-4 py-[1.17rem] border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Conversations
        </h2>
        <div className="flex items-center gap-2">
          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Hide sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-border)',
            }}
            title="New Chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conversations List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-400)_transparent] [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--color-brand-400)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--color-brand-300)]">
        {conversations.length === 0 ? (
          <div className="text-center py-8 px-4" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-2">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="pb-2">
            {conversations
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={
                    selectedConversationId === conv.id ||
                    (conv.id === 'placeholder-new-chat' && isNewChat && !selectedConversationId)
                  }
                  onSelect={onSelectConversation}
                  onDelete={onDeleteConversation}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

