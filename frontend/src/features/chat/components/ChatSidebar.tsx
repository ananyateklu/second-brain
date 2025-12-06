import { useState, useMemo, useRef, useEffect } from 'react';
import { ChatConversation } from '../types/chat';
import { VirtualizedConversationList } from './VirtualizedConversationList';

export interface ChatSidebarProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  isNewChat: boolean;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onBulkDeleteConversations?: (ids: string[]) => Promise<void>;
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
  onBulkDeleteConversations,
  onNewChat,
  onToggleSidebar,
}: ChatSidebarProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toggleAnimation, setToggleAnimation] = useState<'in' | 'out' | null>(null);
  const prevSelectionModeRef = useRef(isSelectionMode);

  // Track selection mode changes for animation - valid UI state sync
  useEffect(() => {
    if (prevSelectionModeRef.current !== isSelectionMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToggleAnimation(isSelectionMode ? 'in' : 'out');
      const timer = setTimeout(() => setToggleAnimation(null), 300);
      prevSelectionModeRef.current = isSelectionMode;
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isSelectionMode]);

  // Filter out placeholder conversations for selection
  const selectableConversations = useMemo(() => {
    return conversations.filter((conv) => conv.id !== 'placeholder-new-chat');
  }, [conversations]);

  const isAllSelected = selectedIds.size === selectableConversations.length && selectableConversations.length > 0;

  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableConversations.map((conv) => conv.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDeleteConversations || selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    await onBulkDeleteConversations(idsToDelete);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const getToggleAnimationClass = () => {
    if (toggleAnimation === 'in') return 'toggle-rotate-in';
    if (toggleAnimation === 'out') return 'toggle-rotate-out';
    return '';
  };

  return (
    <div
      className="flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-out w-72 md:w-[23rem]"
      style={{
        borderRightWidth: '0.5px',
        borderRightStyle: 'solid',
        borderRightColor: 'var(--border)',
      }}
    >
      {/* Sidebar Header - Fixed */}
      <div
        className="flex-shrink-0 px-4 py-4.5 border-b flex items-center justify-between"
        style={{
          borderColor: 'var(--border)',
        }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Conversations
        </h2>
        <div className="flex items-center gap-2">
          {/* Selection Mode Toggle */}
          {selectableConversations.length > 0 && (
            <button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`p-2 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${getToggleAnimationClass()}`}
              style={{
                backgroundColor: isSelectionMode
                  ? 'var(--btn-primary-bg)'
                  : 'color-mix(in srgb, var(--surface-card) 80%, transparent)',
                color: isSelectionMode ? 'var(--btn-primary-text)' : 'var(--text-primary)',
                border: isSelectionMode
                  ? '1px solid var(--btn-primary-border)'
                  : '1px solid var(--border)',
                boxShadow: isSelectionMode
                  ? '0 4px 12px -2px rgba(54, 105, 61, 0.3)'
                  : 'none',
              }}
              title={isSelectionMode ? 'Exit selection mode' : 'Select conversations'}
            >
              <svg className="w-5 h-5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isSelectionMode ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
            </button>
          )}
          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--surface-card) 80%, transparent)',
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
          {!isSelectionMode && (
            <button
              onClick={onNewChat}
              className="p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                border: '1px solid var(--btn-primary-border)',
                boxShadow: '0 4px 12px -2px rgba(54, 105, 61, 0.3)',
              }}
              title="New Chat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Selection Mode Actions Bar */}
      {isSelectionMode && (
        <div
          className="selection-action-bar flex-shrink-0 px-3 py-2 border-b flex items-center justify-center gap-2 backdrop-blur-md"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--glass-bg)',
            boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Select All button */}
          <button
            onClick={handleSelectAll}
            className="flex items-center justify-center gap-1.5 text-xs font-medium h-8 px-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              color: isAllSelected ? 'var(--btn-primary-text)' : 'var(--text-primary)',
              backgroundColor: isAllSelected
                ? 'var(--btn-primary-bg)'
                : 'color-mix(in srgb, var(--surface-elevated) 90%, transparent)',
              border: '1px solid var(--border)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isAllSelected ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              )}
            </svg>
          </button>

          {/* Selection count badge */}
          <span
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
              color: 'var(--color-brand-300)',
              border: '1px solid color-mix(in srgb, var(--color-brand-600) 30%, transparent)',
              minWidth: '80px',
            }}
          >
            {selectedIds.size} selected
          </span>

          {/* Delete button */}
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || !onBulkDeleteConversations}
            className={`delete-button-shake flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${selectedIds.size > 0 ? 'delete-button-pulse' : ''}`}
            style={{
              background: selectedIds.size > 0
                ? 'linear-gradient(135deg, rgb(239, 68, 68), rgb(185, 28, 28))'
                : 'color-mix(in srgb, var(--surface-elevated) 90%, transparent)',
              color: selectedIds.size > 0 ? 'white' : 'var(--text-tertiary)',
              boxShadow: selectedIds.size > 0 ? '0 4px 12px -2px rgba(239, 68, 68, 0.4)' : 'none',
              border: selectedIds.size > 0 ? 'none' : '1px solid var(--border)',
              opacity: selectedIds.size === 0 ? 0.6 : 1,
              cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete ({selectedIds.size})
          </button>

          {/* Cancel button */}
          <button
            onClick={handleExitSelectionMode}
            className="flex items-center justify-center h-8 px-3 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Conversations List - Scrollable with Virtual Scrolling */}
      <div className="flex-1 overflow-y-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-400)_transparent] [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--color-brand-400)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--color-brand-300)]">
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
            onToggleSelection={handleToggleSelection}
            enableVirtualization={conversations.length >= 30}
          />
        )}
      </div>
    </div>
  );
}

