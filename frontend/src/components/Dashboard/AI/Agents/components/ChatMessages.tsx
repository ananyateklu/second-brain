import React from 'react';
import { AIModel } from '../../../../../types/ai';
import { AgentConversation } from '../types';
import { MessageBubble } from './MessageBubble';
import { TypingAnimation } from './TypingAnimation';
import { handleMessageReaction, handleMessageCopy } from '../utils/handlers';
import { useTheme } from '../../../../../contexts/themeContextUtils';

interface ChatMessagesProps {
    conversation: AgentConversation | null | undefined;
    isSending: boolean;
    selectedAgent: AIModel;
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

const getContainerBackground = (theme: string) => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
};

export const ChatMessages = ({
    conversation,
    isSending,
    selectedAgent,
    setConversations,
    messagesEndRef
}: ChatMessagesProps) => {
    const { theme } = useTheme();

    return (
        <div className={`
            flex-1 min-h-0 relative
            ${getContainerBackground(theme)}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300
        `}>
            <div className="absolute inset-0 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-[var(--color-border)] hover:scrollbar-thumb-[var(--color-textSecondary)] scrollbar-track-transparent">
                {conversation?.messages.map((message, index) => (
                    <div
                        key={message.id}
                        className={`
                            animate-in fade-in slide-in-from-bottom-2 duration-300
                            ${index === 0 ? 'pt-2' : ''}
                            ${index === conversation.messages.length - 1 ? 'pb-2' : ''}
                        `}
                    >
                        <MessageBubble
                            message={message}
                            onReact={() => handleMessageReaction(message, selectedAgent, setConversations)}
                            onCopy={() => handleMessageCopy(message.content)}
                            agentName={selectedAgent.name}
                            agentColor={selectedAgent.color}
                        />
                    </div>
                ))}
                {isSending && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-[var(--color-surface)]/50 backdrop-blur-sm rounded-lg shadow-sm">
                            <TypingAnimation />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-1" />
            </div>
        </div>
    );
}; 