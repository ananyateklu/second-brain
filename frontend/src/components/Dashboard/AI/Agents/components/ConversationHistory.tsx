import { useState, useRef, useEffect } from 'react';
import { History, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIModel } from '../../../../../types/ai';
import { AgentConversation } from '../types';

interface ConversationHistoryProps {
    conversations: AgentConversation[];
    selectedAgent: AIModel | null;
    onSelect: (conversation: AgentConversation) => void;
    onDelete: (conversationId: string) => void;
}

export const ConversationHistory = ({
    conversations,
    selectedAgent,
    onSelect,
    onDelete
}: ConversationHistoryProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredConversations = conversations
        .filter(conv => conv.model && selectedAgent && conv.model.id === selectedAgent.id)
        .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    if (!selectedAgent || filteredConversations.length === 0) {
        return null;
    }

    const handleConversationSelect = (conv: AgentConversation) => {
        onSelect(conv);
        setIsOpen(false);
    };

    const handleHistoryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleHistoryClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-[var(--color-surface)]/50 backdrop-blur-sm text-[var(--color-textSecondary)] border border-[var(--color-border)] hover:bg-[var(--color-surfaceHover)] hover:border-[var(--color-textSecondary)] transition-colors"
            >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`
                            absolute top-full right-0 mt-2 w-72 rounded-lg 
                            shadow-[0_2px_8px_rgba(0,0,0,0.08)] 
                            border border-[var(--color-border)] 
                            p-2 backdrop-blur-xl
                            bg-[var(--conversationHistoryBackground)]
                        `}
                        style={{ zIndex: 100 }}
                    >
                        <div className="max-h-72 overflow-y-auto overflow-x-hidden px-1 -mx-1">
                            {filteredConversations.length === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-sm text-[var(--color-textSecondary)]">No conversations yet</p>
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        className="group relative flex items-center hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                                    >
                                        <button
                                            onClick={() => handleConversationSelect(conv)}
                                            className="flex-1 p-2 text-left"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="w-3.5 h-3.5 text-[var(--color-textSecondary)]" />
                                                    <span className="text-sm font-medium text-[var(--color-text)] truncate">
                                                        {conv.title ?? (conv.messages[0]?.content
                                                            ? conv.messages[0].content.slice(0, 30) + '...'
                                                            : 'New Chat')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                                                    <span>{conv.lastUpdated.toLocaleDateString(undefined, {
                                                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}</span>
                                                    <span>•</span>
                                                    <span>{conv.lastUpdated.toLocaleTimeString(undefined, {
                                                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                                        hour: 'numeric',
                                                        minute: '2-digit'
                                                    })}</span>
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => onDelete(conv.id)}
                                            className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-textSecondary)] hover:text-[var(--color-error)]"
                                            title="Delete conversation"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}; 