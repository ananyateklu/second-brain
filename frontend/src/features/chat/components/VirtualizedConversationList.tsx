import { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatConversation } from '../types/chat';
import { ConversationListItem } from './ConversationListItem';

interface VirtualizedConversationListProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  isNewChat: boolean;
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onToggleSelection: (id: string) => void;
  /** Enable virtualization (recommended for 30+ conversations) */
  enableVirtualization?: boolean;
}

// Estimated conversation item height
const ITEM_HEIGHT = 72;

/**
 * VirtualizedConversationList - A performant conversation list that supports 
 * virtual scrolling for large datasets.
 */
export const VirtualizedConversationList = memo(function VirtualizedConversationList({
  conversations,
  selectedConversationId,
  isNewChat,
  isSelectionMode,
  selectedIds,
  onSelectConversation,
  onDeleteConversation,
  onToggleSelection,
  enableVirtualization = true,
}: VirtualizedConversationListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Sort conversations by updated date
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const virtualizer = useVirtualizer({
    count: sortedConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  // If virtualization is disabled or we have few conversations, render normally
  if (!enableVirtualization || conversations.length < 30) {
    return (
      <div className="pb-2">
        {sortedConversations.map((conv, index) => (
          <ConversationListItem
            key={conv.id}
            conversation={conv}
            isSelected={
              selectedConversationId === conv.id ||
              (conv.id === 'placeholder-new-chat' && isNewChat && !selectedConversationId)
            }
            isSelectionMode={isSelectionMode}
            isChecked={selectedIds.has(conv.id)}
            onSelect={isSelectionMode ? onToggleSelection : onSelectConversation}
            onDelete={onDeleteConversation}
            staggerIndex={index}
          />
        ))}
      </div>
    );
  }

  // Virtualized list
  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto pb-2"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const conv = sortedConversations[virtualItem.index];
          if (!conv) return null;

          return (
            <div
              key={conv.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ConversationListItem
                conversation={conv}
                isSelected={
                  selectedConversationId === conv.id ||
                  (conv.id === 'placeholder-new-chat' && isNewChat && !selectedConversationId)
                }
                isSelectionMode={isSelectionMode}
                isChecked={selectedIds.has(conv.id)}
                onSelect={isSelectionMode ? onToggleSelection : onSelectConversation}
                onDelete={onDeleteConversation}
                staggerIndex={virtualItem.index}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
