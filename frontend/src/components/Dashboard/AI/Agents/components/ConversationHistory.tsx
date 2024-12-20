import React, { useState } from 'react';
import { History, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
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
    const filteredConversations = conversations
        .filter(conv => conv.model.id === selectedAgent?.id)
        .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    if (!selectedAgent || filteredConversations.length === 0) return null;

    const handleConversationSelect = (conv: AgentConversation) => {
        onSelect(conv);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] flex items-center gap-2"
            >
                <History className="w-5 h-5" />
                <span>History</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full right-0 mt-2 w-72 bg-[var(--color-surface)] rounded-lg shadow-lg border border-[var(--color-border)] p-2 z-10"
                    >
                        <div className="max-h-72 overflow-y-auto">
                            {filteredConversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    className="group relative flex items-center hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                                >
                                    <button
                                        onClick={() => handleConversationSelect(conv)}
                                        className="flex-1 p-2 text-left"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-[var(--color-text)] truncate">
                                                {conv.title ?? conv.messages[0]?.content.slice(0, 30) + '...'}
                                            </span>
                                            <span className="text-xs text-[var(--color-textSecondary)]">
                                                {format(conv.lastUpdated, 'MMM d, yyyy HH:mm')}
                                            </span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => onDelete(conv.id)}
                                        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-textSecondary)] hover:text-[var(--color-error)]"
                                        title="Delete conversation"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}; 